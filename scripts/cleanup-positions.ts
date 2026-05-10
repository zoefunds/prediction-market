import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  ConfirmOptions,
  Signer,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";
import { PredictionMarket } from "../target/types/prediction_market";

class RawProvider extends anchor.AnchorProvider {
  override async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOptions,
  ): Promise<string> {
    const conf = opts ?? this.opts;
    const isVersioned = tx instanceof VersionedTransaction;

    let raw: Buffer | Uint8Array;
    let blockhash: string;
    let lastValidBlockHeight: number;

    if (isVersioned) {
      if (signers?.length) (tx as VersionedTransaction).sign(signers);
      const signed = await this.wallet.signTransaction(tx);
      raw = signed.serialize();
      const bh = await this.connection.getLatestBlockhash("confirmed");
      blockhash = bh.blockhash;
      lastValidBlockHeight = bh.lastValidBlockHeight;
    } else {
      const legacy = tx as Transaction;
      const bh = await this.connection.getLatestBlockhash("confirmed");
      legacy.recentBlockhash = bh.blockhash;
      legacy.lastValidBlockHeight = bh.lastValidBlockHeight;
      legacy.feePayer = legacy.feePayer ?? this.wallet.publicKey;
      if (signers?.length) legacy.partialSign(...signers);
      const signed = await this.wallet.signTransaction(legacy);
      raw = signed.serialize();
      blockhash = legacy.recentBlockhash!;
      lastValidBlockHeight = legacy.lastValidBlockHeight!;
    }

    const sig = await this.connection.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
      maxRetries: 5,
    });
    await this.connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    return sig;
  }
}

async function main() {
  const RPC = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const owner = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf-8"),
      ),
    ),
  );
  const conn = new Connection(RPC, "confirmed");
  const wallet = new anchor.Wallet(owner);
  const provider = new RawProvider(conn, wallet, {
    commitment: "confirmed",
    skipPreflight: false,
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync("target/idl/prediction_market.json", "utf-8"),
  );
  const program = new Program<PredictionMarket>(idl, provider);

  console.log("Owner:", owner.publicKey.toBase58());
  console.log("RPC:", RPC);
  console.log(`Balance: ${(await conn.getBalance(owner.publicKey)) / 1e9} SOL\n`);

  // 1. Find all Position accounts owned by this wallet
  const positions = await conn.getProgramAccounts(program.programId, {
    filters: [{ memcmp: { offset: 40, bytes: owner.publicKey.toBase58() } }],
  });
  console.log(`Found ${positions.length} Position accounts for owner.\n`);

  if (positions.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  // Group positions by market
  const byMarket = new Map<string, { positionPda: PublicKey; market: PublicKey }[]>();
  for (const p of positions) {
    const marketPda = new PublicKey(p.account.data.slice(8, 40));
    const key = marketPda.toBase58();
    if (!byMarket.has(key)) byMarket.set(key, []);
    byMarket.get(key)!.push({ positionPda: p.pubkey, market: marketPda });
  }

  // 2. For each market, cancel it (if open) then withdraw
  for (const [marketKey, posList] of byMarket.entries()) {
    const marketPda = new PublicKey(marketKey);
    console.log(`\n──── Market ${marketKey} ────`);

    // Read market account to check status + creator
    let marketAccount;
    try {
      marketAccount = await program.account.market.fetch(marketPda);
    } catch (e) {
      console.log("  ✗ couldn't fetch market account, skipping");
      continue;
    }
    const status = Object.keys(marketAccount.status as object)[0];
    const isCreator = marketAccount.creator.equals(owner.publicKey);
    console.log(`  status: ${status}, creator: ${isCreator ? "YOU" : "other"}`);

    // Cancel if needed and possible
    if (status === "open") {
      if (isCreator) {
        try {
          const sig = await program.methods
            .cancelMarket()
            .accountsPartial({ creator: owner.publicKey, market: marketPda })
            .rpc({ commitment: "confirmed" });
          console.log(`  ✓ cancelled, tx: ${sig.slice(0, 12)}…`);
        } catch (e: any) {
          console.log(`  ✗ cancel failed: ${e.message?.split("\\n")[0]}`);
          continue;
        }
      } else {
        console.log("  ⚠ market is open but you're not the creator, can't cancel — skipping");
        continue;
      }
    } else if (status === "cancelled") {
      console.log("  already cancelled");
    } else {
      console.log(`  ⚠ status is ${status}, can't withdraw — skipping`);
      continue;
    }

    // Now withdraw each position on this market
    for (const { positionPda } of posList) {
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPda.toBuffer()],
        program.programId,
      );
      try {
        const sig = await program.methods
          .withdrawPosition()
          .accountsPartial({
            user: owner.publicKey,
            market: marketPda,
            vault: vaultPda,
            position: positionPda,
          })
          .rpc({ commitment: "confirmed" });
        console.log(`  ✓ withdrew ${positionPda.toBase58().slice(0, 12)}…  tx: ${sig.slice(0, 12)}…`);
      } catch (e: any) {
        console.log(`  ✗ withdraw failed: ${e.message?.split("\\n")[0]}`);
      }
    }
  }

  console.log(`\nFinal balance: ${(await conn.getBalance(owner.publicKey)) / 1e9} SOL`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
