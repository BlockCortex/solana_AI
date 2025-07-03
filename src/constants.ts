import { PublicKey, Commitment } from "@solana/web3.js";
import dotenv from "dotenv";
import { FLASH_LOAN_MASTERY_PROGRAM_ID } from "flash-loan-mastery";
import { endpoint } from "./config";
dotenv.config();

export const RPC_ENDPOINT =
  process.env.RPC_URI || endpoint;
const FLM_PROGRAM_ID_STR = process.env.FLM_PROGRAM_ID;

export const FLM_PROGRAM_ID = FLM_PROGRAM_ID_STR
  ? new PublicKey(FLM_PROGRAM_ID_STR)
  : FLASH_LOAN_MASTERY_PROGRAM_ID;
export const USDC_MINT = new PublicKey(
  "FZK6Gfgv6oh6skc8FmLgFqwFBK7fLnqvBLSwbKA4Pi7f"
);
export const USDT_MINT = new PublicKey(
  "ARt4N4WY4PEdYUuBG7qENwuYSSiQUqP1RXFiahhwfzH9"
);
export const SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const DEFAULT_REFERRER = new PublicKey(
  "EdFRqDnhRgQrVHQhbJsxPhaL6VhCBj4qHckwrMjkYWzh"
);

export const confirmTransactionInitialTimeout =
  60 *
  1000; /** time to allow for the server to initially process a transaction (in milliseconds) */
export const providerOptions = {
  preflightCommitment: "confirmed" as Commitment,
  commitment: "confirmed" as Commitment,
};
export const MAX_INSTRUCTIONS = 30;
export const MAX_DIE_RETRIES = 5;
export const MAX_IX_RETRIES = 5;
export const CREATE_ALT_SLEEP_TIME = 2000;
export const SLEEP_TIME = 1000;
export const DEFAULT_SLIPPAGE_BPS = 2;
export const DIE_SLEEP_TIME = 2500;
export const MAX_ACCOUNTS_TO_FETCH = 99;
export const MAX_ACCOUNTS_TO_PROCESS = 10;
export const CACHE_PATH = process.env.FLM_CACHE_PATH || ".cache";
export const LOOKUP_TABLES_CACHE_NAME = "lookup_tables";
export const DEVNET = "devnet";
export const MAINNET = "mainnet";
