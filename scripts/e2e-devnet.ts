import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  VersionedTransaction,
  ConfirmOptions,
  Signer,
} from "@solana/web3.js";
import {
  awaitComputationFinalization,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  RescueCipher,
  deserializeLE,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { randomBytes } from "crypto";

import { PredictionMarket } from "../target/types/prediction_market";

const CLUSTER_OFFSET = 456;

function readKp(p: string) {
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(p, "utf-8"))),
  );
}

class RawProvider extends anchor.AnchorProvider {
  override async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOptions,
  ): Promise<string> {
    const conf = opts ?? this.opts;
    let raw: Buffer | Uint8Array;
    let blockhash: string;
    let lastValidBlockHeight: number;

    if (tx instanceof VersionedTransaction) {
      if (signers?.length) tx.sign(signers);
      const signed = await this.wallet.signTransaction(tx);
      raw = signed.serialize();
      const bh = await this.connection.getLatestBlockhash(conf.commitment ?? "confirmed");
      blockhash = bh.blockhash;
      lastValidBlockHeight = bh.lastValidBlockHeight;
    } else {
      const legacy = tx as Transaction;
      if (!legacy.recentBlockhash) {
        const bh = await this.connection.getLatestBlockhash(conf.commitment ?? "confirmed");
        legacy.recentBlockhash = bh.blockhash;
        legacy.lastValidBlockHeight = bh.lastValidBlockHeight;
      }
      legacy.feePayer = legacy.feePayer ?? this.wallet.publicKey;
      if (signers?.length) legacy.partialSign(...signers);
      const signed = await this.wallet.signTransaction(legacy);
      raw = signed.serialize();
      blockhash = legacy.recentBlockhash!;
      lastValidBlockHeight = legacy.lastValidBlockHeight!;
    }

    const sig = await this.connection.sendRawTransaction(raw, {
      skipPreflight: conf.skipPreflight ?? true,
      preflightCommitment: conf.preflightCommitment ?? "confirmed",
      maxRetries: 5,
    });
    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      conf.commitment ?? "confirmed",
    );
    return sig;
  }
}

function chunk(buf: Uint8Array, idx: number): Uint8Array {
  return buf.slice(idx * 32, (idx + 1) * 32);
}

function packCiphertexts(cts: Array<Uint8Array | number[]>): Buffer {
  return Buffer.concat(cts.map((c) => Buffer.from(c)));
}

