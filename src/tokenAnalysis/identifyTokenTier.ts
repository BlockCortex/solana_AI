import { MINIMUM_TIER_SCORE, SOLANA_IN_LIQUIDITY_MINIMUM } from "../config";
import { Tiers, TokenInfoAndMetadata } from "../types";

const tokenAnalysisCriteria = {
	socials: {
		1: 1,
		2: 2,
		3: 5
	},
	liquidity: {
		okay: 1,
		good: 2,
		great: 5
	},
	holders: {
		maxPercentageHeld: 35 // min 65% in supply including unlocked liquidity (add later)
	}
};
const tokenAnalysisValueShare = {
	socials: 12,
	liquidity: 8,
	// liquidityLocked: 4,
	holders: 80
};

export const identifyTokenTier = (
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	solValue: number
): {
	tierScore: number;
	tokenTier: Tiers;
	values: { socialsScore: number; liquidityScore: number; holdersScore: number };
} => {
	try {
		let socialsValue = 0;
		const socialsBonus = 4;

		// console.log(tokenInfoAndMetadata);

		// if (!tokenInfoAndMetadata.tokenInfo.deployedViaMetaplex) {
		// 	console.log("Token not deployed via Metaplex. Skipping...");
		// 	return {
		// 		tierScore: 0,
		// 		tokenTier: "rug",
		// 		values: { socialsScore: 0, liquidityScore: 0, holdersScore: 0 }
		// 	};
		// }

		// if (
		// 	tokenInfoAndMetadata.holdersAndLiquidity.topHolderPercent! > 10 ||
		// 	tokenInfoAndMetadata.holdersAndLiquidity.top10HoldersTotalPercent! > 40
		// ) {
		// 	console.log("Holder data is scammy. Skipping...");
		// 	console.log(tokenInfoAndMetadata.holdersAndLiquidity);
		// 	return {
		// 		tierScore: 0,
		// 		tokenTier: "rug",
		// 		values: { socialsScore: 0, liquidityScore: 0, holdersScore: 0 }
		// 	};
		// }

		const {
			socials: { telegram, twitter, website }
		} = tokenInfoAndMetadata;

		if (website) {
			socialsValue += 1;
		}

		if (telegram) {
			socialsValue += 1;
		}

		if (twitter) {
			socialsValue += 1;
		}

		// if (socialsValue === socialsBonus) {
		// 	socialsValue += 1;
		// }

		const socialsScore = (socialsValue / 5) * tokenAnalysisValueShare.socials;

		let liquidityValue = 0;

		if (solValue >= 10 && solValue < 20) {
			liquidityValue = 2;
		}

		if (solValue >= 20) {
			liquidityValue = 5;
		}

		let unlockedLiqPercent = 0;
		const { liquidityLockedPercent, supplyInLiquidityPercent } =
			tokenInfoAndMetadata.holdersAndLiquidity;

		if (!supplyInLiquidityPercent) {
			// console.log(
			// 	tokenInfoAndMetadata.tokenInfo.symbol,
			// 	tokenInfoAndMetadata.tokenInfo.supply,
			// 	tokenInfoAndMetadata.holdersAndLiquidity
			// );
			// throw new Error("Error in 'identifyTokenTier': supply in liquidity is undefined");
			console.log(
				"Error in 'identifyTokenTier': supply in liquidity percent is undefined",
				tokenInfoAndMetadata.tokenInfo.symbol
			);
			return {
				tierScore: 0,
				tokenTier: "rug",
				values: { socialsScore: 0, liquidityScore: 0, holdersScore: 0 }
			};
		}

		unlockedLiqPercent = liquidityLockedPercent
			? 200 - (supplyInLiquidityPercent + liquidityLockedPercent!)
			: 100 - supplyInLiquidityPercent;

		// if (unlockedLiqPercent > 40) {
		// 	console.log("Unlocked liquidity is too high. Skipping...", unlockedLiqPercent);
		// 	return {
		// 		tierScore: 0,
		// 		tokenTier: "rug",
		// 		values: { socialsScore: 0, liquidityScore: 0, holdersScore: 0 }
		// 	};
		// }
		// } else {
		// 	console.group(
		// 		"LP unlocked - awaiting re-evaluation of",
		// 		tokenInfoAndMetadata.tokenInfo.symbol
		// 	);
		// }

		// const liquidityLockedScore =
		// 	(liquidityLockedValue / 3) * tokenAnalysisValueShare.liquidityLocked;

		const liquidityScore = (liquidityValue / 5) * tokenAnalysisValueShare.liquidity;

		const maximumCreatorShare = 40; // percent
		// const creatorSharePercent = 100 - supplyInLiquidityPercent;
		const holdersScore =
			unlockedLiqPercent > maximumCreatorShare
				? 0
				: ((maximumCreatorShare - unlockedLiqPercent) / maximumCreatorShare) *
				  tokenAnalysisValueShare.holders;

		let tierScore = socialsScore + liquidityScore + holdersScore;

		// console.log(tokenInfoAndMetadata.tokenInfo, tokenInfoAndMetadata.holdersAndLiquidity);
		// console.log("Original:", tierScore);

		if (tierScore > MINIMUM_TIER_SCORE && solValue < SOLANA_IN_LIQUIDITY_MINIMUM) {
			const solThreshholdDifference = SOLANA_IN_LIQUIDITY_MINIMUM - solValue;

			if (solThreshholdDifference <= 2.5) {
				tierScore = tierScore - solThreshholdDifference * 10;
			}
			tierScore = MINIMUM_TIER_SCORE;
			// console.log("Liquidity too low. Setting tier score to minimum", tierScore);
		}

		if (socialsScore === 0) {
			tierScore -= 20;
			// console.log("No socials. Setting tier score to", tierScore);
		}

		// console.log(
		// 	"socialsScore",
		// 	socialsScore,
		// 	socialsValue,
		// 	"liquidityScore",
		// 	liquidityScore,
		// 	"holdersScore",
		// 	holdersScore,
		// 	"tierScore",
		// 	tierScore
		// );

		if (tierScore >= 70) {
			return {
				tierScore,
				tokenTier: "gem",
				values: { socialsScore: socialsValue, liquidityScore, holdersScore }
			};
		}

		if (tierScore >= 50) {
			return {
				tierScore,
				tokenTier: "ape",
				values: { socialsScore: socialsValue, liquidityScore, holdersScore }
			};
		}

		if (tierScore >= MINIMUM_TIER_SCORE) {
			return {
				tierScore,
				tokenTier: "degen",
				values: { socialsScore: socialsValue, liquidityScore, holdersScore }
			};
		}

		return {
			tierScore,
			tokenTier: "rug",
			values: { socialsScore: socialsValue, liquidityScore, holdersScore }
		};
	} catch (err) {
		console.error(err);

		return {
			tierScore: 0,
			tokenTier: "rug",
			values: { socialsScore: 0, liquidityScore: 0, holdersScore: 0 }
		};
	}
};
