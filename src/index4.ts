import { PublicKey, Transaction } from "@solana/web3.js";
import {
	AWAITING_ENTRY,
	AWAITING_LIQUIDITY_LOCK,
	connection,
	ENVIRONMENT,
	RAYDIUM_FEE_ADDRESS,
	wallet
} from "./config";
import * as BL from "@solana/buffer-layout";
import { analyseToken } from "./tokenAnalysis/analyseToken";
import { identifyTokenTier } from "./tokenAnalysis/identifyTokenTier";
import { wait } from "./utils/tools";
import { TokenInfoAndMetadata } from "./types";
import { derivePoolKeys } from "./derivePoolKeys";
import { monitorLiquidityLockStatus } from "./monitors/monitorLiquidityLockStatus";
import { monitorForBuyEntry } from "./monitors/monitorForBuyEntry";
import { monitorTokenPrice } from "./monitors/monitorTokenPrice";
import colors from "colors";
import { findIfLpTokensBurnt } from "./tokenAnalysis/findIfLpTokensBurnt";
import { FAUNA_API_KEY } from "./config";
import { query as q, Client } from 'faunadb';
import { swapTx } from "./swapTx";

// import React, { useState, useEffect } from 'react';
const api_key = FAUNA_API_KEY
const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });
interface PredictionData {
	// pair_address: string;
	mintA: string;
	// score: string;
	// liquidity_prediction: string;
	// rating: string;
	// side: string;
	// price:string;
	// price_prediction:string;

}
// async function readPredictionData() {
// 	try {
// 		// Query FaunaDB for prediction data
// 		const predictionData: { data: PredictionData[] } = await client.query(
// 			q.Map(
// 				q.Paginate(q.Match(q.Index('predictions_by_id'))),
// 				q.Lambda('prediction', q.Get(q.Var('prediction')))
// 			)
// 		);

// 		// Access and process predictionData as needed
// 		predictionData.data.forEach((doc: any) => {
// 			const pairAddress = doc.data.pair_address;
// 			const mintA = doc.data.mintA;
// 			const score = doc.data.score;
// 			const liquidityPrediction = doc.data.liquidity_prediction;
// 			const rating = doc.data.rating;
// 			const side = doc.data.side;
// 			const price = doc.data.price;
// 			const price_prediction = doc.data.price_prediction;

// 			// Process the data as needed
// 			console.log(`mintA: ${mintA},Pair Address: ${pairAddress}, Score: ${score}, Liquidity Prediction: ${liquidityPrediction}, Rating: ${rating}, Side:${side}, Price: ${price}, Predicted Price: ${price_prediction}`);
// 			executeSwap(mintA,2,false,price,price_prediction)
// 		});
// 	} catch (error) {
// 		console.error('Error reading prediction data from FaunaDB:', error);
// 	}
// }
async function readPredictionData() {
	try {
		// Query FaunaDB for prediction data
		const predictionData: { data: PredictionData[] } = await client.query(
			q.Map(
				q.Paginate(q.Match(q.Index('lp_by_id'))),
				q.Lambda('lp', q.Get(q.Var('lp')))
			)
		);

		// Access and process predictionData as needed
		predictionData.data.forEach((doc: any) => {
			const pairAddress = doc.data.pair_address;
			const mintA = doc.data.mintA;
			const score = doc.data.score;
			const liquidityPrediction = doc.data.liquidity_prediction;
			const rating = doc.data.rating;
			const side = doc.data.side;
			const price = doc.data.price;
			const price_prediction = doc.data.price_prediction;

			// Process the data as needed
			console.log(`mintA: ${mintA},Pair Address: ${pairAddress}, Score: ${score}, Liquidity Prediction: ${liquidityPrediction}, Rating: ${rating}, Side:${side}, Price: ${price}, Predicted Price: ${price_prediction}`);
			// executeSwap(mintA,2,false,price,price_prediction);
			// console.log(executeSwap);
			return predictionData.data;
		});
	} catch (error) {
		console.error('Error reading prediction data from FaunaDB:', error);
	}
}
// Call the function to read prediction data
// readPredictionData();
async function readPredictionDataForever() {
    try {
        // Wrap the function inside a loop
        setInterval(async () => {
            try {
                await readPredictionData(); // Call the function to read prediction data
            } catch (error) {
                console.error('Error occurred while reading prediction data:', error);
            }
        }, 600); // Repeat every 1 minute (adjust as needed)
    } catch (error) {
        console.error('Error setting up continuous prediction data reading:', error);
    }
}

