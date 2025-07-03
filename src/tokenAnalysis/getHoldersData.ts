import { ParsedAccountData } from "@solana/web3.js";
import { RAYDIUM_POOL_ADDRESS } from "../config";
import { getHoldersInfo } from "../requests";
import { TokenInfoAndMetadata } from "../types";
import colors from "colors";

export const getHoldersData = async (token: TokenInfoAndMetadata, retry: number = 0) => {
	try {
		const holdersInfo = await getHoldersInfo(token.tokenInfo.owner, token.tokenInfo.address);

		// console.log(holdersInfo);
		// console.log(holdersInfo[0].account.data);

		if (!holdersInfo) {
			if (retry < 5) {
				return getHoldersData(token, retry + 1);
			}

			throw new Error("Error in 'getHoldersData': Unable to get holders data");
		}

		if (!token.timeAddedToEntryQueue) {
			const isScam = hasScammerSplitTokenAmount(holdersInfo);

			// if (isScam) {
			// 	return null;
			// }
		}

		const holdersInfoSorted = holdersInfo
			.sort(
				(a: any, b: any) =>
					b.account.data.parsed.info.tokenAmount.uiAmount -
					a.account.data.parsed.info.tokenAmount.uiAmount
			)
			.filter(
				(holder: any) => holder.account.data.parsed.info.owner !== RAYDIUM_POOL_ADDRESS
			);
		const holdersTop10 = holdersInfoSorted
			.slice(0, 10)
			.map((holder) => [
				holder.account.data.parsed.info.owner,
				holder.account.data.parsed.info.tokenAmount.uiAmount
			]);

		if (
			holdersTop10.some(
				(holder) => holder[0] === "3XTjsDGhJYpr1NvkpAkS1NF9rB6KDQgupHuzA3QZ1vLW"
			)
		) {
			console.log("Scam account in token holders. Skipping...");
			return null;
		}

		const topHolderAmount = holdersTop10[0][1];
		const topHolderPercent = Math.round((topHolderAmount / token.tokenInfo.supply!) * 100);
		const top10HoldersTotal = holdersTop10.reduce(
			(acc: number, ownerAndAmountHeld: number) => acc + ownerAndAmountHeld[1],
			0
		);
		const top10HoldersTotalPercent = Math.round(
			(top10HoldersTotal / token.tokenInfo.supply!) * 100
		);

		return {
			topHolderAmount,
			topHolderPercent,
			top10HoldersTotal,
			top10HoldersTotalPercent
		};
	} catch (err) {
		if (retry < 5) {
			return getHoldersData(token, retry + 1);
		}

		console.error(err);
		return null;
	}
};

const hasScammerSplitTokenAmount = (holders: any[]) => {
	const tokenAmounts = {};

	for (const holder of holders) {
		if (tokenAmounts.hasOwnProperty(holder.account.data.parsed.info.tokenAmount.uiAmount)) {
			if (holder.account.data.parsed.info.tokenAmount.uiAmount === 0) {
				continue;
			}

			tokenAmounts[
				holder.account.data.parsed.info.tokenAmount.uiAmount
			].numberOfaccountsHolding += 1;
			tokenAmounts[holder.account.data.parsed.info.tokenAmount.uiAmount].holders.push(
				holder.account.data.parsed.info.owner
			);

			if (
				tokenAmounts[holder.account.data.parsed.info.tokenAmount.uiAmount]
					.numberOfaccountsHolding > 2
			) {
				console.log(
					colors.red(
						`${holder.account.data.parsed.info.tokenAmount.uiAmount} tokens held by more than 2 accounts`
					),
					colors.red(tokenAmounts[holder.account.data.parsed.info.tokenAmount.uiAmount])
				);

				return true;
			}
		} else {
			tokenAmounts[holder.account.data.parsed.info.tokenAmount.uiAmount] = {
				numberOfaccountsHolding: 1,
				holders: [holder.account.data.parsed.info.owner]
			};
		}
	}

	// console.log(colors.green(`No exact token amount held by more than 2 accounts`), tokenAmounts);
	return false;
};
