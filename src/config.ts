import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
	ENDPOINT as _ENDPOINT,
	Currency,
	LOOKUP_TABLE_CACHE,
	MAINNET_PROGRAM_ID,
	RAYDIUM_MAINNET,
	Token,
	TOKEN_PROGRAM_ID,
	TxVersion
} from "@raydium-io/raydium-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import "dotenv/config";
import { TokenInfoAndMetadata, Environment } from "./types";

export const ENVIRONMENT = process.env.ENVIRONMENT! as Environment;
// export const TELEGRAM_BOT_API =
// 	ENVIRONMENT === "production" ? process.env.TELEGRAM_API_PROD : process.env.TELEGRAM_API_DEV;
// export const CHAT_DATA = {
// 	id: 1286301711,
// 	first_name: "RugsBunny | twitter.com/RugsBunnyCrypto",
// 	username: "RugsBunnyCrypto",
// 	chatId: 1286301711
// };
// export const GROUP_DATA =
// 	ENVIRONMENT === "production"
// 		? {
// 				id: -1002123041889,
// 				title: "Solana Gem Alerts",
// 				type: "supergroup"
// 		  }
// 		: CHAT_DATA;
const WALLET_PRIVATE_KEY =
	ENVIRONMENT === "production"
		? process.env.WALLET_PRIVATE_KEY!
		: process.env.WALLET_PRIVATE_KEY_DEV!;

export const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
export const FAUNA_API_KEY = process.env.FAUNA_API_KEY!;
export const CHAINSTACK_API_KEY = process.env.CHAINSTACK_API_KEY!;
export const QUICKNODE_API_KEY = process.env.QUICKNODE_API_KEY!;
const decodedPrivateKey = bs58.decode(WALLET_PRIVATE_KEY);
const walletSecretKey = new Uint8Array(
	decodedPrivateKey.buffer,
	decodedPrivateKey.byteOffset,
	decodedPrivateKey.byteLength / Uint8Array.BYTES_PER_ELEMENT
);
export const wallet = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));

// export const connection = new Connection('https://rpc.helius.xyz/?api-key=d0171689-e71a-4ac2-bb26-06c30813ba0', {
// 	commitment: "confirmed",
// 	wsEndpoint: 'wss://rpc.helius.xyz/?api-key=d0171689-e71a-4ac2-bb26-06c30813ba0',
// 	httpAgent: false
// });
// const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session
export const RPC_URL = process.env.HELIUS_PRIVATE_KEY!;
export const endpoint = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
// export const endpoint = "https://api.mainnet.solana.com"
export const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
	commitment: "confirmed",
	// wsEndpoint: 'wss://rpc.helius.xyz/?api-key=d0171689-e71a-4ac2-bb26-06c30813ba0',
	httpAgent: false,
	// httpHeaders: {"x-session-hash": SESSION_HASH}
});
export const quick_connection = new Connection(QUICKNODE_API_KEY, {
	// commitment: "confirmed",
	// wsEndpoint: 'wss://rpc.helius.xyz/?api-key=d0171689-e71a-4ac2-bb26-06c30813ba0',
	// httpAgent: false,
	// httpHeaders: {"x-session-hash": SESSION_HASH}
});
// const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9); // Random unique identifier for your session

// export const connection = new Connection(`https://solana-mainnet.core.chainstack.com/${CHAINSTACK_API_KEY}`, {
//     wsEndpoint: `wss://solana-mainnet.core.chainstack.com/ws/`,
//     // httpHeaders: {"x-session-hash": SESSION_HASH}
// });

export const DEFAULT_TOKEN = {
	SOL: new Currency(9, "USDC", "USDC"),
	WSOL: new Token(
		TOKEN_PROGRAM_ID,
		new PublicKey("So11111111111111111111111111111111111111112"),
		9,
		"WSOL",
		"WSOL"
	),
	USDC: new Token(
		TOKEN_PROGRAM_ID,
		new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
		6,
		"USDC",
		"USDC"
	),
	RAY: new Token(
		TOKEN_PROGRAM_ID,
		new PublicKey("4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"),
		6,
		"RAY",
		"RAY"
	),
	"RAY_USDC-LP": new Token(
		TOKEN_PROGRAM_ID,
		new PublicKey("FGYXP4vBkMEtKhxrmEBcWN8VNmXX8qNgEJpENKDETZ4Y"),
		6,
		"RAY-USDC",
		"RAY-USDC"
	),
	"MON_SOL-LP": new Token(
		TOKEN_PROGRAM_ID,
		new PublicKey("Bymq3yJhqnk5vahcqjsifiCMg6ckWEK1V5jEvSiiQ38j"),
		9,
		"MON-SOL",
		"MON-SOL"
	)
};

export const PROGRAMIDS = MAINNET_PROGRAM_ID;
export const ENDPOINT = _ENDPOINT;
export const RAYDIUM_MAINNET_API = RAYDIUM_MAINNET;
export const makeTxVersion = TxVersion.V0; // LEGACY
export const addLookupTableInfo = LOOKUP_TABLE_CACHE; // only mainnet. other = undefined
export const SIDE_TOKEN = "SOL";
export const SOLANA = DEFAULT_TOKEN.WSOL;
export const CHAIN = "solana";
export const DEAD_WALLET = ["11111111111111111111111111111111", ""];
export const BURN_ADDRESS = "burn68h9dS2tvZwtCFMt79SyaEgvqtcZZWJphizQxgt";
export const ERRORS = ["OFFCHAIN_URI_EMPTY", "EMPTY_ACCOUNT"];
export const OPEN_BOOK_PROGRAM = new PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX");
export const SERUM_PROGRAM_ID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
export const RAYDIUM_POOL_ADDRESS = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
export const RAYDIUM_ACCOUNT_ADDRESS = new PublicKey(
	"675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
export const SPL_TOKEN_ID = new PublicKey(
	"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const RAYDIUM_FEE_ADDRESS = new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5");

// Trade thresholds
export const SUPPLY_IN_LIQUIDITY_GOOD = 87.5;
export const SUPPLY_IN_LIQUIDITY_THRESHOLD = 80;
export const SUPPLY_IN_LIQUIDITY_MINIMUM = 68;
export const SOLANA_IN_LIQUIDITY_MINIMUM = 5;
export const SOLANA_IN_LIQUIDITY_THRESHOLD = 8;
export const SOLANA_IN_LIQUIDITY_OFFSET = 25; // minimum Solana needed to offset other check elements (high holders, low token % in liquidity, etc.)
export const LP_TOKEN_BURN_THRESHHOLD = 85;
export const MINIMUM_TIER_SCORE = 32;
export const MINIMUM_TRADE_SCORE = 60;

// Queues
export const AWAITING_LIQUIDITY_LOCK: TokenInfoAndMetadata[] = [];
export const AWAITING_ENTRY: TokenInfoAndMetadata[] = [];
