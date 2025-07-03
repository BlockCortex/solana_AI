import { TokenInfoAndMetadata } from "../types";
import { checkTokenInfoAndHolders } from "./checkTokenInfoAndHolders";
import { findIfLpTokensBurnt } from "./findIfLpTokensBurnt";
import { SOLANA, connection } from "../config";
import { getAccountTransactions, getTokensMetadata } from "../requests";
import { getLiquidityData } from "./getLiquidityData";
import { FAUNA_API_KEY } from "../config";
import fs from "fs";

export const analyseToken = async (

	pool: any
): Promise<{ tokenInfoAndMetadata: TokenInfoAndMetadata; hasBurntLpTokens: boolean } | null> => {
	try {
		const { Client, query: q } = require("faunadb");
		const client = new Client({ domain: "db.us.fauna.com", secret: `${FAUNA_API_KEY}`, keepAlive: true });

		if (!pool) {
			throw new Error("No pool data found. Skipping...");
		}

		if (
			pool.quoteMint.toString() !== SOLANA.mint.toString() &&
			pool.baseMint.toString() !== SOLANA.mint.toString()
			
			
		) {
			console.log(
				`Token not paired with Solana. Quote: ${pool.quoteMint.toString()} Base: ${pool.baseMint.toString()}`
				
			);
			return null;
		}

		const tokenMetadata = await getTokensMetadata([pool.address]);

		if (!tokenMetadata) {
			throw new Error("Unable to get token metadata");
		}

		const tokenInfoAndMetadata = checkTokenInfoAndHolders(tokenMetadata[0], pool);

		if (!tokenInfoAndMetadata) {
			throw new Error("Unable to resolve token info due to error");
		}

		tokenInfoAndMetadata.pool = pool;
		// await client.query(
		// 	q.Create(
		// 		q.Collection('lp_v2'),
		// 		{ data: { tokenInfoAndMetadata:tokenInfoAndMetadata,
		// 			id: pool.id.toString(),
		// 			authority: pool.authority.toString(),
		// 			openOrders: pool.openOrders.toString(),
		// 			targetOrders: pool.targetOrders.toString(),
		// 			baseVault: pool.baseVault.toString(),
		// 			quoteVault: pool.quoteVault.toString(),
		// 			marketProgramId: pool.marketProgramId.toString(),
		// 			marketId: pool.marketId.toString(),
		// 			marketBids: pool.marketBids.toString(),
		// 			marketAsks:pool.marketAsks.toString(),
		// 			marketEventQueue: pool.marketEventQueue.toString(),
		// 			marketBaseVault: pool.marketBaseVault.toString(),
		// 			marketQuoteVault: pool.marketQuoteVault.toString(),
		// 			marketAuthority: pool.marketAuthority.toString(),
		// 			ownerQuoteAta: pool.ownerQuoteAta.toString(),
		// 			ownerBaseAta: pool.ownerBaseAta.toString(),
		// 			quoteMint: pool.quoteMint.toString(), 
		// 			baseMint: pool.baseMint.toString(), 
		// 			programId:pool.programId.toString(),
		// 			pool:pool.address.toString(),
		// 			symbol:pool.Symbol
		// 		}}
		// 	)
		// )

		const { _tokenInfo, holdersAndLiquidity: _holdersAndLiquidity } = await getLiquidityData(
			connection,
			tokenInfoAndMetadata
		);

		if (!_holdersAndLiquidity) {
			return null;
		}

		const { hasBurntLpTokens, holdersAndLiquidity } = await findIfLpTokensBurnt({
			...tokenInfoAndMetadata,
			holdersAndLiquidity: _holdersAndLiquidity
		});
		// console.log(_tokenInfo, holdersAndLiquidity);

		if (!holdersAndLiquidity.lpTokensAddress || !holdersAndLiquidity.supplyInLiquidityPercent) {
			const [tokenTxns, creatorTxns] = await Promise.all([
				getAccountTransactions(tokenInfoAndMetadata.tokenInfo.address, 100),
				getAccountTransactions(tokenInfoAndMetadata.metadata.creator, 100)
			]);
			let index = 0;

			for (const txn of tokenTxns) {
				fs.appendFileSync(
					`./src/logs/unableToFindCreatePool/creatorTxns-${tokenInfoAndMetadata.metadata.creator}.json`,
					JSON.stringify(txn) + "," + "\n"
				);

				index++;
				if (index === tokenTxns.length) {
					fs.appendFileSync(
						`./src/logs/unableToFindCreatePool/creatorTxns-${tokenInfoAndMetadata.metadata.creator}.json`,
						"\n"
					);
				}
			}

			for (const txn of creatorTxns) {
				fs.appendFileSync(
					`./src/logs/unableToFindCreatePool/creatorTxns-${tokenInfoAndMetadata.metadata.creator}.json`,
					JSON.stringify(txn) + "," + "\n"
				);
			}
		}

		return {
			tokenInfoAndMetadata: {
				...tokenInfoAndMetadata,
				tokenInfo: {
					...tokenInfoAndMetadata.tokenInfo,
					..._tokenInfo
				},
				holdersAndLiquidity: {
					...holdersAndLiquidity
					// ...holdersData
				}
			},
			hasBurntLpTokens
		};
	} catch (err) {
		console.error(err);
		return null;
	}
};
