import {
	// CHAT_DATA,
	// GROUP_DATA,
	connection,
	wallet
} from "../config";
// import { sendTokenAlert, tgBot } from "../telegramBot/telegramBot";
import { getLiquidityValue } from "../tokenAnalysis/getLiquidityValue";
import { TokenInfoAndMetadata, TradeData } from "../types";
import { PURCHASE_TIERS } from "../utils/tiers";
import { wait } from "../utils/tools";
import { swapTx } from "../swapTx";

import * as BL from "@solana/buffer-layout";
import colors from "colors";

export const monitorTokenPrice = async (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	tokenPurchased: boolean
) => {
	// sendTokenAlert(tokenInfoAndMetadata);
	let { tokenAmountPurchased, _formatAmount: formatAmount } = tokenPurchased
		? await getAccountInfo(tokenInfoAndMetadata)
		: { tokenAmountPurchased: 0, _formatAmount: 0 };
	let buyTimeMs = 0;
	// const buyTimeMs = Date.now();
	// let tokenAmountCurrentlyHeld = 0;
	// let formatAmount = 0;
	let tokenAmountCurrentlyHeld = tokenAmountPurchased;
	let awaitingTokenAmountReload = false;
	let isTradeActive = tokenPurchased;

	// if (tokenAmountCurrentlyHeld > 0) {

	let lastPrice = tokenInfoAndMetadata.priceData!.lastPrice;
	let allTimeHigh = tokenInfoAndMetadata.priceData!.allTimeHigh;
	let initialSolValue = 0;
	let stopLossValue = tokenInfoAndMetadata.priceData!.purchasePrice
		? tokenInfoAndMetadata.priceData!.purchasePrice * 0.25
		: 0;
	let purchasePrice = tokenInfoAndMetadata.priceData!.purchasePrice
		? tokenInfoAndMetadata.priceData!.purchasePrice
		: 0;
	let currentTradeData: TradeData = {
		high: 0,
		rsiHigh: 0,
		low: 99999999999999,
		rsiLow: 9999999999999,
		highCounter: 0,
		cooldownInterval: 0
	};
	let tradingCooldownActivatedMs = 0;
	// let rebuyTimeMs = 0;
	let numberOfTrades = 0;
	let initialLpChecked = false;
	let frontRunCounter = 0;
	let errorCounter = 0;
	let isStopLossTriggered = false;
	const transactions: Promise<string>[] = [];
	const maximumNumberOfTrades = 8;
	const initialPurchasePrice = tokenInfoAndMetadata.priceData!.purchasePrice!;

	while (true) {
		try {
			const iterationStartMs = Date.now();

			if (
				awaitingTokenAmountReload
				//  && iterationStartMs - buyTimeMs > 20000
			) {
				// console.log(Date.now());
				// const tokenAmountPurchasedNew = await getUpdatedTokenAmount(
				// 	tokenInfoAndMetadata.pool.ownerBaseAta
				// );
				// console.log(Date.now());
				// console.log("New token fetch method amount", tokenAmountPurchasedNew);
				console.log("awaiting token amount reload", tokenInfoAndMetadata.tokenInfo.symbol);
				const { tokenAmountPurchased, _formatAmount } = await getAccountInfo(
					tokenInfoAndMetadata
				);
				// console.log(Date.now());
				tokenAmountCurrentlyHeld = tokenAmountPurchased;
				formatAmount = _formatAmount;
				awaitingTokenAmountReload = false;
				console.log(
					"found account, currently holding:",
					tokenAmountCurrentlyHeld,
					"of",
					tokenInfoAndMetadata.tokenInfo
				);
			}
			// else if (awaitingTokenAmountReload) {
			// 	console.log(
			// 		"Reloading token amount for",
			// 		tokenInfoAndMetadata.tokenInfo.symbol,
			// 		"in",
			// 		buyTimeMs - iterationStartMs + 20000,
			// 		"ms"
			// 	);
			// }

			const { currentPrice, quoteTokenAmount } = await getCurrentPrice(tokenInfoAndMetadata);
			const currentSolValue =
				formatAmount === 0
					? 0
					: Number(currentPrice) * Number(formatAmount / Math.pow(10, 9));

			if (numberOfTrades === maximumNumberOfTrades && !isTradeActive) {
				console.log(
					"Maximum number of trades reached. Exiting trade",
					tokenInfoAndMetadata.tokenInfo.symbol
				);
				return Promise.all(transactions);
			}

			if (!initialLpChecked) {
				const { _initialSolValue, _initialLpChecked } = getInitialValues(
					currentPrice,
					formatAmount
				);
				initialSolValue = _initialSolValue;
				initialLpChecked = _initialLpChecked;
			}

			if (currentPrice <= stopLossValue) {
				isStopLossTriggered = true;
			}

			if (lastPrice && currentPrice >= lastPrice * 5) {
				if (frontRunCounter === 5) {
					console.log("Front run detection was false. Re-adjusting price");
					lastPrice = currentPrice;
					frontRunCounter = 0;
				} else {
					console.log("Possible front run detected. Skipping iteration");
					frontRunCounter++;
					continue;
				}
			}

			const { _tokenInfoAndMetadata, currentRSI } = updateIndicators(
				tokenInfoAndMetadata,
				currentPrice
			);
			tokenInfoAndMetadata = _tokenInfoAndMetadata;
			allTimeHigh = checkIfIsAth(
				tokenInfoAndMetadata,
				currentPrice,
				allTimeHigh!,
				initialSolValue,
				currentSolValue,
				currentRSI
			);
			// stopLossValue = calculateStopLoss(currentPrice, stopLossValue, purchasePrice);

			if (
				(currentRSI <= 2 ||
					(lastPrice && currentPrice <= lastPrice * 0.25) ||
					(purchasePrice && currentPrice < allTimeHigh * 0.1)) &&
				!isTradeActive
			) {
				console.log(
					"Token is dead. RSI:",
					currentRSI,
					tokenInfoAndMetadata.tokenInfo.symbol
				);
				return Promise.all(transactions);
			}

			if (tradingCooldownActivatedMs > 0) {
				if (iterationStartMs - tradingCooldownActivatedMs > 30000) {
					tradingCooldownActivatedMs = 0;
					console.log(
						"Trading cooldown elapsed. Scanning for re-entry",
						tokenInfoAndMetadata.tokenInfo.symbol
					);
				}
			} else {
				if (isTradeActive && tokenAmountCurrentlyHeld > 0) {
					const lossSellOutcome = checkForLossSell(
						tokenInfoAndMetadata,
						iterationStartMs,
						buyTimeMs,
						currentRSI,
						currentPrice,
						purchasePrice,
						tokenAmountCurrentlyHeld,
						isStopLossTriggered,
						allTimeHigh,
						quoteTokenAmount.value.uiAmount
					);

					if (lossSellOutcome) {
						const { isSold, isDead, transaction, _isTradeActive, _currentTradeData } =
							lossSellOutcome;

						if (isSold) {
							isTradeActive = false;
							currentTradeData = _currentTradeData;
							tokenAmountCurrentlyHeld = 0;
							tradingCooldownActivatedMs = iterationStartMs;
							numberOfTrades += 0.5;
							isStopLossTriggered = false;
							transactions.push(transaction);

							if (isDead || currentPrice <= purchasePrice * 0.85) {
								// console.log("Dead token detected. Exiting trade", isDead);
								return Promise.all(transactions);
							}

							// await wait(500 - (Date.now() - iterationStartMs));
							continue;
						}
					}

					const profitSellCheckOutcome = checkForProfitSell(
						tokenInfoAndMetadata,
						currentTradeData,
						iterationStartMs,
						currentRSI,
						currentPrice,
						purchasePrice,
						tokenAmountCurrentlyHeld
					);

					if (!profitSellCheckOutcome.isSold) {
						currentTradeData = profitSellCheckOutcome._currentTradeData;

						// await wait(500 - (Date.now() - iterationStartMs));
						continue;
					} else {
						const { transaction, _isTradeActive, _currentTradeData } =
							profitSellCheckOutcome;

						isTradeActive = false;
						currentTradeData = _currentTradeData;
						tokenAmountCurrentlyHeld = 0;
						tradingCooldownActivatedMs = iterationStartMs;
						transactions.push(transaction!);

						// await wait(500 - (Date.now() - iterationStartMs));
						return Promise.all(transactions);
						continue;
					}
				}

				if (!isTradeActive) {
					// if (currentPrice < purchasePrice) {
					// 	return Promise.all(transactions);
					// }

					const buyEntryCheckOutcome = checkForBuyEntry(
						tokenInfoAndMetadata,
						currentTradeData,
						iterationStartMs,
						currentRSI,
						currentPrice,
						purchasePrice
					);

					if (!buyEntryCheckOutcome.isBought) {
						currentTradeData = buyEntryCheckOutcome._currentTradeData;
						continue;
					} else {
						const { transaction, _isTradeActive, _currentTradeData } =
							buyEntryCheckOutcome;

						console.log("PURCHASED", tokenInfoAndMetadata.tokenInfo.symbol);
						isTradeActive = true;
						currentTradeData = _currentTradeData;
						initialLpChecked = false;
						purchasePrice = currentPrice;
						numberOfTrades += 1;
						awaitingTokenAmountReload = true;
						buyTimeMs = Date.now();
						transactions.push(transaction!);

						// tgBot.sendMessage(
						// 	// add current price as real solana value
						// 	GROUP_DATA.id,
						// 	`BUY SIGNAL ${tokenInfoAndMetadata.tokenInfo.symbol} - ${tokenInfoAndMetadata.tokenInfo.address}`
						// );

						// await wait(500 - (Date.now() - iterationStartMs));
						continue;
					}
				}
			}

			// console.log("Sleeping after iteration", Date.now() - iterationStartMs);
			await wait(500);
		} catch (err) {
			console.log(err);
			if ((err = "Could not find account info")) {
				return null;
			}

			if (errorCounter === 50) {
				console.log(err);
				// tgBot.sendMessage(
				// 	CHAT_DATA.chatId,
				// 	`Could not sell ${tokenInfoAndMetadata.tokenInfo.symbol}`
				// );

				// return null;
			}

			errorCounter++;
			await wait(500);
		}
	}
	// }
};