// Call the function to read prediction data forever

// readPredictionDataForever();

const MAX_ACTIVE_SWAPS = 4;
let currentActiveSwaps = 0;
let maxSwaps = 0;

const ammLoop = async (): Promise<void> => {
	const seenSignatures: string[] = [];

	// const pair = `${pairAddress}`
	// const test = await findIfLpTokensBurnt({
	// 	tokenInfo: {
	// 		address: "EArkn8uVf8YLfpF2eCdkCvDaPYpQuJzKXxaCnyxXc2P7",
	// 		symbol: "cat",
	// 		name: "cat",
	// 		supply: 1000000000,
	// 		baseMint: "EArkn8uVf8YLfpF2eCdkCvDaPYpQuJzKXxaCnyxXc2P7",
	// 		quoteMint: "So11111111111111111111111111111111111111112",
	// 		decimals: 6,
	// 		owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
	// 	},
	// 	holdersAndLiquidity: {
	// 		lpTokensAmount: 0,
	// 		supplyInLiquidityAmount: 0,
	// 		supplyInLiquidityPercent: 0,
	// 		liquidityLockedPercent: 0,
	// 		lpTokensAddress: "",
	// 		solValue: 0
	// 	},
	// 	metadata: {
	// 		creator: "2N8A1ary6J5HwiMJ8rkdFDa6eYy9mnGjS8by5qoZNpsM",
	// 		isMintable: false,
	// 		isFrozen: false,
	// 		isFungible: true,
	// 		isMutable: false
	// 	}
	// });

	// 	{	tokenInfo: {
	// 		address: "51ZUWVNGNt7u2nd3HPyBPJuKmatmGD7QvfP3G2t9fxCJ",
	// 		symbol: "PEPE V",
	// 		name: "PEPE V",
	// 		supply: 1000000000,
	// 		baseMint: "51ZUWVNGNt7u2nd3HPyBPJuKmatmGD7QvfP3G2t9fxCJ",
	// 		quoteMint: "So11111111111111111111111111111111111111112",
	// 		decimals: 9,
	// 		owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
	// 	},
	// 	holdersAndLiquidity: {
	// 		lpTokensAmount: 0,
	// 		supplyInLiquidityAmount: 0,
	// 		supplyInLiquidityPercent: 0,
	// 		lpTokensAddress: "",
	// 		solValue: 0
	// 	},
	// 	metadata: {
	// 		creator: "7dY7Ex6FsNntUTxATdDVhMK1ThP3QtLdqwLZZjz8tMpC",
	// 		isMintable: false,
	// 		isFrozen: false,
	// 		isFungible: true,
	// 		isMutable: false
	// 	}
	// }

	// {
	// 	tokenInfo: {
	// 		address: "HXkbUADfocGyz2WrzJpjEfry8qyNDm5Kwiiq3Mz3tTi1",
	// 		symbol: "RETIRE",
	// 		name: "RETIRE",
	// 		supply: 10000000000,
	// 		baseMint: "HXkbUADfocGyz2WrzJpjEfry8qyNDm5Kwiiq3Mz3tTi1",
	// 		quoteMint: "So11111111111111111111111111111111111111112",
	// 		decimals: 6,
	// 		owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
	// 	},
	// 	holdersAndLiquidity: {
	// 		lpTokensAmount: 0,
	// 		supplyInLiquidityAmount: 0,
	// 		supplyInLiquidityPercent: 0,
	// 		lpTokensAddress: "",
	// 		solValue: 0
	// 	},
	// 	metadata: {
	// 		creator: "7ocTdh5JgvrBVobbSKq2DywJi1ASz6KvaSeZyDGbYhxX",
	// 		isMintable: false,
	// 		isFrozen: false,
	// 		isFungible: true,
	// 		isMutable: false
	// 	}
	// }
	// console.log(test);
	// return;
	// const { Client, query: q } = require("faunadb");
	// const client = new Client({ domain: "db.us.fauna.com", secret: `${FAUNA_API_KEY}`, keepAlive: true });

	if (ENVIRONMENT === "production") {
		console.log(colors.cyan("Starting trading bot in PRODUCTION mode"));
	} else if (ENVIRONMENT === "development") {
		console.log(colors.yellow("Starting trading bot in DEVELOPMENT mode"));
	} else {
		console.error(colors.red(`\nINVALID ENVIRONMENT: ${ENVIRONMENT} - EXITING\n`));
		process.exit(1);
	}

	connection.onLogs(RAYDIUM_FEE_ADDRESS, async (logs) => {
		if (logs.err) {
			return;
		}

		if (seenSignatures.includes(logs.signature)) {
			return;
		}
		seenSignatures.push(logs.signature);

		// if (maxSwaps > 25) {
		// 	process.exit(0);
		// }

		for (const log of logs["logs"]) {
			if (log.includes("ray_log")) {
				const rayLogSplit = log.split(" ");
				const rayLog = rayLogSplit[rayLogSplit.length - 1].replace("'", "");
				const logData = Buffer.from(rayLog, "base64");
				console.log(logData)

				if (logData.length === 75) {
					const market = new PublicKey(logData.subarray(43, 75));
					// console.log(market.toString())
					// await client.query(
					// 	q.Create(
					// 		q.Collection('lp_locks'),
					// 		{ data: { mintA: market.toString()}}
					// 	)
					// );
					const now = Date.now();
					const openTimeMs =
						new BL.NearUInt64().decode(new Uint8Array(logData.subarray(1, 9))) * 1000;
					const tradingOpensMs = openTimeMs - now;
					const pool = await derivePoolKeys(market);

					if (!pool) {
						return;
					}

					if (tradingOpensMs > 0) {
						console.log(
							`\n(${pool.address}) Trading opens in ${(
								tradingOpensMs /
								1000 /
								60
							).toFixed(2)} minutes. Sleeping for ${tradingOpensMs}ms`
						);

						await wait(tradingOpensMs);
						// await wait(tradingOpensMs - 10000);

						//POST newly liquid pool to faunaDB to gather data for Linear Regression
						// await client.query(
						// 	q.Create(
						// 		q.Collection('deployed'),
						// 		{ data: { tokenA: pool.address, mintA: market.toString() } }
						// 	)
						// );
						// await client.query(
						// 	q.Create(
						// 		q.Collection('deployed'),
						// 		{ data: { tokenA: pool.address, mintA: market.toString() } }
						// 	)
						// );
	
						// await client.query(
						// 			q.Create(
						// 				q.Collection('lp_v2'),
						// 				{ data: { 
						// 					// tokenInfoAndMetadata:tokenInfoAndMetadata,
						// 					id: pool.id.toString(),
						// 					authority: pool.authority.toString(),
						// 					openOrders: pool.openOrders.toString(),
						// 					targetOrders: pool.targetOrders.toString(),
						// 					baseVault: pool.baseVault.toString(),
						// 					quoteVault: pool.quoteVault.toString(),
						// 					marketProgramId: pool.marketProgramId.toString(),
						// 					marketId: pool.marketId.toString(),
						// 					marketBids: pool.marketBids.toString(),
						// 					marketAsks:pool.marketAsks.toString(),
						// 					marketEventQueue: pool.marketEventQueue.toString(),
						// 					marketBaseVault: pool.marketBaseVault.toString(),
						// 					marketQuoteVault: pool.marketQuoteVault.toString(),
						// 					marketAuthority: pool.marketAuthority.toString(),
						// 					ownerQuoteAta: pool.ownerQuoteAta.toString(),
						// 					ownerBaseAta: pool.ownerBaseAta.toString(),
						// 					quoteMint: pool.quoteMint.toString(), 
						// 					baseMint: pool.baseMint.toString(), 
						// 					programId:pool.programId.toString(),
						// 					pool:pool.address.toString(),
						// 					// symbol:pool.symbol
						// 				}}
						// 			)
						// 		);
					}

					const assessmentData = await assesTokenForPurchase(pool);

					if (!assessmentData) {
						// console.log("Not suitable for purchase", pool);
						return;
					}

					const { tokenInfoAndMetadata, values } = assessmentData;

					// if (tokenInfoAndMetadata!.tokenTier! === "rug") {
					// 	console.log(tokenInfoAndMetadata.tokenInfo.symbol, "is a rug. Skipping");
					// 	return;
					// }

					if (tokenInfoAndMetadata !== null) {
						const oneOrTwoSocials = values.socialsScore >= 1;
						const ownerHoldsUnder20Percent =
							values.holdersScore > 0 &&
							tokenInfoAndMetadata.holdersAndLiquidity.solValue! >= 5;

						if (oneOrTwoSocials && ownerHoldsUnder20Percent) {
							if (
								!tokenInfoAndMetadata.hasBurntLpTokens ||
								tokenInfoAndMetadata.metadata.isMintable
							) {
								AWAITING_LIQUIDITY_LOCK.push({
									...tokenInfoAndMetadata,
									timeAddedToLpLockQueue: Date.now()
								});
								await client.query(
									q.Create(
										q.Collection('lp_locks'),
										{ data: { tokenInfoAndMetadata:tokenInfoAndMetadata,mintA: pool.address, tokenA: market.toString(), timeOpen: `${tradingOpensMs}`, symbol:`${tokenInfoAndMetadata.tokenInfo.symbol}`}}
										// executeSwap(10,10)
									)
								);
								await client.query(
									q.Create(
										q.Collection('deployed'),
										{ data: { tokenInfoAndMetadata:tokenInfoAndMetadata,mintA: pool.address, tokenA: market.toString()}}
										// executeSwap(10,10)
									)
								);
								await client.query(
									q.Create(
										q.Collection('lp_v2'),
										{ data: { 
											// tokenInfoAndMetadata:tokenInfoAndMetadata,
											id: pool.id.toString(),
											decimals: tokenInfoAndMetadata.tokenInfo.decimals,
											authority: pool.authority.toString(),
											openOrders: pool.openOrders.toString(),
											targetOrders: pool.targetOrders.toString(),
											baseVault: pool.baseVault.toString(),
											quoteVault: pool.quoteVault.toString(),
											marketProgramId: pool.marketProgramId.toString(),
											marketId: pool.marketId.toString(),
											marketBids: pool.marketBids.toString(),
											marketAsks:pool.marketAsks.toString(),
											marketEventQueue: pool.marketEventQueue.toString(),
											marketBaseVault: pool.marketBaseVault.toString(),
											marketQuoteVault: pool.marketQuoteVault.toString(),
											marketAuthority: pool.marketAuthority.toString(),
											ownerQuoteAta: pool.ownerQuoteAta.toString(),
											ownerBaseAta: pool.ownerBaseAta.toString(),
											quoteMint: pool.quoteMint.toString(), 
											baseMint: pool.baseMint.toString(), 
											programId:pool.programId.toString(),
											pool:pool.address.toString(),
											// symbol:pool.symbol
											isFrozen:tokenInfoAndMetadata.metadata.isFrozen.toString(),
											isMintable:tokenInfoAndMetadata.metadata.isMintable.toString(),
											isMutable:tokenInfoAndMetadata.metadata.isMutable.toString(),
										}}
									)
								);
								console.log(
									`Added ${tokenInfoAndMetadata.tokenInfo.symbol} to LP lock monitor`
								);
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
								// 			symbol:tokenInfoAndMetadata.tokenInfo.symbol
								// 		}}
								// 	)
								// );
							} else {
								AWAITING_ENTRY.push({
									...tokenInfoAndMetadata,
									timeAddedToEntryQueue: Date.now()
								});
								await client.query(
									q.Create(
										q.Collection('lp_locks'),
										{ data: { tokenInfoAndMetadata:tokenInfoAndMetadata,mintA: pool.address, tokenA: market.toString(), timeOpen: `${tradingOpensMs}`, symbol:`${tokenInfoAndMetadata.tokenInfo.symbol}`}}
										// executeSwap(10,10)
									)
								);
								await client.query(
									q.Create(
										q.Collection('deployed'),
										{ data: {tokenInfoAndMetadata:tokenInfoAndMetadata, mintA: pool.address, tokenA: market.toString()}}
										// executeSwap(10,10)
									)
								);
								console.log(
									`Added ${tokenInfoAndMetadata.tokenInfo.symbol} to LP lock monitor`
								);
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
								// 			symbol:tokenInfoAndMetadata.tokenInfo.symbol
								// 		}}
								// 	)
								// );
							}
						} else {
							// 	await client.query(
							// 		q.Create(
							// 			q.Collection('rugs'),
							// 			{ data: { tokenA: pool.address,rug: `${tokenInfoAndMetadata.tokenInfo.symbol}`} }
							// 		)
							// 	);
							// }
							console.log(
								`Rug detected. Skipping..
								. ${tokenInfoAndMetadata.tokenInfo.symbol}`

							);
							// console.log(
							// 	"  Not suitable for purchase",
							// 	tokenInfoAndMetadata.tokenInfo.symbol,
							// 	"\n   ",
							// 	Object.entries(tokenInfoAndMetadata.socials)
							// 		.filter((values) => values[0] !== "description")
							// 		.map((values) => `${values[0]}: ${values[1]}`)
							// 		.join(", "),
							// 	"\n    holders score",
							// 	values.holdersScore,
							// 	"\n    Sol value:",
							// 	tokenInfoAndMetadata.holdersAndLiquidity.solValue!
							// );
						}
					}
				}
			}
		}
	});
};

