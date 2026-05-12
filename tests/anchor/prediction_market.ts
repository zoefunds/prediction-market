import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { PredictionMarket } from "../../target/types/prediction_market";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  uploadCircuit,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
  getLookupTableAddress,
  x25519,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

// ─── Helpers ──────────────────────────────────────────────────────────────
function readKpJson(path: string): Keypair {
  const file = fs.readFileSync(path);
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(file.toString())));
}

async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries = 20,
  retryDelayMs = 500,
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const k = await getMXEPublicKey(provider, programId);
      if (k) return k;
    } catch (e) {
      // retry
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
  throw new Error(`Failed to fetch MXE public key after ${maxRetries} attempts`);
}

// 32-byte chunk extractor matching the on-chain `slice_32` helper.
function chunk(buf: Uint8Array, idx: number): Uint8Array {
  return buf.slice(idx * 32, (idx + 1) * 32);
}

// Pack N ciphertexts (each 32 bytes) into one Buffer.
// Accepts number[][] (RescueCipher output) or Uint8Array[].
function packCiphertexts(cts: Array<Uint8Array | number[]>): Buffer {
  return Buffer.concat(cts.map((c) => Buffer.from(c)));
}

// ─── Tests ────────────────────────────────────────────────────────────────
describe("PredictionMarket", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.PredictionMarket as Program<PredictionMarket>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const arciumProgram = getArciumProgram(provider);

  type Event = anchor.IdlEvents<(typeof program)["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E,
  ): Promise<Event[E]> => {
    let listenerId: number = 0;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (e) => res(e));
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const arciumEnv = getArciumEnv();
  const clusterAccount = getClusterAccAddress(arciumEnv.arciumClusterOffset);

  const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

  // Will be populated as the tests run.
  let mxePublicKey: Uint8Array;
  let userPrivKey: Uint8Array;
  let userPubKey: Uint8Array;
  let cipher: RescueCipher;

  let configPda: PublicKey;
  let marketPda: PublicKey;
  let vaultPda: PublicKey;
  let positionPda: PublicKey;

  // Initial market totals plaintext: yes_pool=0, no_pool=0, total_positions=0
  let initialTotalsCiphertext: Buffer;
  let initialTotalsNonce: Buffer;

  before("setup MXE keys + cipher", async () => {
    mxePublicKey = await getMXEPublicKeyWithRetry(provider, program.programId);
    userPrivKey = x25519.utils.randomSecretKey();
    userPubKey = x25519.getPublicKey(userPrivKey);
    const sharedSecret = x25519.getSharedSecret(userPrivKey, mxePublicKey);
    cipher = new RescueCipher(sharedSecret);

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId,
    );
  });

  it("initializes the global config", async () => {
    // Skip if already initialized (idempotent re-runs).
    const info = await provider.connection.getAccountInfo(configPda);
    if (info) {
      console.log("Config already exists, skipping init.");
      return;
    }

    const sig = await program.methods
      .initialize(100, owner.publicKey) // 1% fee, fee_recipient = owner
      .accounts({
        authority: owner.publicKey,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    console.log("Initialize tx:", sig);
    const cfg = await program.account.config.fetch(configPda);
    expect(cfg.feeBps).to.equal(100);
    expect(cfg.marketCount.toNumber()).to.equal(0);
  });

  it("initializes all three CompDefs and uploads circuits", async () => {
    await initCompDef(program, owner, "submit_position");
    await initCompDef(program, owner, "resolve_market");
    await initCompDef(program, owner, "claim_payout");
  });

  it("creates a market with encrypted-zero initial totals", async () => {
    // Encrypt initial MarketTotals { yes_pool: 0, no_pool: 0, total_positions: 0 } against MXE.
    // For initial creation we encrypt to MXE directly using our own keypair as sender.
    const totalsPlaintext: bigint[] = [BigInt(0), BigInt(0), BigInt(0)];
    const nonce = randomBytes(16);
    const encryptedTotals = cipher.encrypt(totalsPlaintext, nonce);
    initialTotalsCiphertext = packCiphertexts(encryptedTotals);
    initialTotalsNonce = nonce;

    const cfg = await program.account.config.fetch(configPda);
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), cfg.marketCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId,
    );

    const closeTs = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

    const sig = await program.methods
      .createMarket(
        "Will ETH hit $5k by Dec?",
        "Resolves YES if any major exchange shows a print >= $5000 USD before Dec 31 23:59 UTC.",
        "crypto",
        closeTs,
        owner.publicKey,
        Array.from(initialTotalsCiphertext),
        Array.from(userPubKey),
        new anchor.BN(deserializeLE(initialTotalsNonce).toString()),
      )
      .accounts({
        creator: owner.publicKey,
      })
      .signers([owner])
      .rpc({ commitment: "confirmed" });

    console.log("Market created:", sig);
    const market = await program.account.market.fetch(marketPda);
    expect(market.id.toNumber()).to.equal(cfg.marketCount.toNumber());
    expect(market.totalPositions).to.equal(0);
  });

  it("submits an encrypted position", async () => {
    // User wants to bet 0.1 SOL on YES (outcome=1).
    const outcome = BigInt(1);
    const amount = BigInt(100_000_000); // lamports
    const positionPlaintext = [outcome, amount];

    const positionNonce = randomBytes(16);
    const encryptedPosition = cipher.encrypt(positionPlaintext, positionNonce);
    const positionCiphertext = packCiphertexts(encryptedPosition);

    [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), marketPda.toBuffer(), owner.publicKey.toBuffer()],
      program.programId,
    );

    const computationOffset = new anchor.BN(randomBytes(8), "hex");

    const positionEventPromise = awaitEvent("positionSubmitted");

    const queueSig = await program.methods
      .submitPosition(
        computationOffset,
        Array.from(positionCiphertext),
        Array.from(userPubKey),
        new anchor.BN(deserializeLE(positionNonce).toString()),
        new anchor.BN(amount.toString()),
      )
      .accountsPartial({
        payer: owner.publicKey,
        market: marketPda,
        vault: vaultPda,
        position: positionPda,
        computationAccount: getComputationAccAddress(
          arciumEnv.arciumClusterOffset,
          computationOffset,
        ),
        clusterAccount,
        mxeAccount: getMXEAccAddress(program.programId),
        mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
        executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
        compDefAccount: getCompDefAccAddress(
          program.programId,
          Buffer.from(getCompDefAccOffset("submit_position")).readUInt32LE(),
        ),
      })
      .signers([owner])
      .rpc({ skipPreflight: true, commitment: "confirmed" });

    console.log("submit_position queue tx:", queueSig);

    const finalizeSig = await awaitComputationFinalization(
      provider,
      computationOffset,
      program.programId,
      "confirmed",
    );
    console.log("submit_position finalize tx:", finalizeSig);

    const event = await positionEventPromise;
    expect(event.market.toString()).to.equal(marketPda.toString());
    expect(event.user.toString()).to.equal(owner.publicKey.toString());

    // Verify Position got its encrypted ciphertext written by the callback.
    const position = await program.account.position.fetch(positionPda);
    expect(position.claimed).to.equal(false);
    expect(position.stakeAmount.toString()).to.equal(amount.toString());
    expect(Array.from(position.ciphertext).some((b) => b !== 0)).to.equal(true);
  });

  // Note: resolve_market test is gated on close_ts being in the past.
  // For local testing we'd warp the clock; on devnet we'd wait. Skipping for now.
  it.skip("resolves a market and reveals winner", async () => {
    // TODO: implement when local test infrastructure includes clock warping
  });

  it.skip("claims payout for the winning side", async () => {
    // TODO: depends on resolution
  });

  // ─── helpers below the describe block ──────────────────────────────────
  async function initCompDef(
    p: Program<PredictionMarket>,
    o: Keypair,
    circuitName: "submit_position" | "resolve_market" | "claim_payout",
  ): Promise<string> {
    const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");
    const offset = getCompDefAccOffset(circuitName);
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, p.programId.toBuffer(), offset],
      getArciumProgramId(),
    )[0];

    const mxeAccount = getMXEAccAddress(p.programId);
    const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
    const lutAddress = getLookupTableAddress(p.programId, mxeAcc.lutOffsetSlot);

    const methodFn =
      circuitName === "submit_position"
        ? p.methods.initSubmitPositionCompDef()
        : circuitName === "resolve_market"
          ? p.methods.initResolveMarketCompDef()
          : p.methods.initClaimPayoutCompDef();

    const sig = await methodFn
      .accounts({
        compDefAccount: compDefPDA,
        payer: o.publicKey,
        mxeAccount,
        addressLookupTable: lutAddress,
      })
      .signers([o])
      .rpc({ commitment: "confirmed" });

    console.log(`init ${circuitName} comp def:`, sig);

    const rawCircuit = fs.readFileSync(`build/${circuitName}.arcis`);
    await uploadCircuit(provider, circuitName, p.programId, rawCircuit, true, 500, {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    });

    return sig;
  }
});
