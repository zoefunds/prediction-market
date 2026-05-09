import { Connection } from "@solana/web3.js";

let conn: Connection | undefined;

export function getConnection(): Connection {
  if (!conn) {
    conn = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL!,
      "confirmed",
    );
  }
  return conn;
}

export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID!;
export const CLUSTER_OFFSET = Number(
  process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET ?? "456",
);
