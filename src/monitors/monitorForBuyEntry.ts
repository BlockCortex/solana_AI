import { Transaction } from "@solana/web3.js";
import { AWAITING_ENTRY, connection } from "../config";
import { swapTx } from "../swapTx";
import { getHoldersData } from "../tokenAnalysis/getHoldersData";
import { getLiquidityValue } from "../tokenAnalysis/getLiquidityValue";
import { MACD, TokenInfoAndMetadata } from "../types";
import { PURCHASE_TIERS } from "../utils/tiers";
import { start } from "..";
import { monitorTokenPrice } from "./monitorTokenPrice";
import colors from "colors";

export const monitorForBuyEntry = async () => {
	if (AWAITING_ENTRY.length > 0) {
		const nowMs = Date.now();
		for (let i = AWAITING_ENTRY.length - 1; i >= 0; i--) {
			// if (!AWAITING_ENTRY[i].hasOwnProperty("priceData")) {
			// 	AWAITING_ENTRY[i].priceData = {
			// 		lastPrice: null,
			// 		allTimeHigh: null,
			// 		allTimeLow: null,
			// 		purchasePrice: null,
			// 		bottomConfirmedCounter: 0,
			// 		prices: []
			// 	};
			// }

			try {
				const holdersData = await getHoldersData(AWAITING_ENTRY[i]);

				if (!holdersData) {
					AWAITING_ENTRY.splice(i, 1);
					continue;
				}

				const { quoteTokenAmount, baseTokenAmount } = await getLiquidityValue(
					connection,
					AWAITING_ENTRY[i].pool.id
				);
				const currentPrice =
					quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount;
				AWAITING_ENTRY[i].priceData!.prices.push(currentPrice);
				AWAITING_ENTRY[i].priceData!.indicators.rsi.update(currentPrice);
				// AWAITING_ENTRY[i].priceData!.indicators.atr.update(currentPrice);
				// AWAITING_ENTRY[i].priceData!.indicators.ema9.update(currentPrice);
				// AWAITING_ENTRY[i].priceData!.indicators.ema12.update(currentPrice);
				// AWAITING_ENTRY[i].priceData!.indicators.ema26.update(currentPrice);
				// AWAITING_ENTRY[i].priceData!.indicators.macd!.update(currentPrice);

				if (
					!AWAITING_ENTRY[i].priceData!.allTimeHigh ||
					currentPrice > AWAITING_ENTRY[i].priceData?.allTimeHigh!
				) {
					AWAITING_ENTRY[i].priceData!.allTimeHigh = currentPrice;
				}

				if (
					!AWAITING_ENTRY[i].priceData!.allTimeLow ||
					currentPrice < AWAITING_ENTRY[i].priceData?.allTimeLow!
				) {
					AWAITING_ENTRY[i].priceData!.allTimeLow = currentPrice;
					AWAITING_ENTRY[i].priceData!.bottomConfirmedCounter = 0;
				} else {
					AWAITING_ENTRY[i].priceData!.bottomConfirmedCounter++;
				}

				if (
					quoteTokenAmount.value.uiAmount <=
					AWAITING_ENTRY[i].holdersAndLiquidity.solValue! * 0.5
				) {
					const [ruggedToken] = AWAITING_ENTRY.splice(i, 1);
					console.log("    RUGGED AFTER APPROVAL:", ruggedToken.tokenInfo.symbol);
					continue;
				}

				if (holdersData.top10HoldersTotal > AWAITING_ENTRY[i].tokenInfo.supply!) {
					console.log("    RUG - MINTED", AWAITING_ENTRY[i].tokenInfo.symbol);
					AWAITING_ENTRY.splice(i, 1);
					continue;
				}

				if (nowMs - AWAITING_ENTRY[i].timeAddedToEntryQueue! > 900000) {
					console.log("    AWAITING ENTRY TIMEOUT", AWAITING_ENTRY[i].tokenInfo.symbol);
					console.log(
						"    FOR ENTRY. TOP HOLDER %:",
						holdersData.topHolderPercent,
						"TOP 10 HOLDERS %:",
						holdersData.top10HoldersTotalPercent
					);
					AWAITING_ENTRY.splice(i, 1);
					continue;
				}

				AWAITING_ENTRY[i].priceData!.lastPrice = currentPrice;
				const currentRSI = Number(
					AWAITING_ENTRY[i].priceData!.indicators.rsi.getResult().valueOf()
				);
				// const currentMACD = AWAITING_ENTRY[i]
				// 	.priceData!.indicators.macd!.getResult()
				// 	.valueOf() as MACD;
				// const currentEMA12 = AWAITING_ENTRY[i]
				// 	.priceData!.indicators.ema12.getResult()
				// 	.valueOf();
				// const currentEMA26 = AWAITING_ENTRY[i]
				// 	.priceData!.indicators.ema26.getResult()
				// 	.valueOf();
				// console.log(
				// 	"RSI:",
				// 	currentRSI,
				// 	"MACD:",
				// 	currentMACD,
				// 	"EMA12:",
				// 	currentEMA12,
				// 	"EMA26:",
				// 	currentEMA26
				// );

				if (holdersData.topHolderPercent > 9 || holdersData.top10HoldersTotalPercent > 35) {
					continue;
				}
				//  else {
				// 	AWAITING_ENTRY[i].approvedForPurchase = true;
				// }

				// if (
				// 	// CONSIDER INCREASING HOLDER THRESHOLD AND REDUCING RSI TO 25
				// 	AWAITING_ENTRY[i].priceData!.bottomConfirmedCounter >= 25 && // 5 seconds - maybe need 10? // prev
				// 	currentRSI <= 30 &&
				// 	AWAITING_ENTRY[i].approvedForPurchase
				// ) {

				AWAITING_ENTRY[i].priceData!.purchasePrice = currentPrice;
				console.log(AWAITING_ENTRY[i].tokenInfo.symbol, "APPROVED FOR BUY ENTRY");
				console.log(
					"TOP HOLDER %:",
					holdersData.topHolderPercent,
					"TOP 10 HOLDERS %:",
					holdersData.top10HoldersTotalPercent,
					`\nhttps://www.dextools.io/app/en/solana/pair-explorer/${AWAITING_ENTRY[i].tokenInfo.address}`
				);
				const [approvedToken] = AWAITING_ENTRY.splice(i, 1);

				if (
					(holdersData.topHolderPercent <= 4 && holdersData.topHolderPercent >= 2) ||
					(holdersData.top10HoldersTotalPercent <= 25 &&
						holdersData.top10HoldersTotalPercent >= 20 &&
						holdersData.topHolderPercent <= 6)
				) {
					if (currentRSI < 40) {
						console.log(
							"LOW TOP HOLDERS BUYING WITHOUT RSI",
							approvedToken.tokenInfo.symbol
						);
						approvedToken.priceData!.purchasePrice = currentPrice;
						const transactionInstructions = await swapTx(
							approvedToken.pool,
							PURCHASE_TIERS[approvedToken.tokenTier!].amount,
							false,
							{
								...approvedToken,
								holdersAndLiquidity: {
									...approvedToken.holdersAndLiquidity,
									...holdersData
								}
							},
							0
						);

						start(transactionInstructions, 0, {
							...approvedToken,
							holdersAndLiquidity: {
								...approvedToken.holdersAndLiquidity,
								...holdersData
							}
						});
					} else {
						console.log("Option 2");
						monitorTokenPrice(
							{
								...approvedToken,
								holdersAndLiquidity: {
									...approvedToken.holdersAndLiquidity,
									...holdersData
								}
							},
							false
						);
					}
				} else {
					console.log("Option 3");
					monitorTokenPrice(
						{
							...approvedToken,
							holdersAndLiquidity: {
								...approvedToken.holdersAndLiquidity,
								...holdersData
							}
						},
						false
					);
				}

				// console.log(AWAITING_ENTRY[i].priceData);

				// const [approvedToken] = AWAITING_ENTRY.splice(i, 1);

				// 	continue;
				// }
			} catch (err) {}
		}
	}
};