async function main() {
  const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const WALLET = process.env.WALLET ?? `${os.homedir()}/.config/solana/id.json`;
  const owner = readKp(WALLET);
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(owner);
  const provider = new RawProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync("target/idl/prediction_market.json", "utf-8"));
  const program = new Program<PredictionMarket>(idl, provider);

  console.log("Owner :", owner.publicKey.toBase58());
  console.log("RPC   :", RPC_URL);
  console.log("Bal   :", (await connection.getBalance(owner.publicKey)) / 1e9, "SOL");

  // ── 1. Init Config (idempotent) ──────────────────────────────────────────
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")], program.programId,
  );

  const cfgInfo = await connection.getAccountInfo(configPda);
  if (cfgInfo) {
    console.log("\n[1] Config already exists:", configPda.toBase58());
  } else {
    console.log("\n[1] Initializing Config...");
    const sig = await program.methods
      .initialize(100, owner.publicKey)
      .accounts({ authority: owner.publicKey })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
    console.log("    tx:", sig);
  }
  const cfg = await program.account.config.fetch(configPda);
  console.log("    market_count:", cfg.marketCount.toString());

  // ── 2. Encrypt a fresh "all-zero" MarketTotals against MXE ───────────────
  console.log("\n[2] Fetching MXE pubkey...");
  const mxePub = await getMXEPublicKey(provider, program.programId);
  if (!mxePub) throw new Error("MXE public key not yet finalized");
  const userPriv = x25519.utils.randomSecretKey();
  const userPub = x25519.getPublicKey(userPriv);
  const sharedSecret = x25519.getSharedSecret(userPriv, mxePub);
  const cipher = new RescueCipher(sharedSecret);

  const totalsNonce = randomBytes(16);
  const totalsCt = cipher.encrypt(
    [BigInt(0), BigInt(0), BigInt(0)],
    totalsNonce,
  );

  // ── 3. Create a market ───────────────────────────────────────────────────
  console.log("\n[3] Creating market...");
  const marketIdBuf = cfg.marketCount.toArrayLike(Buffer, "le", 8);
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBuf], program.programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPda.toBuffer()], program.programId,
  );

  const closeTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

  const createSig = await program.methods
    .createMarket(
      "Will BTC hit $100k by year-end?",
      "Resolves YES if any major exchange shows a print >= $100,000 USD before Dec 31 23:59 UTC.",
      "crypto",
      closeTs,
      owner.publicKey,
      Array.from(packCiphertexts(totalsCt)),
      Array.from(userPub),
      new anchor.BN(deserializeLE(totalsNonce).toString()),
    )
    .accounts({ creator: owner.publicKey })
    .signers([owner])
    .rpc({ commitment: "confirmed" });
  console.log("    tx:", createSig);
  console.log("    market PDA:", marketPda.toBase58());

  const market = await program.account.market.fetch(marketPda);
  console.log("    id:", market.id.toString(), "status:", market.status);

  // ── 4. Submit an encrypted position ──────────────────────────────────────
  console.log("\n[4] Submitting encrypted position (YES, 0.05 SOL)...");
  const outcome = BigInt(1);            // YES
  const amount = BigInt(50_000_000);    // 0.05 SOL
  const positionNonce = randomBytes(16);
  const positionCt = cipher.encrypt([outcome, amount], positionNonce);

  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPda.toBuffer(), owner.publicKey.toBuffer()],
    program.programId,
  );

  const computationOffset = new anchor.BN(randomBytes(8), undefined, "le");
  const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);

  // Set up event listener BEFORE sending the queue tx
  let positionEventResolve: (e: any) => void;
  const positionEventPromise = new Promise<any>((res) => (positionEventResolve = res));
  const lid = program.addEventListener("positionSubmitted", (e) =>
    positionEventResolve(e),
  );

  const submitSig = await program.methods
    .submitPosition(
      computationOffset,
      Array.from(packCiphertexts(positionCt)),
      Array.from(userPub),
      new anchor.BN(deserializeLE(positionNonce).toString()),
      new anchor.BN(amount.toString()),
    )
    .accountsPartial({
      payer: owner.publicKey,
      market: marketPda,
      vault: vaultPda,
      position: positionPda,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, computationOffset),
      clusterAccount,
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("submit_position_v2")).readUInt32LE(),
      ),
    })
    .signers([owner])
    .rpc({ skipPreflight: true, commitment: "confirmed" });
  console.log("    queue tx:", submitSig);

  console.log("    waiting for MPC computation to finalize...");
  const finalizeSig = await awaitComputationFinalization(
    provider, computationOffset, program.programId, "confirmed",
  );
  console.log("    finalize tx:", finalizeSig);

  // Strictly verify finalize tx result on-chain.
  const finTx = await connection.getTransaction(finalizeSig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!finTx) {
    throw new Error(`Finalize tx not found: ${finalizeSig}`);
  }
  if (finTx.meta?.err) {
    const logs = (finTx.meta.logMessages ?? []).join("\n");
    throw new Error(
      `Finalize failed for ${finalizeSig}: ${JSON.stringify(finTx.meta.err)}\n${logs}`,
    );
  }

  // Do not hang forever waiting for event.
  const event = await Promise.race([
    positionEventPromise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("Timed out waiting for PositionSubmitted event")), 120_000)),
  ]);
  await program.removeEventListener(lid);
  console.log("    PositionSubmitted event:", {
    market: event.market.toBase58(),
    user: event.user.toBase58(),
    stake_amount: event.stakeAmount.toString(),
    total_positions: event.totalPositions,
  });

  // ── 5. Verify Position has encrypted ciphertext written by callback ──────
  const position = await program.account.position.fetch(positionPda);
  const hasCiphertext = position.ciphertext.some((b: number) => b !== 0);
  console.log("\n[5] Position state:");
  console.log("    claimed:", position.claimed);
  console.log("    stake_amount:", position.stakeAmount.toString());
  console.log("    has encrypted ciphertext:", hasCiphertext);

  // ── 6. Verify Market totals were updated ─────────────────────────────────
  const marketAfter = await program.account.market.fetch(marketPda);
  console.log("\n[6] Market totals after submission:");
  console.log("    total_positions:", marketAfter.totalPositions);
  console.log("    totals_nonce:", marketAfter.totalsNonce.toString());

  // We can decrypt the totals as the MXE owner... actually no, only the MXE
  // can decrypt Mxe-owned ciphertexts. We just verify the ciphertext changed.
  const totalsChanged = !Buffer.from(market.totalsCiphertext).equals(
    Buffer.from(marketAfter.totalsCiphertext),
  );
  console.log("    totals ciphertext changed:", totalsChanged);
  if (!totalsChanged) {
    throw new Error("BUG: totals ciphertext did not change after finalize");
  }

  console.log("\n✓ E2E SMOKE TEST PASSED");
  console.log("  Bal :", (await connection.getBalance(owner.publicKey)) / 1e9, "SOL");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
