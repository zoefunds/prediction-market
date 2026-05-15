import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import os from "os";
import { randomBytes } from "crypto";

import {
  RescueCipher,
  awaitComputationFinalization,
  deserializeLE,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMempoolAccAddress,
  getMXEPublicKey,
  getMXEAccAddress,
  x25519,
} from "@arcium-hq/client";

import { getProgram, PROGRAM_ID } from "../app/src/lib/solana/program";

function readKp(path: string): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(path, "utf8"))));
}
function packCiphertexts(cts: Array<Uint8Array | number[]>): number[] {
  return Array.from(Buffer.concat(cts.map((c) => Buffer.from(c))));
}

(async () => {
  const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const MARKET_PUBKEY = process.env.MARKET_PUBKEY!;
  const clusterOffset = Number(process.env.ARCIUM_CLUSTER_OFFSET ?? "456");
  if (!MARKET_PUBKEY) throw new Error("Set MARKET_PUBKEY");

  const walletPath = process.env.ANCHOR_WALLET ?? `${os.homedir()}/.config/solana/id.json`;
  const owner = readKp(walletPath);
  console.log("WALLET", owner.publicKey.toBase58(), walletPath);
  const connection = new Connection(RPC, "confirmed");
  const wallet = {
    publicKey: owner.publicKey,
    signTransaction: async (tx: any) => { tx.partialSign(owner); return tx; },
    signAllTransactions: async (txs: any[]) => { txs.forEach((t) => t.partialSign(owner)); return txs; },
  } as any;

  const program = getProgram(connection, wallet);

  const market = new PublicKey(MARKET_PUBKEY);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), market.toBuffer()], PROGRAM_ID);
  const [position] = PublicKey.findProgramAddressSync([Buffer.from("position"), market.toBuffer(), owner.publicKey.toBuffer()], PROGRAM_ID);
  const [signPdaAccount] = PublicKey.findProgramAddressSync([Buffer.from("ArciumSignerAccount")], PROGRAM_ID);

  const mxeAccount = getMXEAccAddress(PROGRAM_ID);
  const mempoolAccount = getMempoolAccAddress(clusterOffset);
  const executingPool = getExecutingPoolAccAddress(clusterOffset);
  const clusterAccount = getClusterAccAddress(clusterOffset);
  const compDefAccount = getCompDefAccAddress(PROGRAM_ID, Buffer.from(getCompDefAccOffset("submit_position_v2")).readUInt32LE());

  const computationOffset = new BN(randomBytes(8), "le");
  const computationAccount = getComputationAccAddress(clusterOffset, computationOffset);

  const mxePub = await getMXEPublicKey(program.provider as any, PROGRAM_ID);
  if (!mxePub) throw new Error("No MXE pubkey");

  const userPriv = x25519.utils.randomSecretKey();
  const userPub = x25519.getPublicKey(userPriv);
  const shared = x25519.getSharedSecret(userPriv, mxePub);
  const cipher = new RescueCipher(shared);

  const amount = BigInt(50_000_000);
  const nonce = randomBytes(16);
  const encrypted = cipher.encrypt([BigInt(1), amount], nonce);
  const ciphertext = packCiphertexts(encrypted);
  const nonceBn = new BN(deserializeLE(nonce).toString());

  const builder = program.methods.submitPosition(
    computationOffset,
    ciphertext,
    Array.from(userPub),
    nonceBn,
    new BN(amount.toString()),
  ).accountsPartial({
    payer: owner.publicKey,
    market,
    vault,
    position,
    signPdaAccount,
    mxeAccount,
    mempoolAccount,
    executingPool,
    computationAccount,
    compDefAccount,
    clusterAccount,
  });

  try {
    await builder.simulate();
    console.log("SIM_OK");
  } catch (e: any) {
    console.log("SIM_ERR_START");
    try { console.log(JSON.stringify(e, null, 2)); } catch {}
    if (e?.logs) console.log(e.logs.join("\n"));
    if (e?.error?.logs) console.log(e.error.logs.join("\n"));
    console.log(e?.stack ?? e?.message ?? e);
    console.log("SIM_ERR_END");
    // continue to rpc for deeper diagnostics
  }

  const queueSig = await builder.rpc({ commitment: "confirmed", preflightCommitment: "confirmed", skipPreflight: true });
  console.log("QUEUE_SIG", queueSig);

  const finalSig = await awaitComputationFinalization(program.provider as any, computationOffset, PROGRAM_ID, "confirmed", 300_000);
  console.log("FINAL_SIG", finalSig);
})().catch((e: any) => {
  console.error(e?.stack ?? e?.message ?? e);
  if (e?.logs) console.error(e.logs);
  process.exit(1);
});