const getAccountInfo = async (tokenInfoAndMetadata: TokenInfoAndMetadata) => {
	let accountInfo = await connection.getAccountInfo(tokenInfoAndMetadata.pool.ownerBaseAta, {
		commitment: "processed"
	});
	let index = 0;

	while (!accountInfo || index !== 300) {
		accountInfo = await connection.getAccountInfo(tokenInfoAndMetadata.pool.ownerBaseAta, {
			commitment: "processed"
		});

		index++;
		await wait(200);
	}

	if (accountInfo) {
		const tokenAmountPurchased = new BL.NearUInt64().decode(
			new Uint8Array(accountInfo!.data.subarray(64, 82))
		);
		const formatAmount =
			tokenAmountPurchased / Math.pow(10, tokenInfoAndMetadata.pool.baseDecimals);

		return { tokenAmountPurchased, _formatAmount: formatAmount };
	} else {
		throw new Error("Could not find account info");
	}
};

const updateIndicators = (tokenInfoAndMetadata: TokenInfoAndMetadata, currentPrice: number) => {
	tokenInfoAndMetadata.priceData!.indicators.rsi.update(currentPrice);
	// tokenInfoAndMetadata.priceData!.indicators.ema9.update(currentPrice);
	// tokenInfoAndMetadata.priceData!.indicators.ema12.update(currentPrice);
	// tokenInfoAndMetadata.priceData!.indicators.ema26.update(currentPrice);
	// tokenInfoAndMetadata.priceData!.indicators.macd!.update(currentPrice);
	const currentRSI = Number(tokenInfoAndMetadata.priceData!.indicators.rsi.getResult().valueOf());
	// const currentMACD = tokenInfoAndMetadata.priceData!.indicators.macd!.getResult().valueOf();
	// const currentEMA12 = tokenInfoAndMetadata.priceData!.indicators.ema12.getResult().valueOf();
	// const currentEMA26 = tokenInfoAndMetadata.priceData!.indicators.ema26.getResult().valueOf();

	// console.log(
	// 	tokenInfoAndMetadata.tokenInfo.symbol,
	// 	"RSI:",
	// 	currentRSI,
	// 	"current price:",
	// 	currentPrice
	// 	// "MACD:",
	// 	// currentMACD,
	// 	// "EMA12:",
	// 	// currentEMA12,
	// 	// "EMA26:",
	// 	// currentEMA26
	// );

	return {
		_tokenInfoAndMetadata: tokenInfoAndMetadata,
		currentRSI
		// currentMACD,
		// currentEMA12,
		// currentEMA26
	};
};

