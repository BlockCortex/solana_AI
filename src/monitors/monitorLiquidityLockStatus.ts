import { AWAITING_ENTRY, AWAITING_LIQUIDITY_LOCK, DEAD_WALLET, connection } from "../config";
import { getTokensMetadata } from "../requests";
import { findIfLpTokensBurnt } from "../tokenAnalysis/findIfLpTokensBurnt";
import { getHoldersData } from "../tokenAnalysis/getHoldersData";
import { getLiquidityValue } from "../tokenAnalysis/getLiquidityValue";
import { identifyTokenTier } from "../tokenAnalysis/identifyTokenTier";
import { TokenMetadata } from "../types";
import { FasterRSI, RSI, ATR, FasterMACD, FasterEMA } from "trading-signals";
import colors from "colors";

export const monitorLiquidityLockStatus = async () => {
	if (AWAITING_LIQUIDITY_LOCK.length > 0) {
		const now = Date.now();
		const mintableTokens = AWAITING_LIQUIDITY_LOCK.filter(
			(token) => token.metadata.isMintable === true
		).map((token) => token.tokenInfo.address);
		const tokensMetadata =
			mintableTokens.length > 0
				? ((await getTokensMetadata(mintableTokens)) as TokenMetadata[])
				: null;

		for (let i = AWAITING_LIQUIDITY_LOCK.length - 1; i >= 0; i--) {
			if (!AWAITING_LIQUIDITY_LOCK[i].hasOwnProperty("priceData")) {
				AWAITING_LIQUIDITY_LOCK[i].priceData = {
					lastPrice: null,
					allTimeHigh: null,
					allTimeLow: null,
					purchasePrice: null,
					bottomConfirmedCounter: 0,
					prices: [],
					indicators: {
						rsi: new RSI(16),
						atr: new ATR(6)
						// ema9: new FasterEMA(9),
						// ema12: new FasterEMA(12),
						// ema26: new FasterEMA(26),
						// macd: null
					}
				};

				// AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.macd = new FasterMACD(
				// 	AWAITING_LIQUIDITY_LOCK[i].priceData?.indicators.ema12!,
				// 	AWAITING_LIQUIDITY_LOCK[i].priceData?.indicators.ema26!,
				// 	AWAITING_LIQUIDITY_LOCK[i].priceData?.indicators.ema9!
				// );
			}

			try {
				if (now - AWAITING_LIQUIDITY_LOCK[i].timeAddedToLpLockQueue! >= 600000) {
					const [timedOutToken] = AWAITING_LIQUIDITY_LOCK.splice(i, 1);
					console.log("Lp lock timeout:", timedOutToken.tokenInfo.symbol);
					continue;
				}

				const { quoteTokenAmount, baseTokenAmount } = await getLiquidityValue(
					connection,
					AWAITING_LIQUIDITY_LOCK[i].pool.id
				);
				const currentPrice =
					quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount;
				AWAITING_LIQUIDITY_LOCK[i].priceData!.prices.push(currentPrice);
				AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.rsi.update(currentPrice);
				// AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.ema9.update(currentPrice);
				// AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.ema12.update(currentPrice);
				// AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.ema26.update(currentPrice);
				// AWAITING_LIQUIDITY_LOCK[i].priceData!.indicators.macd!.update(currentPrice);

				if (AWAITING_LIQUIDITY_LOCK[i].metadata.isMintable) {
					if (tokensMetadata && tokensMetadata.length > 0) {
						const tokenMetadata = tokensMetadata.find(
							(token: TokenMetadata) =>
								token.onChainMetadata.metadata.mint ===
								AWAITING_LIQUIDITY_LOCK[i].tokenInfo.address
						);

						if (tokenMetadata) {
							const isMintable = !DEAD_WALLET.includes(
								tokenMetadata.onChainAccountInfo.accountInfo.data.parsed.info
									.mintAuthority
							);

							if (isMintable) {
								continue;
							} else {
								console.log(
									"    MINT REVOKED",
									AWAITING_LIQUIDITY_LOCK[i].tokenInfo.symbol
								);
								AWAITING_LIQUIDITY_LOCK[i].metadata.isMintable = false;
							}
						} else {
							console.log("Could not find metadata");
							continue;
						}
					}
				}

				if (AWAITING_LIQUIDITY_LOCK[i].metadata.isMintable) {
					console.log(
						AWAITING_LIQUIDITY_LOCK[i].tokenInfo.symbol,
						"bypassed mint revoke check"
					);
					continue;
				}

				const { holdersAndLiquidity, hasBurntLpTokens } = await findIfLpTokensBurnt(
					AWAITING_LIQUIDITY_LOCK[i]
				);

				if (
					!AWAITING_LIQUIDITY_LOCK[i].lastLpBurnCheckTime ||
					now - AWAITING_LIQUIDITY_LOCK[i].lastLpBurnCheckTime! >= 10000
				) {
					if (quoteTokenAmount.value.uiAmount <= holdersAndLiquidity.solValue! * 0.5) {
						const [ruggedToken] = AWAITING_LIQUIDITY_LOCK.splice(i, 1);
						console.log(
							colors.red("    RUGGED:"),
							ruggedToken.tokenInfo.symbol,
							ruggedToken.tokenInfo.address
						);
						continue;
					}

					AWAITING_LIQUIDITY_LOCK[i].lastLpBurnCheckTime = Date.now();
				}

				if (hasBurntLpTokens) {
					const holdersData = await getHoldersData(AWAITING_LIQUIDITY_LOCK[i]);

					if (!holdersData || holdersAndLiquidity.liquidityLockedPercent! < 60) {
						const [scamToken] = AWAITING_LIQUIDITY_LOCK.splice(i, 1);
						console.log(
							"Rug detected",
							scamToken.tokenInfo.symbol,
							"locked LP percent:",
							holdersAndLiquidity.liquidityLockedPercent
						);
						continue;
					}

					AWAITING_LIQUIDITY_LOCK[i] = {
						...AWAITING_LIQUIDITY_LOCK[i],
						holdersAndLiquidity: {
							...holdersAndLiquidity,
							...holdersData
						},
						hasBurntLpTokens
					};

					const { tierScore, tokenTier, values } = identifyTokenTier(
						AWAITING_LIQUIDITY_LOCK[i],
						AWAITING_LIQUIDITY_LOCK[i].holdersAndLiquidity.solValue!
					);
					console.log("After:", AWAITING_LIQUIDITY_LOCK[i].tokenTier);

					const ownerHoldsUnder40Percent = values.holdersScore >= 0; // check token distrubution AFTER lock

					if (!ownerHoldsUnder40Percent) {
						const [scamToken] = AWAITING_LIQUIDITY_LOCK.splice(i, 1);
						console.log(
							"Rug detected",
							scamToken.tokenInfo.symbol,
							"locked LP percent:",
							holdersAndLiquidity.liquidityLockedPercent
						);
						continue;
					}

					AWAITING_LIQUIDITY_LOCK[i].tokenTier = tokenTier;
					AWAITING_LIQUIDITY_LOCK[i].tierScore = tierScore;
					AWAITING_LIQUIDITY_LOCK[i].hasBurntLpTokens = true;

					const [tokenAwaitingEntry] = AWAITING_LIQUIDITY_LOCK.splice(i, 1);
					console.log(tokenAwaitingEntry.tokenInfo.symbol, "AWAITING BUY ENTRY");

					AWAITING_ENTRY.push({
						...tokenAwaitingEntry,
						timeAddedToEntryQueue: Date.now()
					});

					continue;
				}
			} catch (err) {
				console.error(err);
			}
		}
	}
};
