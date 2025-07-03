import * as spl from "@solana/spl-token";
import { Market } from "@openbook-dex/openbook";
import { PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotent } from "@solana/spl-token";
import { findProgramAddress, SPL_MINT_LAYOUT } from "@raydium-io/raydium-sdk";
import { OPEN_BOOK_PROGRAM, RAYDIUM_ACCOUNT_ADDRESS, SOLANA, connection, wallet } from "./config";

export const derivePoolKeys = async (marketId: PublicKey) => {
	try {
		const marketInfo = await getMarketInfo(marketId);
		const marketDeco = await getDecodedData(marketInfo);

		const baseMint = marketDeco.baseMint;
		const baseMintData = await getMintData(baseMint);
		const baseDecimals = await getDecimals(baseMintData);
		console.log('Decimals', baseDecimals)
		const ownerBaseAta = await getOwnerAta(baseMint, wallet.publicKey); // change to createOwnerAta for live
		console.log('Owner Base ATA',ownerBaseAta)

		const quoteMint = marketDeco.quoteMint;
		const quoteMintData = await getMintData(quoteMint);
		const quoteDecimals = await getDecimals(quoteMintData);
		const ownerQuoteAta = await getOwnerAta(quoteMint, wallet.publicKey); // change to createOwnerAta for live

		const address =
			baseMint.toString() === SOLANA.mint.toString()
				? quoteMint.toString()
				: baseMint.toString();
		const marketAuthority = getVaultSigner(marketId, marketDeco);
		const authority = findProgramAddress(
			[Buffer.from([97, 109, 109, 32, 97, 117, 116, 104, 111, 114, 105, 116, 121])],
			RAYDIUM_ACCOUNT_ADDRESS
		)["publicKey"];

		const poolKeys = {
			version: 4,
			marketVersion: 3,
			programId: RAYDIUM_ACCOUNT_ADDRESS,
			baseMint: baseMint,
			quoteMint: quoteMint,
			ownerBaseAta: ownerBaseAta,
			ownerQuoteAta: ownerQuoteAta,
			baseDecimals: baseDecimals,
			quoteDecimals: quoteDecimals,
			lpDecimals: baseDecimals,
			authority: authority,
			marketAuthority: marketAuthority,
			marketProgramId: OPEN_BOOK_PROGRAM,
			marketId: marketId,
			marketBids: marketDeco.bids,
			marketAsks: marketDeco.asks,
			marketQuoteVault: marketDeco.quoteVault,
			marketBaseVault: marketDeco.baseVault,
			marketEventQueue: marketDeco.eventQueue,
			address,
			id: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("amm_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			baseVault: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("coin_vault_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			coinVault: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("pc_vault_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			lpMint: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("lp_mint_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			lpVault: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("temp_lp_token_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			targetOrders: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("target_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			withdrawQueue: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("withdraw_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			openOrders: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("open_order_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			quoteVault: findProgramAddress(
				[
					RAYDIUM_ACCOUNT_ADDRESS.toBuffer(),
					marketId.toBuffer(),
					Buffer.from("pc_vault_associated_seed", "utf-8")
				],
				RAYDIUM_ACCOUNT_ADDRESS
			)["publicKey"],
			lookupTableAccount: new PublicKey("11111111111111111111111111111111")
		};

		return poolKeys;
	} catch (err) {
		console.error(err);

		return null;
	}
};

async function getMarketInfo(marketId) {
	let marketInfo;
	while (true) {
		marketInfo = await connection.getAccountInfo(marketId);
		if (marketInfo) {
			break;
		}
	}
	return marketInfo;
}

async function getDecodedData(marketInfo) {
	return await Market.getLayout(OPEN_BOOK_PROGRAM).decode(marketInfo.data);
}

async function getMintData(mint) {
	return await connection.getAccountInfo(mint);
}

async function getDecimals(mintData) {
	return SPL_MINT_LAYOUT.decode(mintData.data).decimals;
}

async function createOwnerAta(mint, publicKey) {
	return await createAssociatedTokenAccountIdempotent(
		connection,
		wallet,
		mint,
		publicKey,
		{ skipPreflight: true },
		spl.TOKEN_PROGRAM_ID,
		spl.ASSOCIATED_TOKEN_PROGRAM_ID
	);
}

async function getOwnerAta(mint, publicKey) {
	const foundAta = PublicKey.findProgramAddressSync(
		[publicKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
		spl.ASSOCIATED_TOKEN_PROGRAM_ID
	)[0];
	return foundAta;
}

function getVaultSigner(marketId, marketDeco) {
	const seeds = [marketId.toBuffer()];
	const seedsWithNonce = seeds.concat(
		Buffer.from([Number(marketDeco.vaultSignerNonce.toString())]),
		Buffer.alloc(7)
	);
	return PublicKey.createProgramAddressSync(seedsWithNonce, OPEN_BOOK_PROGRAM);
}
