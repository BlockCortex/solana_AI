// import TelegramBot, { Message } from "node-telegram-bot-api";
// import { GROUP_DATA, SOLANA, TELEGRAM_BOT_API } from "../config";
// import { TokenInfoAndMetadata } from "../types";
// import { PURCHASE_TIERS } from "../utils/tiers";

// export const tgBot = new TelegramBot(TELEGRAM_BOT_API, {
// 	polling: true
// });

// tgBot.on("message", async (data: Message) => {
// 	const message = data.text;

// 	// 	if (data.from.id !== CHAT_DATA.id) {
// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, "Get fukt. You are not authorized to use this bot");
// 	// 	}

// 	// 	if (message === "Help") {
// 	// 		tgBot.sendMessage(
// 	// 			CHAT_DATA.chatId,
// 	// 			`
// 	// Terminate: Stop bot
// 	// Purchased: show tokens that have been purchased
// 	// Sold: show tokens that have been sold
// 	// Held: show tokens that are being held
// 	// Prices: show prices of all purchased tokens
// 	// Auto sell: toggle auto sell on/off

// 	// To hold a token: Hold token <token address>
// 	// To get token purchased token's address: Ca <token symbol>
// 	// To sell a token: Sell <address> <percent (0-1)>
// 	// To set sell target: Set <address> <return>
// 	// `
// 	// 		);
// 	// 	}

// 	// 	if (message === "Purchased") {
// 	// 		if (PURCHASED_TOKENS.length === 0) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "No tokens purchased");
// 	// 		} else {
// 	// 			const purchasedTokens = PURCHASED_TOKENS.map(
// 	// 				(token) =>
// 	// 					`-${token.tokenTier}: ${token.amountBought} ${token.tokenInfo.symbol} ${token.tokenInfo.address}`
// 	// 			).join("\n");

// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "<b>Purchased tokens</b>\n\n" + purchasedTokens, {
// 	// 				parse_mode: "HTML"
// 	// 			});
// 	// 		}
// 	// 		return;
// 	// 	}

// 	// 	if (message === "Held") {
// 	// 		if (HOLD_QUEUE.length === 0) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "No tokens Held");
// 	// 		} else {
// 	// 			const heldTokens = HOLD_QUEUE.map(
// 	// 				(token) =>
// 	// 					`- ${token.tokenTier.toUpperCase()}\n    ${token.tokenInfo.symbol}\n    ${
// 	// 						token.tokenInfo.address
// 	// 					}`
// 	// 			).join("\n");

// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "<b>Held tokens</b>\n\n" + heldTokens, {
// 	// 				parse_mode: "HTML"
// 	// 			});
// 	// 		}
// 	// 		return;
// 	// 	}

// 	// 	// if (message === "Pending") {
// 	// 	// 	if (PENDING_QUEUE.length === 0) {
// 	// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, "No tokens pending");
// 	// 	// 	} else {
// 	// 	// 		const pendingTokens = PENDING_QUEUE.map(
// 	// 	// 			(token) =>
// 	// 	// 				`-${token.tokenTier}: ${token.amountBought} ${token.tokenInfo.symbol} ${token.tokenInfo.address}\n    Transaction: ${token.pendingTransaction}`
// 	// 	// 		).join("\n");

// 	// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, "<b>Pending tokens</b>\n\n" + pendingTokens, {
// 	// 	// 			parse_mode: "HTML"
// 	// 	// 		});
// 	// 	// 	}
// 	// 	// 	return;
// 	// 	// }

