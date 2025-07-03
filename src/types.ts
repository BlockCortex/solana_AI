import { FasterRSI, RSI, FasterATR, ATR, FasterMACD, FasterEMA } from "trading-signals";

export type DextTradingPair = {
	creationBlock: number;
	creationTime: string;
	exchange: {
		name: string;
		factory: string;
	};
	address: string;
	mainToken: TokenInfo;
	sideToken: TokenInfo;
};

export type SwapType = "buy" | "sell";

export type Socials = {
	twitter?: string;
	website?: string;
	telegram?: string;
	description?: string;
};

export type TokenInfo = {
	symbol?: string;
	name?: string;
	baseMint: string;
	quoteMint: string;
	decimals: number;
	address: string;
	owner: string;
	supply?: number;
	deployedViaMetaplex?: boolean;
	isMultiSwapDeployment?: boolean;
};

export type TokenMetadata = {
	account: string;
	onChainAccountInfo: {
		accountInfo: {
			key: string;
			isSigner: boolean;
			isWritable: boolean;
			lamports: 0;
			data: {
				parsed: {
					info: {
						decimals: 0;
						freezeAuthority: string;
						isInitialized: boolean;
						mintAuthority: string;
						supply: string;
					};
					type: string;
				};
				program: string;
				space: 0;
			};
			owner: string;
			executable: boolean;
			rentEpoch: 0;
		};
		error: any;
	};
	onChainMetadata: {
		metadata: {
			key: string;
			mint: string;
			updateAuthority: string;
			data: {
				name: string;
				symbol: string;
				uri: string;
				sellerFeeBasisPoints: 0;
				creators: [
					{
						address: string;
						share: string;
						verified: boolean;
					}
				];
			};
			tokenStandard: string;
			primarySaleHappened: boolean;
			isMutable: boolean;
			editionNonce: 0;
			collection: {
				key: string;
				verified: boolean;
			};
			collectionDetails: {
				size: 0;
			};
			uses: {
				useMethod: string;
				remaining: 0;
				total: 0;
			};
		};
	};
	offChainMetadata: {
		metadata: {
			name: string;
			symbol: string;
			attributes: [
				{
					traitType: string;
					value: string;
				}
			];
			sellerFeeBasisPoints: 0;
			image: string;
			properties: {
				category: string;
				files: [
					{
						uri: string;
						type: string;
					}
				];
				creators: [
					{
						address: string;
						share: string;
					}
				];
			};
			description: string;
			extensions: Record<string, string>;
		};
		uri: string;
	};
	legacyMetadata: {
		chainId: 0;
		address: string;
		symbol: string;
		name: string;
		decimals: 0;
		logoURI: string;
		tags: [string];
		extensions: {};
	};
};

export type TradeData = {
	high: number;
	rsiHigh: number;
	low: number;
	rsiLow: number;
	highCounter: number;
	cooldownInterval: number;
};

export type TokenInfoAndMetadata = {
	tokenInfo: TokenInfo;
	holdersAndLiquidity: {
		top10HoldersTotal?: number;
		topHolderAmount?: number;
		topHolderPercent?: number;
		top10HoldersTotalPercent?: number;
		supplyInLiquidityPercent?: number;
		supplyInLiquidityAmount?: number;
		lpTokensAddress?: string;
		lpTokensAmount?: number;
		solValue?: number;
		liquidityLockedPercent?: number;
	};
	metadata: {
		creator: string;
		isFungible: boolean;
		isMintable: boolean;
		isFrozen: boolean;
		isMutable: boolean;
	};
	socials: Socials;
	transactions: string[];
	pool: any;
	tokenTier?: Tiers;
	tierScore?: number;
	initialSold?: boolean;
	buyPrice?: number;
	ath?: number;
	limitSellTarget?: number;
	customSellTarget?: number;
	timeAddedToLpLockQueue?: number;
	tradeType?: SwapType;
	hasBurntLpTokens?: boolean;
	lastLpBurnCheckTime?: number;
	timeAddedToEntryQueue?: number;
	approvedForPurchase?: boolean;
	priceData?: {
		lastPrice: number | null;
		allTimeHigh: number | null;
		allTimeLow: number | null;
		purchasePrice: number | null;
		bottomConfirmedCounter: number;
		prices: number[];
		indicators: {
			rsi: FasterRSI | RSI;
			atr: FasterATR | ATR;
			// ema12: FasterEMA;
			// ema26: FasterEMA;
			// ema9: FasterEMA;
			// macd: FasterMACD | null;
		};
	};
};

export type MACD = {
	histogram: number;
	macd: number;
	signal: number;
};

export type Tiers = "gem" | "ape" | "degen" | "rug";

export type Environment = "production" | "development";

export type TierValue = {
	amount: number;
	initialSell: number;
	sellPercent: number;
	title: string;
	exit: number;
};

export type PurchaseTiers = {
	[T in Tiers]: TierValue;
};
