import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export const CONFIG_SEED = Buffer.from("config");
export const MARKET_SEED = Buffer.from("market");
export const POSITION_SEED = Buffer.from("position");
export const VAULT_SEED = Buffer.from("vault");

export function deriveConfigPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], programId)[0];
}

export function deriveMarketPda(programId: PublicKey, marketId: BN): PublicKey {
  const idLe = marketId.toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, idLe],
    programId,
  )[0];
}

export function deriveVaultPda(programId: PublicKey, marketPda: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [VAULT_SEED, marketPda.toBuffer()],
    programId,
  )[0];
}

export function derivePositionPda(
  programId: PublicKey,
  marketPda: PublicKey,
  user: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, marketPda.toBuffer(), user.toBuffer()],
    programId,
  )[0];
}
