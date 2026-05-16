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
const CLOSE_LEAD_SECS = 30;
const POST_CLOSE_BUFFER_SECS = 5;

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

function packCiphertexts(cts: Array<Uint8Array | number[]>): Buffer {
  return Buffer.concat(cts.map((c) => Buffer.from(c)));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // ── 1. Config + crypto setup ─────────────────────────────────────────────
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")], program.programId,
  );
  if (!(await connection.getAccountInfo(configPda))) {
    console.log("\n[1] Initializing Config...");
    await program.methods
      .initialize(100, owner.publicKey)
      .accounts({ authority: owner.publicKey })
      .signers([owner])
      .rpc({ commitment: "confirmed" });
  }
  const cfg = await program.account.config.fetch(configPda);
  console.log("[1] market_count:", cfg.marketCount.toString());

  const mxePub = await getMXEPublicKey(provider, program.programId);
  if (!mxePub) throw new Error("MXE public key not finalized");
  const userPriv = x25519.utils.randomSecretKey();
  const userPub = x25519.getPublicKey(userPriv);
  const shared = x25519.getSharedSecret(userPriv, mxePub);
  const cipher = new RescueCipher(shared);

  // ── 2. Create short-lived market ─────────────────────────────────────────
  const totalsNonce = randomBytes(16);
  const totalsCt = cipher.encrypt([0n, 0n, 0n], totalsNonce);
  const closeTs = new anchor.BN(Math.floor(Date.now() / 1000) + CLOSE_LEAD_SECS);

  const marketIdBuf = cfg.marketCount.toArrayLike(Buffer, "le", 8);
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBuf], program.programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketPda.toBuffer()], program.programId,
  );

  console.log("\n[2] Creating short-lived market (close in ~30s)...");
  await program.methods
    .createMarket(
      "E2E resolve+claim test",
      "Short-lived market for end-to-end MPC validation.",
      "test",
      closeTs,
      owner.publicKey,
      Array.from(packCiphertexts(totalsCt)),
      Array.from(userPub),
      new anchor.BN(deserializeLE(totalsNonce).toString()),
    )
    .accounts({ creator: owner.publicKey })
    .signers([owner])
    .rpc({ commitment: "confirmed" });
  console.log("    marketPda:", marketPda.toBase58());

  // ── 2b. MPC: convert initial Enc<Shared> totals -> Enc<Mxe> ──────────────
  console.log("\n[2b] Converting initial totals Enc<Shared> -> Enc<Mxe> via MPC...");
  const initOffset = new anchor.BN(randomBytes(8), undefined, "le");
  const initSig = await program.methods
    .initMarketTotals(initOffset)
    .accountsPartial({
      payer: owner.publicKey,
      market: marketPda,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, initOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("init_market_totals")).readUInt32LE(),
      ),
    })
    .signers([owner])
    .rpc({ skipPreflight: true, commitment: "confirmed" });
  console.log("    queue tx:", initSig);
  const initFinalize = await awaitComputationFinalization(
    provider, initOffset, program.programId, "confirmed",
  );
  console.log("    finalize tx:", initFinalize);

  // ── 3. Submit encrypted YES position (0.05 SOL) ──────────────────────────
  console.log("\n[3] Submitting encrypted YES position (0.05 SOL)...");
  const stakeAmount = BigInt(50_000_000);
  const positionNonce = randomBytes(16);
  const positionCt = cipher.encrypt([1n, stakeAmount], positionNonce);

  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketPda.toBuffer(), owner.publicKey.toBuffer()],
    program.programId,
  );
  const submitOffset = new anchor.BN(randomBytes(8), undefined, "le");

  const submitSig = await program.methods
    .submitPosition(
      submitOffset,
      Array.from(packCiphertexts(positionCt)),
      Array.from(userPub),
      new anchor.BN(deserializeLE(positionNonce).toString()),
      new anchor.BN(stakeAmount.toString()),
    )
    .accountsPartial({
      payer: owner.publicKey,
      market: marketPda,
      vault: vaultPda,
      position: positionPda,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, submitOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("submit_position_v3")).readUInt32LE(),
      ),
    })
    .signers([owner])
    .rpc({ skipPreflight: true, commitment: "confirmed" });
  console.log("    queue tx:", submitSig);
  const submitFinalize = await awaitComputationFinalization(
    provider, submitOffset, program.programId, "confirmed",
  );
  console.log("    finalize tx:", submitFinalize);

  // ── 4. Wait past close_ts ────────────────────────────────────────────────
  const waitMs = (CLOSE_LEAD_SECS + POST_CLOSE_BUFFER_SECS) * 1000 -
    (Date.now() - (closeTs.toNumber() - CLOSE_LEAD_SECS) * 1000);
  if (waitMs > 0) {
    console.log(`\n[4] Waiting ${Math.ceil(waitMs / 1000)}s past close_ts...`);
    await sleep(waitMs);
  }

  // ── 5. Resolve market: encrypted outcome = YES ───────────────────────────
  console.log("\n[5] Resolving market (winning outcome = YES)...");
  const outcomeNonce = randomBytes(16);
  const outcomeCt = cipher.encrypt([1n], outcomeNonce); // single u8
  const resolveOffset = new anchor.BN(randomBytes(8), undefined, "le");

  const resolveSig = await program.methods
    .requestResolution(
      resolveOffset,
      Array.from(outcomeCt[0]),
      Array.from(userPub),
      new anchor.BN(deserializeLE(outcomeNonce).toString()),
    )
    .accountsPartial({
      payer: owner.publicKey,
      resolver: owner.publicKey,
      market: marketPda,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, resolveOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("resolve_market_v2")).readUInt32LE(),
      ),
    })
    .signers([owner])
    .rpc({ skipPreflight: true, commitment: "confirmed" });
  console.log("    queue tx:", resolveSig);
  const resolveFinalize = await awaitComputationFinalization(
    provider, resolveOffset, program.programId, "confirmed",
  );
  console.log("    finalize tx:", resolveFinalize);

  const marketResolved = await program.account.market.fetch(marketPda);
  console.log("    status:", marketResolved.status);
  console.log("    winning_outcome:", marketResolved.winningOutcome);
  console.log("    yes_pool:", marketResolved.yesPool?.toString?.());
  console.log("    no_pool:", marketResolved.noPool?.toString?.());

  // ── 6. Claim payout ──────────────────────────────────────────────────────
  console.log("\n[6] Claiming payout...");
  const balBefore = await connection.getBalance(owner.publicKey);
  const vaultBefore = await connection.getBalance(vaultPda);
  const claimOffset = new anchor.BN(randomBytes(8), undefined, "le");

  const claimSig = await program.methods
    .claimPayout(claimOffset)
    .accountsPartial({
      payer: owner.publicKey,
      market: marketPda,
      vault: vaultPda,
      position: positionPda,
      computationAccount: getComputationAccAddress(CLUSTER_OFFSET, claimOffset),
      clusterAccount: getClusterAccAddress(CLUSTER_OFFSET),
      mxeAccount: getMXEAccAddress(program.programId),
      mempoolAccount: getMempoolAccAddress(CLUSTER_OFFSET),
      executingPool: getExecutingPoolAccAddress(CLUSTER_OFFSET),
      compDefAccount: getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("claim_payout_v2")).readUInt32LE(),
      ),
    })
    .signers([owner])
    .rpc({ skipPreflight: true, commitment: "confirmed" });
  console.log("    queue tx:", claimSig);
  const claimFinalize = await awaitComputationFinalization(
    provider, claimOffset, program.programId, "confirmed",
  );
  console.log("    finalize tx:", claimFinalize);

  const positionFinal = await program.account.position.fetch(positionPda);
  const balAfter = await connection.getBalance(owner.publicKey);
  const vaultAfter = await connection.getBalance(vaultPda);
  console.log("    position.claimed:", positionFinal.claimed);
  console.log("    user balance delta:", (balAfter - balBefore) / 1e9, "SOL");
  console.log("    vault balance delta:", (vaultAfter - vaultBefore) / 1e9, "SOL");

  if (!positionFinal.claimed) throw new Error("Position not marked claimed");
  console.log("\n✓ RESOLVE+CLAIM E2E PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
