import axios from "axios";
import { TokenMetadata } from "./types";
import { HELIUS_API_KEY } from "./config";

// export const getMultipleTokenPrice = async (tokenAddresses: string[]) => {
// 	try {
// 		const {
// 			data: { data: tokenPrices }
// 		} = await axios(
// 			`https://public-api.birdeye.so/public/multi_price?list_address=${tokenAddresses.join(
// 				","
// 			)}`,
// 			{
// 				method: "GET",
// 				headers: {
// 					"Content-Type": "application/json",
// 					"x-chain": CHAIN,
// 					"X-API-KEY": BIRD_EYE_API_KEY
// 				}
// 			}
// 		);

// 		return tokenPrices;
// 	} catch (err) {
// 		console.error("Error in 'getTokenPrice':", err.response.data);

// 		return null;
// 	}
// };

export const getTokensMetadata = async (
	
	newTokensAddresses: string[]
): Promise<TokenMetadata[] | null> => {
	try {
		// const HELIUS_API_KEY = ''
		const { data: tokensMetadata } = await axios(
			`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
			{
				method: "POST",
				data: {
					mintAccounts: newTokensAddresses,
					includeOffChain: true
				}
			}
		);

		// if (newTokensAddresses.length === 1) {
		// 	return tokensMetadata[0];
		// } else {
		return tokensMetadata;
		// }
	} catch (err) {
		console.error("Error in 'getTokensMetadata':", err.response.data);

		return null;
	}
};

export const getAccountTransactions = async (walletAddress: string, limit: number = 100) => {
	try {
		const { data: transactions } = await axios(
			`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=${limit}&commitment=confirmed`,
			{
				method: "GET"
			}
		);

		// console.log(transactions.length);

		return transactions.reverse();
	} catch (err) {
		console.error("Error in 'getAccountTransactions':", err.response.data);

		return null;
	}
};
export const getPriorityFeeEstimate = async (address: string) => {
	try {
		const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: "1",
				method: "getPriorityFeeEstimate",
				params: [
					{
						accountKeys: [address],
						options: { includeAllPriorityFeeLevels: true }
					}
				]
			})
		});
		const data = await response.json();

		console.log("Response data:", data); // Add this line for logging

		return data.result.priorityFeeLevels;
	} catch (err) {
		console.error("Error in 'getPriorityFeeEstimate':", err);

		return null;
	}
};
// export const getPriorityFeeEstimate = async (address: string) => {
// 	try {
// 		const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
// 			method: "POST",
// 			headers: { "Content-Type": "application/json" },
// 			body: JSON.stringify({
// 				jsonrpc: "2.0",
// 				id: "1",
// 				method: "getPriorityFeeEstimate",
// 				params: [
// 					{
// 						accountKeys: [address],
// 						options: { includeAllPriorityFeeLevels: true }
// 					}
// 				]
// 			})
// 		});
// 		const data = await response.json();

// 		return data.result.priorityFeeLevels;
// 	} catch (err) {
// 		console.error("Error in 'getGasPriceEstimate':", err);

// 		return null;
// 	}
// };

export const getHoldersInfo = async (tokenOwner: string, tokenAccount: string) => {
	try {
		const {
			data: { result: holdersInfo }
		} = await axios(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
			method: "POST",
			data: {
				jsonrpc: "2.0",
				id: 2,
				method: "getProgramAccounts",
				params: [
					tokenOwner,
					{
						encoding: "jsonParsed",
						filters: [
							{
								dataSize: 165
							},
							{
								memcmp: {
									offset: 0,
									bytes: tokenAccount
								}
							}
						]
					}
				]
			}
		});

		return holdersInfo;
	} catch (err) {
		console.error("Error in 'getHoldersInfo':", err.response.data);

		return null;
	}
};
