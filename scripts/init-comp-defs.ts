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
  getArciumAccountBaseSeed,
  getArciumProgramId,
  getArciumProgram,
  getCompDefAccOffset,
  getMXEAccAddress,
  getLookupTableAddress,
  uploadCircuit,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";

import { PredictionMarket } from "../target/types/prediction_market";

type CircuitName =
  | "submit_position_v2"
  | "resolve_market"
  | "claim_payout";

function readKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(path, "utf-8"))),
  );
}

class RawProvider extends anchor.AnchorProvider {
  override async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOptions,
  ): Promise<string> {
    const conf = opts ?? this.opts;
    const isVersioned = tx instanceof VersionedTransaction;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        let raw: Buffer | Uint8Array;
        let blockhash: string;
        let lastValidBlockHeight: number;

        if (isVersioned) {
          // For versioned: re-fetch blockhash and reconstruct on retry
          const bh = await this.connection.getLatestBlockhash(
            conf.commitment ?? "confirmed",
          );
          if (attempt > 0) {
            (tx as VersionedTransaction).message.recentBlockhash = bh.blockhash;
          }
          if (signers?.length) (tx as VersionedTransaction).sign(signers);
          const signed = await this.wallet.signTransaction(tx);
          raw = signed.serialize();
          blockhash = bh.blockhash;
          lastValidBlockHeight = bh.lastValidBlockHeight;
        } else {
          const legacy = tx as Transaction;
          // Always fetch fresh blockhash to avoid expiration
          const bh = await this.connection.getLatestBlockhash(
            conf.commitment ?? "confirmed",
          );
          legacy.recentBlockhash = bh.blockhash;
          legacy.lastValidBlockHeight = bh.lastValidBlockHeight;
          legacy.feePayer = legacy.feePayer ?? this.wallet.publicKey;
          // Clear previous signatures on retry
          if (attempt > 0) {
            legacy.signatures = legacy.signatures.map((s) => ({
              ...s,
              signature: null,
            }));
          }
          if (signers?.length) legacy.partialSign(...signers);
          const signed = await this.wallet.signTransaction(legacy);
          raw = signed.serialize();
          blockhash = legacy.recentBlockhash!;
          lastValidBlockHeight = legacy.lastValidBlockHeight!;
        }

        const sig = await this.connection.sendRawTransaction(raw, {
          skipPreflight: true,
          preflightCommitment: conf.preflightCommitment ?? "confirmed",
          maxRetries: 5,
        });

        await this.connection.confirmTransaction(
          { signature: sig, blockhash, lastValidBlockHeight },
          conf.commitment ?? "confirmed",
        );
        return sig;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        const isExpired =
          msg.includes("block height exceeded") ||
          msg.includes("Blockhash not found") ||
          msg.includes("BlockhashNotFound");
        if (!isExpired || attempt === maxAttempts - 1) {
          throw e;
        }
        // Brief pause before retrying with fresh blockhash
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    throw new Error("unreachable");
  }
}

async function main() {
  const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const WALLET_PATH = process.env.WALLET ?? `${os.homedir()}/.config/solana/id.json`;
  const owner = readKeypair(WALLET_PATH);
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(owner);
  const provider = new RawProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: true,
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync("target/idl/prediction_market.json", "utf-8"),
  );
  const program = new Program<PredictionMarket>(idl, provider);
  const arciumProgram = getArciumProgram(provider);

  const mxeAccount = getMXEAccAddress(program.programId);
  const mxeAcc = await arciumProgram.account.mxeAccount.fetch(mxeAccount);
  const lutAddress = getLookupTableAddress(program.programId, mxeAcc.lutOffsetSlot);

  console.log("RPC:", RPC_URL);
  console.log("Program:", program.programId.toBase58());
  console.log("Owner:", owner.publicKey.toBase58());
  console.log("MXE PDA:", mxeAccount.toBase58());

  const baseSeed = getArciumAccountBaseSeed("ComputationDefinitionAccount");

  const circuits: CircuitName[] = ["submit_position_v2", "resolve_market", "claim_payout"];

  for (const name of circuits) {
    console.log(`\n──── ${name} ────`);
    const offset = getCompDefAccOffset(name);
    const compDefPDA = PublicKey.findProgramAddressSync(
      [baseSeed, program.programId.toBuffer(), offset],
      getArciumProgramId(),
    )[0];
    console.log(`CompDef PDA: ${compDefPDA.toBase58()}`);

    const existing = await connection.getAccountInfo(compDefPDA);
    if (existing) {
      console.log("  already initialized, skipping init.");
    } else {
      const methodFn =
        name === "submit_position_v2"
          ? program.methods.initSubmitPositionCompDef()
          : name === "resolve_market"
            ? program.methods.initResolveMarketCompDef()
            : program.methods.initClaimPayoutCompDef();

      const sig = await methodFn
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount,
          addressLookupTable: lutAddress,
        })
        .signers([owner])
        .rpc({ commitment: "confirmed" });
      console.log("  init tx:", sig);
    }

    const fileName = name === "submit_position_v2" ? "submit_position_v2" : name;
    const circuitPath = `build/${fileName}.arcis`;
    if (!fs.existsSync(circuitPath)) {
      throw new Error(`Missing circuit: ${circuitPath}`);
    }
    const rawCircuit = fs.readFileSync(circuitPath);
    console.log(`  uploading circuit (${rawCircuit.byteLength} bytes)...`);

    // Smaller chunks = each batch confirms faster, less likely to expire
    await uploadCircuit(provider, name, program.programId, rawCircuit, true, 10, {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    });
    console.log("  ✓ circuit uploaded");
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
