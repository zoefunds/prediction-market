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
  | "submit_position"
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

  const idl = JSON.parse(fs.readFileSync("target/idl/prediction_market.json", "utf-8"));
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

  // Process only this list — change as needed for re-uploads.
  const circuits: CircuitName[] = ["submit_position"];

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
        name === "submit_position"
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

    // Map our v2 name back to the on-disk file name (Rust circuit was renamed).
    const fileName = name === "submit_position" ? "submit_position" : name;
    const circuitPath = `build/${fileName}.arcis`;
    if (!fs.existsSync(circuitPath)) {
      throw new Error(`Missing circuit: ${circuitPath}`);
    }
    const rawCircuit = fs.readFileSync(circuitPath);
    console.log(`  uploading circuit (${rawCircuit.byteLength} bytes)...`);
    await uploadCircuit(provider, name, program.programId, rawCircuit, true, 20, {
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
