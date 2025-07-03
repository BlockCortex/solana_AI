import { PurchaseTiers } from "src/types";
import { ENVIRONMENT } from "src/config";

export const PURCHASE_TIERS: PurchaseTiers = {
	gem: {
		amount: ENVIRONMENT === "production" ? 0.001 * 10 ** 9 : 0.001 * 10 ** 9,
		initialSell: 3,
		sellPercent: 0.33,
		title: "💎💎💎GEM PLAY FOUND💎💎💎",
		exit: 10
	},
	ape: {
		amount: ENVIRONMENT === "production" ? 0.001 * 10 ** 9 : 0.001 * 10 ** 9,
		initialSell: 2,
		sellPercent: 0.5,
		title: "🦍🦍🦍APE PLAY FOUND🦍🦍🦍",
		exit: 10
	},
	degen: {
		amount: ENVIRONMENT === "production" ? 0.001 * 10 ** 9 : 0.001 * 10 ** 9,
		initialSell: 2,
		sellPercent: 0.5,
		title: "🐸🐸🐸DEGEN PLAY FOUND🐸🐸🐸",
		exit: 10
	},
	rug: {
		amount: ENVIRONMENT === "production" ? 0.001 * 10 ** 9 : 0.001 * 10 ** 9,
		initialSell: 2,
		sellPercent: 1,
		title: "🧹🧹🧹RUG PLAY FOUND🧹🧹🧹",
		exit: 2
	}
};
