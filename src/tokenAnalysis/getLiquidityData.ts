import { Connection, PublicKey } from "@solana/web3.js";
import { getAccountTransactions } from "../requests";
import { TokenInfoAndMetadata } from "../types";
import colors from "colors";
import { RAYDIUM_ACCOUNT_ADDRESS, RAYDIUM_POOL_ADDRESS } from "src/config";

export const getLiquidityData = async (
	connection: Connection,
	tokenInfoAndMetadata: TokenInfoAndMetadata
) => {
	try {
		const { tokenInfo, holdersAndLiquidity } = tokenInfoAndMetadata;
		const tokenTxns = await getAccountTransactions(tokenInfo.address);
		// let poolCreationFound = false;
		// let initialSwaps = 0;

		if (tokenTxns === null || tokenTxns.length === 0) {
			console.log("No token transactions found", tokenInfo.symbol);
			return {
				hasBurntLpTokens: false,
				holdersAndLiquidity: holdersAndLiquidity,
				_tokenInfo: tokenInfo,
				isScam: false
			};
		}

		if (!tokenInfo.supply) {
			const supplyRes = await connection.getTokenSupply(new PublicKey(tokenInfo.address));

			if (supplyRes.value.uiAmount) {
				tokenInfo.supply = supplyRes.value.uiAmount;
			}
		}

		for (const txn of tokenTxns) {
			if ((!tokenInfo.supply && txn.type === "NFT_MINT") || txn.type === "TOKEN_MINT") {
				const { mint: tokenMint, tokenAmount: tokenSupply } = txn.tokenTransfers[0];

				if (tokenMint === tokenInfo.address) {
					tokenInfo.supply = tokenSupply;
				}
			}

			if (txn.type === "SWAP") {
				const tokenAmountBought = txn.tokenTransfers[1].tokenAmount;
				const percentageBought = (tokenAmountBought / tokenInfo.supply!) * 100;
				// console.log(
				// 	txn.signature,
				// 	percentageBought,
				// 	tokenInfoAndMetadata.tokenInfo.symbol,
				// 	txn.feePayer
				// );

				if (percentageBought > 15) {
					console.log(
						colors.bgMagenta(
							`WARNING - ${percentageBought}% of ${tokenInfo.symbol} purchased in ${txn.signature} by ${txn.feePayer}`
						)
					);

					return {
						holdersAndLiquidity: null,
						_tokenInfo: tokenInfo
					};
				}
			}
		}

		return {
			holdersAndLiquidity: holdersAndLiquidity,
			_tokenInfo: tokenInfo
		};
	} catch (err) {
		console.error("Error in 'getLiquidityData': ", tokenInfoAndMetadata.tokenInfo.symbol, err);

		return {
			holdersAndLiquidity: tokenInfoAndMetadata.holdersAndLiquidity,
			_tokenInfo: tokenInfoAndMetadata.tokenInfo
		};
	}
};
