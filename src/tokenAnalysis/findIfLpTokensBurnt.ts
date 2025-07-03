import { Connection, PublicKey } from "@solana/web3.js";
import { BURN_ADDRESS, LP_TOKEN_BURN_THRESHHOLD, RAYDIUM_POOL_ADDRESS, SOLANA } from "../config";
import { getAccountTransactions } from "../requests";
import { TokenInfoAndMetadata } from "../types";
import { wait } from "../utils/tools";
import colors from "colors";

export const findIfLpTokensBurnt = async (tokenInfoAndMetadata: any, retry: number = 0) => {
	try {
		const { tokenInfo, holdersAndLiquidity, metadata } = tokenInfoAndMetadata;
		const creatorTxns = await getAccountTransactions(metadata.creator);
		let poolCreationFound = false;
		let hasBurntLpTokens = false;

		if (creatorTxns === null || creatorTxns.length === 0) {
			console.log("No creator transactions found", tokenInfo.symbol);
			return {
				hasBurntLpTokens,
				holdersAndLiquidity: holdersAndLiquidity,
				_tokenInfo: tokenInfo,
				isScam: false
			};
		}

		// if (metadata.creator === "ApkuYf6ndjoq75jv3MjjABTFWMgBfQVdF4V6rZjGgxsq") {
		// 	console.log(creatorTxns);
		// }
		// if (tokenInfoAndMetadata.timeAddedToLpLockQueue === null) {
		// 	console.log(
		// 		"Finding pool creation for ",
		// 		tokenInfo.symbol,
		// 		tokenInfo.address,
		// 		metadata.creator
		// 	);
		// }

		for (const txn of creatorTxns) {
			// const hasBurntLpTokensViaDeadWalletTxn =
			// 	txn.type === "TRANSFER" &&
			// 	txn.tokenTransfers.length > 0 &&
			// 	txn.tokenTransfers[0].toUserAccount === BURN_ADDRESS;
			// const hasBurntLpViaBurnTxn = txn.type === "BURN";
			// const hasBurntLpTokens = hasBurntLpTokensViaDeadWalletTxn || hasBurntLpViaBurnTxn;

			if (
				txn.type === "CREATE_POOL" &&
				!poolCreationFound &&
				!tokenInfoAndMetadata.timeAddedToLpLockQueue
			) {
				// console.log(txn);
				let isTokensLpBurn = false;
				for (const transfer of txn.tokenTransfers) {
					// console.log(transfer);
					if (transfer.mint === tokenInfo.address) {
						const { mint: lpBaseTokenAddress, tokenAmount: lpBaseTokenAmount } =
							transfer;
						isTokensLpBurn = true;

						if (lpBaseTokenAddress === tokenInfo.address) {
							holdersAndLiquidity.supplyInLiquidityAmount = lpBaseTokenAmount;
							holdersAndLiquidity.supplyInLiquidityPercent =
								(lpBaseTokenAmount / tokenInfo.supply!) * 100;
						}
					} else if (transfer.mint === SOLANA.mint.toString() && isTokensLpBurn) {
						const { tokenAmount } = transfer;

						holdersAndLiquidity.solValue = tokenAmount;
					} else if (isTokensLpBurn) {
						const { mint: lpTokensAddress, tokenAmount: lpTokensAmount } = transfer;
						holdersAndLiquidity.lpTokensAddress = lpTokensAddress;
						holdersAndLiquidity.lpTokensAmount = lpTokensAmount;
					}
				}

				// if (!transferMintBase) {
				// 	holdersAndLiquidity.lpTokensAmount = 0;
				// 	holdersAndLiquidity.supplyInLiquidityAmount = 0;
				// 	holdersAndLiquidity.solValue = 0;
				// 	continue;
				// }

				if (
					holdersAndLiquidity.lpTokensAmount > 0 &&
					holdersAndLiquidity.supplyInLiquidityAmount > 0 &&
					holdersAndLiquidity.solValue > 0
				) {
					// console.log("POOL CREATION FOUND VIA CREATE_POOL:", holdersAndLiquidity);
					poolCreationFound = true;
				}
			}

			if (txn.type === "BURN" && !hasBurntLpTokens) {
				if (txn.tokenTransfers.length === 0) {
					continue;
				}
				// console.log(txn);
				const descriptionArr = txn.description.split(" ");
				const burntLpTokensAmount = Number(
					descriptionArr[descriptionArr.indexOf("burned") + 1]
				);

				const { mint: burntLpTokensAddress } = txn.tokenTransfers[0];
				const burntLpIsForToken =
					burntLpTokensAddress === holdersAndLiquidity.lpTokensAddress;
				// console.log(
				// 	burntLpTokensAmount,
				// 	holdersAndLiquidity.lpTokensAddress,
				// 	burntLpTokensAddress,
				// 	holdersAndLiquidity.lpTokensAmount
				// );

				if (burntLpIsForToken) {
					const lpBurntPercent = Math.round(
						(burntLpTokensAmount / holdersAndLiquidity.lpTokensAmount!) * 100
					);

					// console.log(lpBurntPercent);

					if (lpBurntPercent >= LP_TOKEN_BURN_THRESHHOLD) {
						holdersAndLiquidity.liquidityLockedPercent = lpBurntPercent;
						hasBurntLpTokens = true;
						// return {
						// 	hasBurntLpTokens: true,
						// 	holdersAndLiquidity,
						// 	_tokenInfo: tokenInfo,
						// 	isScam: false
						// };
					}
				}
			}

			if (txn.type === "TRANSFER") {
				// if (txn.tokenTransfers.length !== 1) continue;
				for (const tokenTransfer of txn.tokenTransfers) {
					const { mint, tokenAmount, toUserAccount, fromUserAccount } = tokenTransfer;

					if (mint === tokenInfo.address && tokenAmount >= tokenInfo.supply! * 0.6) {
						if (
							toUserAccount !== RAYDIUM_POOL_ADDRESS &&
							fromUserAccount === metadata.creator
						) {
							console.log(
								colors.bgMagenta("TOKENS SENT TO DIFFERENT ACCOUNT"),
								tokenInfoAndMetadata.tokenInfo.symbol,
								toUserAccount,
								colors.bgMagenta("FROM"),
								metadata.creator
							);
							metadata.creator = toUserAccount;
							// console.log(metadata);

							return findIfLpTokensBurnt({
								...tokenInfoAndMetadata,
								metadata
							});
						}
					} else if (
						toUserAccount === BURN_ADDRESS &&
						tokenTransfer.length > 0 &&
						!hasBurntLpTokens
					) {
						const { mint: burntLpTokensAddress, tokenAmount: burntLpTokensAmount } =
							tokenTransfer;
						const burntLpIsForToken =
							burntLpTokensAddress === holdersAndLiquidity.lpTokensAddress;

						if (burntLpIsForToken) {
							const lpBurntPercent = Math.round(
								(burntLpTokensAmount / holdersAndLiquidity.lpTokensAmount!) * 100
							);
							holdersAndLiquidity.liquidityLockedPercent = lpBurntPercent;

							console.log(lpBurntPercent);

							if (lpBurntPercent >= LP_TOKEN_BURN_THRESHHOLD) {
								hasBurntLpTokens = true;
								// return {
								// 	hasBurntLpTokens: true,
								// 	holdersAndLiquidity,
								// 	_tokenInfo: tokenInfo,
								// 	isScam: false
								// };
							}
						}
					}
				}
			}

			// console.log(txn);
			if (
				txn.type === "SWAP" &&
				!poolCreationFound &&
				!tokenInfoAndMetadata.timeAddedToLpLockQueue
			) {
				// Investigate deployment + swap in one - sign of a good token
				let isPoolCreation = false;
				for (const tokenTransfer of txn.tokenTransfers) {
					if (tokenTransfer.toUserAccount === RAYDIUM_POOL_ADDRESS) {
						// console.log(tokenTransfer, isPoolCreation);
						if (
							tokenTransfer.mint === tokenInfo.address &&
							tokenTransfer.tokenAmount >= tokenInfo.supply! * 0.6
						) {
							holdersAndLiquidity.supplyInLiquidityAmount = tokenTransfer.tokenAmount;
							holdersAndLiquidity.supplyInLiquidityPercent =
								(tokenTransfer.tokenAmount / tokenInfo.supply!) * 100;

							isPoolCreation = true;
							console.log(
								colors.bgGreen(
									`POOL CREATION FOUND VIA MULTI TRANSFER: ${tokenInfo.symbol} @ ${tokenTransfer.tokenAmount} - ${txn.signature}`
								)
							);
						}

						// console.log(
						// 	tokenTransfer,
						// 	isPoolCreation,
						// 	tokenTransfer.mint,
						// 	SOLANA.mint.toString(),
						// 	tokenTransfer.fromUserAccount,
						// 	metadata.creator
						// );
						if (
							tokenTransfer.mint === SOLANA.mint.toString() &&
							tokenTransfer.fromUserAccount === metadata.creator &&
							isPoolCreation
						) {
							holdersAndLiquidity.solValue = tokenTransfer.tokenAmount;
							isPoolCreation = false;
						}
					} else {
						if (
							tokenTransfer.fromUserAccount === "" &&
							tokenTransfer.toUserAccount === metadata.creator
						) {
							holdersAndLiquidity.lpTokensAmount = tokenTransfer.tokenAmount;
							holdersAndLiquidity.lpTokensAddress = tokenTransfer.mint;
						}
					}
				}

				if (
					holdersAndLiquidity.lpTokensAmount > 0 &&
					holdersAndLiquidity.supplyInLiquidityAmount > 0 &&
					holdersAndLiquidity.solValue > 0
				) {
					console.log(
						colors.bgGreen("POOL CREATION FOUND VIA MANUAL DEPLOYMENT:"),
						holdersAndLiquidity
					);
					poolCreationFound = true;
					tokenInfo.isMultiSwapDeployment = true;
				}
			}

			if (txn.type === "WITHDRAW_LIQUIDITY") {
				// console.log("REMOVE LIQUIDITY FOUND:", txn);
			}

			// console.log(txn);
		}

		if (!poolCreationFound && !tokenInfoAndMetadata.timeAddedToLpLockQueue) {
			if (retry < 20) {
				await wait(3000);

				return findIfLpTokensBurnt(tokenInfoAndMetadata, retry + 1);
			}
			console.log("Could not find pool creation:", tokenInfo.symbol, tokenInfo.address);
		}

		return {
			hasBurntLpTokens,
			holdersAndLiquidity: holdersAndLiquidity,
			_tokenInfo: tokenInfo
		};
	} catch (err) {
		console.error(
			"Error in 'findIfLpTokensBurnt': ",
			tokenInfoAndMetadata.tokenInfo.symbol,
			err
		);

		return {
			hasBurntLpTokens: false,
			holdersAndLiquidity: tokenInfoAndMetadata.holdersAndLiquidity,
			_tokenInfo: tokenInfoAndMetadata.tokenInfo
		};
	}
};