const getInitialValues = (currentPrice: number, formatAmount: number) => {
	const purchasePrice = Number(currentPrice.toString());
	const initialSolValue =
		Number(purchasePrice.toString()) * Number(formatAmount / Math.pow(10, 9));

	return {
		_purchasePrice: purchasePrice,
		_initialSolValue: initialSolValue,
		_initialLpChecked: true
	};
};

const getCurrentPrice = async (tokenInfoAndMetadata: TokenInfoAndMetadata) => {
	const { quoteTokenAmount, baseTokenAmount } = await getLiquidityValue(
		connection,
		tokenInfoAndMetadata.pool.id
	);
	const currentPrice = quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount;

	return { currentPrice, quoteTokenAmount };
};

const checkIfIsAth = (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	currentPrice: number,
	allTimeHigh: number,
	initialSolValue: number,
	currentSolValue: number,
	currentRSI: number
) => {
	if (!allTimeHigh || currentPrice > allTimeHigh) {
		allTimeHigh = currentPrice;
		console.log(
			tokenInfoAndMetadata.pool.baseMint.toString(),
			"RSI current:",
			currentRSI,
			"RSI ATH:",
			tokenInfoAndMetadata.priceData?.indicators.rsi.highest?.valueOf(),
			tokenInfoAndMetadata.tokenInfo.symbol,
			"New all time high:",
			allTimeHigh,
			"purchase sol value",
			initialSolValue,
			"current sol value",
			currentSolValue
		);
	}

	return allTimeHigh;
};

