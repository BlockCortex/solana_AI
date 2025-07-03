import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
	TokenAccount,
	SPL_ACCOUNT_LAYOUT,
	LIQUIDITY_STATE_LAYOUT_V4
} from "@raydium-io/raydium-sdk";
import { wait } from "../utils/tools";

export const getLiquidityValue = async (
	connection: Connection,
	pairId: PublicKey,
	retry: number = 0
) => {
	try {
		const tokenAccountRes = await connection.getAccountInfo(pairId);

		if (!tokenAccountRes) {
			return;
		}

		const { tokenAccounts, poolState } = await getTokenAmounts(
			connection,
			tokenAccountRes.data
		);
		const baseDecimal = 10 ** poolState.baseDecimal.toNumber();
		const baseTokenAmount = await connection.getTokenAccountBalance(poolState.baseVault);
		const quoteTokenAmount = await connection.getTokenAccountBalance(poolState.quoteVault);
		// const addedLpAccount = tokenAccounts.find((a) =>
		// 	a.accountInfo.mint.equals(poolState.lpMint)
		// );
		// const addedLp = (addedLpAccount?.accountInfo.amount.toNumber() || 0) / baseDecimal;

		return {
			baseTokenAmount,
			quoteTokenAmount
			// addedLp
		};
	} catch (err) {
		if (retry < 3) {
			await wait(500);
			return await getLiquidityValue(connection, pairId, retry + 1);
		}

		return null;
	}
};

export const getTokenAmounts = async (connection: Connection, tokenAccountInfo: Buffer) => {
	const owner = new PublicKey("VnxDzsZ7chE88e9rB6UKztCt2HUwrkgCTx8WieWf5mM");
	const tokenAccounts = await getTokenAccounts(connection, owner);
	const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(tokenAccountInfo);

	return {
		tokenAccounts,
		poolState
	};
};

const getTokenAccounts = async (connection: Connection, owner: PublicKey) => {
	const tokenResp = await connection.getTokenAccountsByOwner(owner, {
		programId: TOKEN_PROGRAM_ID
	});

	const accounts: TokenAccount[] = [];
	for (const { pubkey, account } of tokenResp.value) {
		accounts.push({
			pubkey,
			programId: TOKEN_PROGRAM_ID,
			accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data)
		});
	}

	return accounts;
};