// 	// 	if (message === "Sold") {
// 	// 		if (SOLD_TOKENS.length === 0) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "No tokens sold");
// 	// 		} else {
// 	// 			const soldTokens = SOLD_TOKENS.map(
// 	// 				(token) =>
// 	// 					`-${token.tokenTier}: ${token.amountBought} ${token.tokenInfo.symbol} ${token.tokenInfo.address} (${token.return}x)`
// 	// 			).join("\n");
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "<b>Sold tokens</b>\n\n" + soldTokens, {
// 	// 				parse_mode: "HTML"
// 	// 			});
// 	// 		}
// 	// 		return;
// 	// 	}

// 	// 	if (message === "Prices") {
// 	// 		if (PURCHASED_TOKENS.length === 0) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "No tokens bought");

// 	// 			return;
// 	// 		}
// 	// 		const replyArr = [];

// 	// 		for (const purchasedToken of PURCHASED_TOKENS) {
// 	// 			const currPrice = await getTokenPrice(purchasedToken.tokenInfo.address);

// 	// 			replyArr.push(
// 	// 				`- ${
// 	// 					purchasedToken.tokenInfo.symbol
// 	// 				} (${purchasedToken.tokenTier.toUpperCase()})\n    Purchase price: $${
// 	// 					purchasedToken.buyPrice
// 	// 				}\n    Current price: $${currPrice ?? null}\n    Return: ${
// 	// 					currPrice / purchasedToken.buyPrice
// 	// 				}\n
// 	// 				    Initial sold: ${purchasedToken.initialSold}
// 	// 					\n`
// 	// 			);
// 	// 		}

// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, `<b>Token prices</b>\n\n${replyArr.join("\n")}`, {
// 	// 			parse_mode: "HTML"
// 	// 		});
// 	// 		return;
// 	// 	}

// 	// 	const messageArr = message.split(" ");

// 	// 	if (messageArr.includes("Ca")) {
// 	// 		if (messageArr.length !== 2) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, "Invalid token symbol");
// 	// 			return;
// 	// 		}

// 	// 		const tokenSymbol = messageArr[1].toUpperCase();
// 	// 		const token = PURCHASED_TOKENS.find((token) => token.tokenInfo.symbol === tokenSymbol);

// 	// 		if (!token) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, `Could not find token ${tokenSymbol}`);
// 	// 			return;
// 	// 		}

// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, token.tokenInfo.address);
// 	// 		return;
// 	// 	}

// 	// 	if (messageArr.includes("Sell")) {
// 	// 		const address = messageArr[1];
// 	// 		const sellPercentStr = messageArr[2];
// 	// 		const sellPercent = Number(sellPercentStr);

// 	// 		if (sellPercent > 1) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, `Sell percent must be between 0 and 1`);
// 	// 			return;
// 	// 		}

// 	// 		const tokenIndexInQueue = PURCHASED_TOKENS.findIndex(
// 	// 			(t) => t.tokenInfo.address === address
// 	// 		);
// 	// 		if (tokenIndexInQueue === -1) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, `Could not find token ${address}`);
// 	// 			return;
// 	// 		}

// 	// 		const [token] = PURCHASED_TOKENS.splice(tokenIndexInQueue, 1);
// 	// 		const currentPrice = await getTokenPrice(token.tokenInfo.address);
// 	// 		await executeAndAwaitTransaction({
// 	// 			...token,
// 	// 			tradeType: "sell",
// 	// 			amountRemaining: token.amountBought * sellPercent,
// 	// 			return: (currentPrice / token.buyPrice).toFixed(3)
// 	// 		});
// 	// 		// const amountToSell = sellPercent ? token.amountBought * sellPercent : token.amountBought;

// 	// 		// tgBot.sendMessage(CHAT_DATA.chatId, `Sell of ${token.tokenInfo.symbol} queued`);
// 	// 		return;
// 	// 	}

// 	// 	if (messageArr.includes("Set")) {
// 	// 		const tokenAddress = messageArr[1];
// 	// 		const returns = Number(messageArr[2]);
// 	// 		const tokenIndexInQueue = PURCHASED_TOKENS.findIndex(
// 	// 			(t) => t.tokenInfo.address === tokenAddress
// 	// 		);
// 	// 		if (tokenIndexInQueue === -1) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, `Could not find token ${tokenAddress}`);
// 	// 			return;
// 	// 		}
// 	// 		PURCHASED_TOKENS[tokenIndexInQueue].customSellTarget = returns;

// 	// 		tgBot.sendMessage(
// 	// 			CHAT_DATA.chatId,
// 	// 			`Sell target set for ${PURCHASED_TOKENS[tokenIndexInQueue].tokenInfo.symbol}`
// 	// 		);
// 	// 		return;
// 	// 	}

// 	// 	if (messageArr.includes("Hold")) {
// 	// 		const tokenAddress = messageArr[2];
// 	// 		const tokenIndexInQueue = PURCHASED_TOKENS.findIndex(
// 	// 			(token) => token.tokenInfo.address === tokenAddress
// 	// 		);
// 	// 		const token = PURCHASED_TOKENS.splice(tokenIndexInQueue, 1)[0];

// 	// 		if (!token) {
// 	// 			tgBot.sendMessage(CHAT_DATA.chatId, `Could not find token ${tokenAddress}`);
// 	// 			return;
// 	// 		}

// 	// 		HOLD_QUEUE.push(token);

// 	// 		tgBot.sendMessage(CHAT_DATA.chatId, `Token ${token.tokenInfo.symbol} added to hold queue`);
// 	// 		return;
// 	// 	}

// 	// if (message === "Terminate") {
// 	// 	tgBot.sendMessage(CHAT_DATA.chatId, "Terminating bot");
// 	// 	process.exit(0);
// 	// }
// });

// export const sendTokenAlert = (
// 	tokenInfoAndMetadata: TokenInfoAndMetadata,
// 	test: boolean = false
// ) => {
// 	const { tokenTier, holdersAndLiquidity } = tokenInfoAndMetadata;
// 	const hasSocials =
// 		tokenInfoAndMetadata.socials.telegram || tokenInfoAndMetadata.socials.twitter;
// 	const notificationMessage = `
// ${
// 	test
// 		? `<b>THIS IS A TEST</b>\n<b>${PURCHASE_TIERS[tokenTier!].title}</b>`
// 		: `<b>🚀🚀NEW LISTING FOUND🚀🚀</b>`
// }

// <b>NAME</b>
// ${tokenInfoAndMetadata.tokenInfo.name}

// <b>SYMBOL</b>
// ${tokenInfoAndMetadata.tokenInfo.symbol}

// <b>ADDRESS</b>
// ${tokenInfoAndMetadata.tokenInfo.address}

// <b>LIQUIDITY</b>
// ${holdersAndLiquidity.supplyInLiquidityAmount!.toFixed(0)} ${
// 		tokenInfoAndMetadata.tokenInfo.symbol
// 	} / ${holdersAndLiquidity.solValue!.toFixed(0)} ${SOLANA.symbol}

// <b>LIQUIDITY LOCKED</b>
// ${tokenInfoAndMetadata.holdersAndLiquidity.liquidityLockedPercent}%

// <b>CREATOR SHARE</b>
// ${100 - tokenInfoAndMetadata.holdersAndLiquidity.supplyInLiquidityPercent!}%

// <b>TOP HOLDER SHARE</b>
// ${tokenInfoAndMetadata.holdersAndLiquidity.topHolderPercent}%

// <b>TOP 10 HOLDERS TOTAL SHARE</b>
// ${tokenInfoAndMetadata.holdersAndLiquidity.top10HoldersTotalPercent}%
// ${
// 	tokenInfoAndMetadata.holdersAndLiquidity.solValue! < 7
// 		? `\n<b>CAUTION - ${tokenInfoAndMetadata.tokenInfo.symbol} has low liqudity</b>`
// 		: ""
// }
// ${
// 	tokenInfoAndMetadata.metadata.isMutable
// 		? `<b>CAUTION - ${tokenInfoAndMetadata.tokenInfo.symbol} is mutable</b>`
// 		: ""
// }
// ${
// 	!tokenInfoAndMetadata.tokenInfo.isMultiSwapDeployment
// 		? `<b>CAUTION - ${tokenInfoAndMetadata.tokenInfo.symbol} was deployed via DEXLAB</b>`
// 		: `\n✅ ${tokenInfoAndMetadata.tokenInfo.symbol} was manually deployed by a developer`
// }
// ${
// 	hasSocials
// 		? "\n<b>SOCIALS</b>"
// 		: `<b>CAUTION - ${tokenInfoAndMetadata.tokenInfo.symbol} has no socials</b>`
// }
// ${
// 	tokenInfoAndMetadata.socials.telegram
// 		? `<a href='${tokenInfoAndMetadata.socials.telegram}'>TELEGRAM</a>`
// 		: "\n\n"
// }
// ${
// 	tokenInfoAndMetadata.socials.twitter
// 		? `<a href='${tokenInfoAndMetadata.socials.twitter}'>TWITTER</a>`
// 		: "\n\n"
// }
// ${
// 	tokenInfoAndMetadata.socials.website
// 		? `<a href='${tokenInfoAndMetadata.socials.website}'>WEBSITE</a>`
// 		: "\n\n"
// }

// <b>CHART / BUY</b>
// <a href='https://birdeye.so/token/${
// 		tokenInfoAndMetadata.tokenInfo.address
// 	}?chain=solana'>BIRDEYE</a>
// <a href='https://dexscreener.com/solana/${tokenInfoAndMetadata.tokenInfo.address}'>DEXSCREENER</a>
// <a href='https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${
// 		tokenInfoAndMetadata.tokenInfo.address
// 	}'>RAYDIUM SWAP\n</a>
// `;

// 	const notificationMessageFiltered = notificationMessage
// 		.split("\n\n")
// 		.filter((line) => line !== "")
// 		.join("\n\n");

// 	tgBot.sendMessage(GROUP_DATA.id, notificationMessageFiltered, {
// 		parse_mode: "HTML"
// 	});
// };