async function getUpdatedTokenAmount(ata) {
	let accountInfo;

	while (accountInfo === null) {
		accountInfo = await connection.getAccountInfo(ata, {
			commitment: "processed",
			dataSlice: {
				offset: 64,
				length: 8
			}
		});

		if (accountInfo === null) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	const balance = new BL.NearUInt64().decode(new Uint8Array(accountInfo.data.subarray(0, 8)));
	return balance;
}

const calculateStopLoss = (
	currentPrice: number,
	currentStopLoss: number,
	purchasePrice: number
) => {
	// if (currentPrice > purchasePrice * 2) {
	if (currentPrice * 0.5 > currentStopLoss) {
		return currentPrice * 0.5;
	}
	// }
	//  else {
	// 	if (currentPrice * 0.5 > currentStopLoss) {
	// 		return currentPrice * 0.5;
	// 	}
	// }

	return currentStopLoss;
};

const executeSwap = async (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	amountToSell: number,
	currentPrice: number,
	purchasePrice: number,
	isSell: boolean
) => {
	const swp = await swapTx(
		tokenInfoAndMetadata.pool,
		amountToSell,
		isSell,
		tokenInfoAndMetadata,
		!isSell ? 0 : amountToSell
	);
	const transaction = connection.sendTransaction(swp, [wallet], {
		skipPreflight: true,
		preflightCommitment: "confirmed"
	});

	console.log(
		`${isSell ? "Sold" : "Bought"} ${tokenInfoAndMetadata.pool.baseMint.toString()} ${
			tokenInfoAndMetadata.tokenInfo.symbol
		} ${isSell ? `at ${(currentPrice / purchasePrice).toFixed(2)} x profit` : ""}`
	);
	// tgBot.sendMessage(
	// 	CHAT_DATA.chatId,
	// 	`${isSell ? "Sold" : "Rebought"} ${tokenInfoAndMetadata.tokenInfo.symbol} for ${
	// 		isSell ? `${(currentPrice / purchasePrice).toFixed(2)} return` : currentPrice
	// 	}`
	// );

	return transaction;
};

const checkForProfitSell = (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	currentTradeData: TradeData,
	nowMs: number,
	currentRSI: number,
	currentPrice: number,
	purchasePrice: number,
	tokenAmountHeld: number
) => {
	const overBoughtRSI = 82.5;
	const isVeryOverboughtSell = currentRSI >= 90 && currentPrice >= purchasePrice * 200;

	if (isVeryOverboughtSell) {
		const sellTransaction = executeSwap(
			tokenInfoAndMetadata,
			tokenAmountHeld,
			currentPrice,
			purchasePrice,
			true
		);

		return {
			isSold: true,
			transaction: sellTransaction,
			_isTradeActive: false,
			_currentTradeData: {
				high: 0,
				rsiHigh: 0,
				low: 99999999999999,
				rsiLow: 9999999999999,
				highCounter: 0,
				lowCounter: 0,
				cooldownInterval: 0
			}
		};
	}

	if (
		currentTradeData.cooldownInterval > 0 &&
		nowMs - currentTradeData.cooldownInterval < 5000 // wait for 5 seconds to see trend
	) {
		console.log(
			"Awaiting SELL data cooldown for",
			tokenInfoAndMetadata.tokenInfo.symbol,
			nowMs - currentTradeData.cooldownInterval
		);

		return {
			isSold: false,
			_currentTradeData: currentTradeData
		};
	} else {
		currentTradeData.cooldownInterval = 0;
	}

	if (
		((currentTradeData.high === 0 && currentRSI >= overBoughtRSI) ||
			(currentTradeData.high > 0 &&
				currentPrice > currentTradeData.high &&
				currentRSI > currentTradeData.rsiHigh)) &&
		currentTradeData.highCounter < 200
	) {
		currentTradeData.high = currentPrice;
		currentTradeData.rsiHigh = currentRSI;
		currentTradeData.highCounter = currentTradeData.highCounter += 1;
		currentTradeData.cooldownInterval = nowMs;

		console.log(tokenInfoAndMetadata.tokenInfo.symbol, "New high set", currentTradeData);
		return {
			isSold: false,
			_currentTradeData: currentTradeData
		};
	} else if (currentTradeData.high > 0 && currentPrice >= currentTradeData.high * 0.95) {
		// check for divergence
		const similarPriceRsiDivergence = currentTradeData.rsiHigh / currentRSI;
		const hasBearishDivergence =
			similarPriceRsiDivergence >= 1 || similarPriceRsiDivergence <= 0.95;

		if (hasBearishDivergence && currentPrice >= purchasePrice * 200) {
			console.log(
				tokenInfoAndMetadata.tokenInfo.symbol,
				"Bearish divergence detected",
				hasBearishDivergence,
				"selling at price:",
				currentPrice
			);

			const sellTransaction = executeSwap(
				tokenInfoAndMetadata,
				tokenAmountHeld,
				currentPrice,
				purchasePrice,
				true
			);

			return {
				isSold: true,
				transaction: sellTransaction,
				_isTradeActive: false,
				_currentTradeData: {
					high: 0,
					rsiHigh: 0,
					low: 99999999999999,
					rsiLow: 9999999999999,
					highCounter: 0,
					lowCounter: 0,
					cooldownInterval: 0
				}
			};
		} else if (currentPrice >= purchasePrice * 200) {
			// check for strong top resistance
			currentTradeData.cooldownInterval = nowMs;
			currentTradeData.highCounter = currentTradeData.highCounter += 1;

			if (currentTradeData.highCounter >= 3) {
				console.log(
					tokenInfoAndMetadata.tokenInfo.symbol,
					"Strong top resistance found at",
					currentTradeData.rsiHigh,
					" RSI. Selling at price:",
					currentPrice
				);

				const sellTransaction = executeSwap(
					tokenInfoAndMetadata,
					tokenAmountHeld,
					currentPrice,
					purchasePrice,
					true
				);

				return {
					isSold: true,
					transaction: sellTransaction,
					_isTradeActive: false,
					_currentTradeData: {
						high: 0,
						rsiHigh: 0,
						low: 99999999999999,
						rsiLow: 9999999999999,
						highCounter: 0,
						lowCounter: 0,
						cooldownInterval: 0
					}
				};
			}
		}
	}

	return {
		isSold: false,
		_currentTradeData: currentTradeData
	};
};

const checkForLossSell = (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	nowMs: number,
	buyTimeMs: number,
	currentRSI: number,
	currentPrice: number,
	purchasePrice: number,
	tokenAmountHeld: number,
	isStopLossTriggered: boolean,
	currentATH: number,
	quoteTokenAmount: number
) => {
	// TEMP LOGIC UNTIL ATR IMPLEMENTED
	const isStopLimitSell = isStopLossTriggered && currentRSI > 40;
	// (isStopLossTriggered && currentPrice <= purchasePrice * 0.7);
	const isDeadSell =
		nowMs - buyTimeMs > 180000 && currentPrice <= purchasePrice && currentRSI <= 2;
	const isRugSell = quoteTokenAmount <= tokenInfoAndMetadata.holdersAndLiquidity.solValue! * 0.5;

	if (isStopLimitSell || isDeadSell || isRugSell) {
		if (isStopLimitSell) {
			console.log("Selling due to stop loss", tokenInfoAndMetadata.tokenInfo.symbol);
		} else if (isDeadSell) {
			console.log("Selling due dead token", tokenInfoAndMetadata.tokenInfo.symbol);
		} else {
			console.log("RUGGED AFTER BUY", tokenInfoAndMetadata.tokenInfo.symbol);

			// tgBot.sendMessage(
			// 	CHAT_DATA.chatId,
			// 	`🧹🧹🧹RUGGED: ${tokenInfoAndMetadata.tokenInfo.symbol}🧹🧹🧹`
			// );
		}

		const sellTransaction = executeSwap(
			tokenInfoAndMetadata,
			tokenAmountHeld,
			currentPrice,
			purchasePrice,
			true
		);

		return {
			isDead: isDeadSell || isRugSell,
			isSold: true,
			transaction: sellTransaction,
			_isTradeActive: false,
			_currentTradeData: {
				high: 0,
				rsiHigh: 0,
				low: 99999999999999,
				rsiLow: 9999999999999,
				highCounter: 0,
				lowCounter: 0,
				cooldownInterval: 0
			}
		};
	}

	return null;
};

const checkForBuyEntry = (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	currentTradeData: TradeData,
	iterationStartMs: number,
	currentRSI: number,
	currentPrice: number,
	purchasePrice: number
) => {
	const overSoldRSI = 22.5;

	if (
		currentTradeData.cooldownInterval > 0 &&
		iterationStartMs - currentTradeData.cooldownInterval < 7500 // wait for 7.5 seconds to see trend
	) {
		console.log(
			tokenInfoAndMetadata.tokenInfo.symbol,
			"Awaiting BUY data cooldown for",
			tokenInfoAndMetadata.tokenInfo.symbol
		);
		return {
			isBought: false,
			_isTradeActive: false,
			_currentTradeData: currentTradeData
		};
	} else {
		currentTradeData.cooldownInterval = 0;
	}

	if (currentRSI <= overSoldRSI && currentTradeData.low === 99999999999999) {
		currentTradeData.low = currentPrice;
		currentTradeData.rsiLow = currentRSI;
		currentTradeData.cooldownInterval = iterationStartMs;

		return {
			isBought: false,
			_isTradeActive: false,
			_currentTradeData: currentTradeData
		};
	} else if (currentTradeData.low < 99999999999999 && currentRSI <= 40) {
		// rethink
		const similarPriceRsiDivergence = currentRSI / currentTradeData.rsiLow;
		const hasBullishDivergence = similarPriceRsiDivergence >= 1.25;
		const hasStrongBullishDivergence = similarPriceRsiDivergence >= 2;

		if (
			hasBullishDivergence &&
			currentPrice > currentTradeData.low * 1.15
			// && currentPrice < currentTradeData.low * 1.25
		) {
			console.log(
				tokenInfoAndMetadata.tokenInfo.symbol,
				"Bullish divergence detected",
				hasBullishDivergence,
				"buying at price:",
				currentPrice
			);
			const buyTransaction = executeSwap(
				tokenInfoAndMetadata,
				PURCHASE_TIERS[tokenInfoAndMetadata.tokenTier!].amount,
				currentPrice,
				purchasePrice,
				false
			);

			return {
				isBought: true,
				transaction: buyTransaction,
				_isTradeActive: true,
				_currentTradeData: {
					high: 0,
					rsiHigh: 0,
					low: 99999999999999,
					rsiLow: 9999999999999,
					highCounter: 0,
					cooldownInterval: 0
				}
			};
		} else if (hasStrongBullishDivergence && currentPrice <= currentTradeData.low) {
			console.log(
				tokenInfoAndMetadata.tokenInfo.symbol,
				"Strong bullish divergence detected",
				hasStrongBullishDivergence,
				"buying at price:",
				currentPrice
			);

			currentTradeData.low = currentPrice;
			currentTradeData.rsiLow = currentRSI;

			const buyTransaction = executeSwap(
				tokenInfoAndMetadata,
				PURCHASE_TIERS[tokenInfoAndMetadata.tokenTier!].amount,
				currentPrice,
				purchasePrice,
				false
			);

			return {
				isBought: true,
				transaction: buyTransaction,
				_isTradeActive: true,
				_currentTradeData: {
					high: 0,
					rsiHigh: 0,
					low: 99999999999999,
					rsiLow: 9999999999999,
					highCounter: 0,
					cooldownInterval: 0
				}
			};
		} else {
			console.log(
				tokenInfoAndMetadata.tokenInfo.symbol,
				"New bottom detected",
				hasBullishDivergence,
				"setting RSI to",
				currentRSI,
				"at price",
				currentPrice
			);

			currentTradeData.low = currentPrice;
			currentTradeData.rsiLow = currentRSI;
			currentTradeData.cooldownInterval = iterationStartMs;

			return {
				isBought: false,
				_isTradeActive: false,
				_currentTradeData: currentTradeData
			};
		}
	}

	return {
		isBought: false,
		_isTradeActive: false,
		_currentTradeData: currentTradeData
	};
};

// export const monitorTokenPrice = async (
// 	tokenInfoAndMetadata: TokenInfoAndMetadata,
// 	buySignature: string
// ) => {
// 	const { tokenInfo, pool, tokenTier } = tokenInfoAndMetadata;
// 	let initialSold = false;
// 	// let lastPrice = 0;
// 	let lastPrice = tokenInfoAndMetadata.priceData?.lastPrice;
// 	let limitSellTarget;
// 	// let allTimeHigh = 0;
// 	let allTimeHigh = tokenInfoAndMetadata.priceData?.allTimeHigh;
// 	let isDead;
// 	let errorCounter = 0;
// 	let stopLossValue = 0.5;
// 	let stopLimitValue = 0.45;
// 	const returnValue = PURCHASE_TIERS[tokenTier!].exit;
// 	const transactions: Promise<string>[] = [];

// 	const priceData: number[] = [];
// 	// const rsi = indicatorRelativeStrengthIndex().period(14);
// 	// console.log(buySignature);

// 	sendTokenAlert(tokenInfoAndMetadata);
// 	let acc = await connection.getAccountInfo(tokenInfoAndMetadata.pool.ownerBaseAta, {
// 		commitment: "processed"
// 	});
// 	let index = 0;

// 	while (!acc || index !== 30) {
// 		// console.log("waiting for account");
// 		acc = await connection.getAccountInfo(tokenInfoAndMetadata.pool.ownerBaseAta, {
// 			commitment: "processed"
// 		});

// 		index++;
// 		await wait(2000);
// 	}

// 	if (acc) {
// 		// const txConfirmationRes = await connection.getParsedTransaction(buySignature); // use to get real initial value
// 		// console.log(txConfirmationRes);
// 		const buyTimeMs = Date.now();
// 		const tokenAmountPurchased = new BL.NearUInt64().decode(
// 			new Uint8Array(acc!.data.subarray(64, 82))
// 		);
// 		const formatAmount = tokenAmountPurchased / Math.pow(10, pool.baseDecimals);
// 		let samePriceCounter = 0;

// 		let tokenAmountCurrentlyHeld = new BL.NearUInt64().decode(
// 			// reduced as sells occur
// 			new Uint8Array(acc!.data.subarray(64, 82))
// 		);

// 		if (tokenAmountCurrentlyHeld > 0) {
// 			console.log(
// 				"found account, currently holding:",
// 				tokenAmountCurrentlyHeld,
// 				"of",
// 				tokenInfoAndMetadata.pool.baseMint.toString()
// 			);

// 			let initialSolValue = 0;
// 			// let purchasePrice = 0;
// 			let purchasePrice = tokenInfoAndMetadata.priceData!.purchasePrice!;
// 			let initialLpChecked = false;
// 			let frontRunCounter = 0;
// 			let rsiAbove80 = 0;
// 			let rsiLastSet = 0;

// 			// const rsi = new FasterRSI(14);
// 			// const tokenPriceData = tokenInfoAndMetadata.priceData!.prices;

// 			// for (const price of tokenPriceData) {
// 			// 	rsi.update(price);
// 			// }

// 			while (true) {
// 				try {
// 					const iterationStartMs = Date.now();
// 					const { quoteTokenAmount, baseTokenAmount } = await getLiquidityValue(
// 						connection,
// 						tokenInfoAndMetadata.pool.id
// 					);
// 					// let currentRSI;

// 					const currentPrice = // current price
// 						quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount;

// 					// priceData.push(currentPrice);
// 					// rsi(priceData);
// 					tokenInfoAndMetadata.priceData!.indicators.rsi.update(currentPrice);
// 					tokenInfoAndMetadata.priceData!.indicators.ema9.update(currentPrice);
// 					tokenInfoAndMetadata.priceData!.indicators.ema12.update(currentPrice);
// 					tokenInfoAndMetadata.priceData!.indicators.ema26.update(currentPrice);
// 					tokenInfoAndMetadata.priceData!.indicators.macd!.update(currentPrice);
// 					const currentRSI = tokenInfoAndMetadata
// 						.priceData!.indicators.rsi.getResult()
// 						.valueOf();
// 					const currentMACD = tokenInfoAndMetadata
// 						.priceData!.indicators.macd!.getResult()
// 						.valueOf();
// 					const currentEMA12 = tokenInfoAndMetadata
// 						.priceData!.indicators.ema12.getResult()
// 						.valueOf();
// 					const currentEMA26 = tokenInfoAndMetadata
// 						.priceData!.indicators.ema26.getResult()
// 						.valueOf();
// 					console.log(
// 						tokenInfoAndMetadata.tokenInfo.symbol,
// 						"RSI:",
// 						currentRSI,
// 						"MACD:",
// 						currentMACD,
// 						"EMA12:",
// 						currentEMA12,
// 						"EMA26:",
// 						currentEMA26
// 					);
// 					// try {
// 					// 	// console.log(rsi.getResult());
// 					// } catch (err) {
// 					// 	// console.log(err);
// 					// }

// 					if (!initialLpChecked) {
// 						purchasePrice = Number(currentPrice.toString()); // initial price
// 						initialSolValue =
// 							Number(purchasePrice.toString()) *
// 							Number(formatAmount / Math.pow(10, 9));
// 						initialLpChecked = true;
// 					}

// 					const currentSolValue =
// 						Number(currentPrice) * Number(formatAmount / Math.pow(10, 9));

// 					// console.log(
// 					// 	tokenInfoAndMetadata.tokenInfo.symbol,
// 					// 	"initial price",
// 					// 	purchasePrice,
// 					// 	// "compute value",
// 					// 	// currentPrice,
// 					// 	"liquidity value",
// 					// 	currentPrice,
// 					// 	"initial sol value",
// 					// 	initialSolValue,
// 					// 	"current sol value",
// 					// 	currentSolValue,
// 					// 	"RSI",
// 					// 	currentRSI
// 					// );

// 					if (lastPrice && currentPrice >= lastPrice * 5) {
// 						console.log("Front run detected");

// 						if (frontRunCounter === 5) {
// 							lastPrice = currentPrice;
// 							frontRunCounter = 0;
// 						} else {
// 							frontRunCounter++;
// 							continue;
// 						}
// 					}

// 					if (currentRSI > 70 && nowMs - rsiLastSet >= 10000) {
// 						rsiAbove80++;
// 						rsiLastSet = Date.now();
// 					}

// 					if (
// 						quoteTokenAmount.value.uiAmount <=
// 						tokenInfoAndMetadata.holdersAndLiquidity.solValue! * 0.5
// 					) {
// 						console.log("RUGGED AFTER BUY", tokenInfoAndMetadata.tokenInfo.symbol);
// 						const swp = await swapTx(
// 							tokenInfoAndMetadata.pool,
// 							tokenAmountHeld,
// 							true,
// 							tokenAmountHeld
// 						);

// 						const sellTransaction = await connection.sendTransaction(swp, [wallet], {
// 							skipPreflight: false,
// 							preflightCommitment: "confirmed"
// 						});

// 						tgBot.sendMessage(CHAT_DATA.chatId, `🧹🧹🧹RUGGED: ${tokenInfo.symbol}🧹🧹🧹`);
// 						return sellTransaction;
// 					}

// 					if (currentPrice / purchasePrice >= 200) {
// 						stopLossValue = (currentPrice / purchasePrice) * 0.8;
// 					} else if (currentPrice / purchasePrice >= 100) {
// 						stopLossValue = (currentPrice / purchasePrice) * 0.75;
// 						// } else if (currentPrice / purchasePrice >= 50) {
// 						// 	stopLossValue = (currentPrice / purchasePrice) * 0.5;
// 						// } else if (currentPrice / purchasePrice >= 25) {
// 						// 	stopLossValue = (currentPrice / purchasePrice) * 0.4;
// 					} else if (currentPrice / purchasePrice >= 1.5) {
// 						stopLossValue = (currentPrice / purchasePrice) * 0.7;
// 					}
// 					// else if (currentPrice / purchasePrice >= 1.5) {
// 					// 	stopLossValue = 1;
// 					// }

// 					if (!allTimeHigh || currentPrice > allTimeHigh) {
// 						allTimeHigh = currentPrice;
// 						console.log(
// 							tokenInfoAndMetadata.pool.baseMint.toString(),
// 							tokenInfoAndMetadata.tokenInfo.symbol,
// 							"New all time high:",
// 							allTimeHigh,
// 							"purchase sol value",
// 							initialSolValue,
// 							"current sol value",
// 							currentSolValue
// 						);
// 					}

// 					// if (
// 					// 	// initialSold &&
// 					// 	nowMs - buyTimeMs > 120000 &&
// 					// 	!limitSellTarget &&
// 					// 	currentPrice <= allTimeHigh * stopLimitValue
// 					// ) {
// 					// 	limitSellTarget = allTimeHigh * 0.6;
// 					// 	console.log(
// 					// 		tokenInfoAndMetadata.pool.baseMint.toString(),
// 					// 		tokenInfoAndMetadata.tokenInfo.symbol,
// 					// 		"Major price drop. Setting limit sell target to:",
// 					// 		limitSellTarget
// 					// 	);
// 					// }

// 					if (
// 						(nowMs - buyTimeMs > 150000 &&
// 							allTimeHigh < purchasePrice * 1.25 &&
// 							currentRSI > 60) ||
// 						samePriceCounter === 8
// 					) {
// 						console.log(tokenInfoAndMetadata.tokenInfo.symbol, "is dead. Selling");
// 						isDead = true;
// 					}

// 					if (
// 						// (currentRSI && currentRSI > 70 && nowMs - buyTimeMs > 110000) ||
// 						(currentRSI && currentRSI >= 90) ||
// 						// currentPrice >= purchasePrice * returnValue ||
// 						(currentPrice <= purchasePrice * stopLossValue &&
// 							currentRSI > 60 &&
// 							nowMs - buyTimeMs > 110000) || // maybe include 2 minute wait time
// 						// currentPrice >= limitSellTarget ||
// 						isDead ||
// 						(rsiAbove80 === 3 && currentPrice >= purchasePrice * 1.9)
// 					) {
// 						const swp = await swapTx(
// 							tokenInfoAndMetadata.pool,
// 							tokenAmountHeld,
// 							true,
// 							tokenAmountHeld
// 						);
// 						const sellTransaction = connection.sendTransaction(swp, [wallet], {
// 							skipPreflight: false,
// 							preflightCommitment: "confirmed"
// 						});

// 						console.log(
// 							"Swapped out of",
// 							tokenInfoAndMetadata.pool.baseMint.toString(),
// 							tokenInfoAndMetadata.tokenInfo.symbol,
// 							"at:",
// 							(currentPrice / purchasePrice).toFixed(2),
// 							"x profit"
// 						);
// 						tgBot.sendMessage(
// 							CHAT_DATA.chatId,
// 							`Sold ${tokenInfo.symbol} for ${(currentPrice / purchasePrice).toFixed(
// 								2
// 							)} return`
// 						);

// 						transactions.push(sellTransaction);
// 						return sellTransaction;
// 					}

// 					if (lastPrice === currentPrice) {
// 						samePriceCounter++;
// 					} else {
// 						samePriceCounter = 0;
// 					}

// 					lastPrice = currentPrice;

// 					if (
// 						(currentPrice <= purchasePrice * stopLossValue &&
// 							currentRSI > 60 && // price has fallen below purchase price - not sure if this is a good idea (rebuys)
// 							nowMs - buyTimeMs > 110000) ||
// 						isDead
// 					) {
// 						return Promise.all(transactions);
// 					}
// 					await wait(500);
// 				} catch (E) {
// 					console.log(E);
// 					if (errorCounter === 10) {
// 						console.log(E);
// 						tgBot.sendMessage(
// 							CHAT_DATA.chatId,
// 							`Could not sell ${tokenInfoAndMetadata.tokenInfo.symbol}`
// 						);

// 						return null;
// 					}

// 					errorCounter++;
// 					await wait(500);
// 				}
// 			}
// 		}
// 	}
// };