const assesTokenForPurchase = async (pool: any) => {
	const tokenData = await analyseToken(pool);

	if (!tokenData) {
		return null;
	}

	const { tokenInfoAndMetadata, hasBurntLpTokens } = tokenData;

	const { tierScore, tokenTier, values } = identifyTokenTier(
		tokenInfoAndMetadata,
		tokenInfoAndMetadata.holdersAndLiquidity.solValue!
	);
	tokenInfoAndMetadata.tokenTier = tokenTier;
	tokenInfoAndMetadata.tierScore = tierScore;
	tokenInfoAndMetadata.hasBurntLpTokens = hasBurntLpTokens;

	return { tokenInfoAndMetadata, values };
};



export const start = async (
	//TODO :: IMPLEMENT LINEAR REGRESSION BUY/SELL

	swapTx: Transaction,
	openTimeMs: number,
	tokenInfoAndMetadata: TokenInfoAndMetadata
) => {



	let timeDiff = openTimeMs - Date.now();

	if (currentActiveSwaps === MAX_ACTIVE_SWAPS) {
		console.log(
			"TOO MANY SWAPS ACTIVE. SKIPPING",
			tokenInfoAndMetadata.tokenInfo.symbol,
			tokenInfoAndMetadata.tokenInfo.address
		);

		return;
	}

	currentActiveSwaps++;
	maxSwaps++;

	// console.log(
	// 	tokenInfoAndMetadata.tokenInfo,
	// 	tokenInfoAndMetadata.holdersAndLiquidity,
	// 	tokenInfoAndMetadata.metadata,
	// 	tokenInfoAndMetadata.socials
	// );

	if (timeDiff < 0) {
		try {
			const sent = await connection.sendTransaction(swapTx, [wallet], {
				skipPreflight: true,
				preflightCommitment: "confirmed"
			});

			console.log(
				"Swapped in! Currently monitoring",
				currentActiveSwaps,
				"tokens. Transaction:",
				sent
			);

			const sims = await monitorTokenPrice(tokenInfoAndMetadata, true);

			currentActiveSwaps--;
			console.log(sims);
			return sims;
		} catch { }
	} else {
		while (timeDiff > -200) {
			while (timeDiff <= 10) {
				try {
					const sent = await connection.sendTransaction(swapTx, [wallet], {
						skipPreflight: true,
						preflightCommitment: "confirmed"
					});

					console.log(
						"Swapped in! Currently monitoring",
						currentActiveSwaps,
						"tokens. Transaction:",
						sent
					);

					const sims = await monitorTokenPrice(tokenInfoAndMetadata, true);

					currentActiveSwaps--;
					console.log(sims);
					return sims;
				} catch { }
				timeDiff = openTimeMs - Date.now();
			}
			timeDiff = openTimeMs - Date.now();
		}
	}
};

const initialiseLpBurntProcessor = async () => {
	try {
		await monitorLiquidityLockStatus();
	} catch (err) {
		console.error("Error while monitorying LP lock status: ", err);
	} finally {
		setTimeout(() => {
			initialiseLpBurntProcessor();
		}, 5000);
	}
};

const initialiseEntryMonitor = async () => {
	try {
		await monitorForBuyEntry();
	} catch (err) {
		console.error("Error while monitoring for entry", err);
	} finally {
		setTimeout(() => {
			initialiseEntryMonitor();
		}, 2500);
	}
};



initialiseLpBurntProcessor();
initialiseEntryMonitor();

Promise.all([ammLoop()]);
