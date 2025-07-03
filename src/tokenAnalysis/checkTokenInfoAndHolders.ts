import { DEAD_WALLET, ERRORS } from "../config";
import { Socials, TokenMetadata } from "../types";
import { query as q, Client } from 'faunadb';
import React, { useState, useEffect } from 'react';
// import React, { useState, useEffect } from 'react';
import { FAUNA_API_KEY } from "../config";

const api_key = FAUNA_API_KEY
// const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });
export const checkTokenInfoAndHolders = (tokenMetadata: TokenMetadata, pool: any) => {
	try {
		if (
			ERRORS.includes(tokenMetadata.onChainAccountInfo.error) ||
			tokenMetadata.offChainMetadata.metadata === null
		) {
			return null;
		}

		const tokenSymbol = tokenMetadata.offChainMetadata.metadata.symbol;
		const tokenName = tokenMetadata.offChainMetadata.metadata.name;
		const owner = tokenMetadata.onChainAccountInfo.accountInfo.owner;
		const socials = findSocials(
			tokenMetadata.offChainMetadata.metadata.description,
			tokenMetadata.offChainMetadata.metadata.extensions
		);
		const isMintable = !DEAD_WALLET.includes(
			tokenMetadata.onChainAccountInfo.accountInfo.data.parsed.info.mintAuthority
		);
		const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });


		console.log(
			"\nProcessing token:",
			tokenSymbol,
			pool.address,
			"created by",
			tokenMetadata.onChainMetadata.metadata.updateAuthority
		);

		// client.query(
		// 	q.Create(
		// 		q.Collection('deployed'),
		// 		{ data: {Symbol:tokenSymbol, tokenA: pool.address, creator: tokenMetadata.onChainMetadata.metadata.updateAuthority} }
		// 	)
		// );
	



		const tokenInfoResAndMetadata = {
			tokenInfo: {
				baseMint: pool.baseMint.toString(),
				quoteMint: pool.quoteMint.toString(),
				decimals: pool.baseDecimals,
				address: pool.address,
				name: tokenName,
				symbol: tokenSymbol,
				deployedViaMetaplex: false,
				owner,
				isMultiSwapDeployment: undefined
			},
			holdersAndLiquidity: {
				top10HoldersTotal: undefined,
				topHolderAmount: undefined,
				topHolderPercent: undefined,
				top10HoldersTotalPercent: undefined,
				supplyInLiquidityPercent: undefined,
				supplyInLiquidityAmount: undefined,
				lpTokensAddress: undefined,
				lpTokensAmount: undefined,
				solValue: undefined,
				liquidityLockedPercent: undefined
			},
			metadata: {
				creator: tokenMetadata.onChainMetadata.metadata.updateAuthority,
				isFungible: tokenMetadata.onChainMetadata.metadata.tokenStandard === "Fungible",
				isMintable,
				isFrozen:
					tokenMetadata.onChainAccountInfo.accountInfo.data.parsed.info
						.freezeAuthority !== "",
				isMutable: tokenMetadata.onChainMetadata.metadata.isMutable
			},
			socials: {
				...socials,
				description: tokenMetadata.offChainMetadata.metadata.description
			},
			transactions: [],
			pool: undefined,
			tokenTier: undefined,
			tierScore: undefined,
			initialSold: false,
			buyPrice: undefined,
			ath: undefined,
			limitSellTarget: undefined,
			customSellTarget: undefined,
			approvedForPurchase: false
		};
		client.query(
			q.Create(
				q.Collection('monitor'),
				{ data: {Symbol:tokenSymbol, baseMint:pool.baseMint.toString(),pool: pool.address, creator: tokenMetadata.onChainMetadata.metadata.updateAuthority,tokenInfoAndMetadata:tokenInfoResAndMetadata} }
			)
		);
		return tokenInfoResAndMetadata;
		
	} catch (err) {
		console.error("Error in 'createTokensDictionary:", err);

		return null;
	}
};

const findSocials = (description: string, extensions: Record<string, string>) => {
	const socials: Socials = {
		twitter: undefined,
		telegram: undefined,
		website: undefined,
		description: undefined
	};

	if (extensions) {
		if (extensions.hasOwnProperty("twitter") || extensions.hasOwnProperty("x")) {
			socials.twitter = extensions.twitter;
		}

		if (extensions.hasOwnProperty("telegram")) {
			socials.telegram = extensions.telegram;
		}

		if (extensions.hasOwnProperty("website")) {
			socials.website = extensions.website;
		}
	}

	if (!description || description === "") {
		return socials;
	}

	const descriptionArr = description.split(/[" "|\n]/);

	for (let i = descriptionArr.length - 1; i >= 0; i--) {
		const wordArr = descriptionArr[i].split("/");

		if (!socials.telegram && wordArr.includes("t.me")) {
			socials.telegram = descriptionArr.splice(i, 1)[0].replace(/[( | )]/, "");
			continue;
		}

		if ((!socials.twitter && wordArr.includes("twitter.com")) || wordArr.includes("x.com")) {
			socials.twitter = descriptionArr.splice(i, 1)[0].replace(/[( | )]/, "");
			continue;
		}
	}

	for (let i = descriptionArr.length - 1; i >= 0; i--) {
		const wordArr = descriptionArr[i].split(/[.|/]/);

		if ((!socials.website && wordArr.includes("https:")) || wordArr.includes("www")) {
			socials.website = descriptionArr.splice(i, 1)[0];
			break;
		}
	}
	

	return socials;
};
