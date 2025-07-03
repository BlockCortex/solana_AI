import {
	PublicKey,
	TransactionInstruction,
	Transaction,
	ComputeBudgetProgram,
	SystemProgram
} from "@solana/web3.js";
import { connection, RAYDIUM_ACCOUNT_ADDRESS, wallet } from "./config";
import { AnchorProvider } from "@coral-xyz/anchor";
import { CustomWallet } from "./wallet";
import { BN } from "bn.js";
import * as spl from "@solana/spl-token";
import { getPriorityFeeEstimate } from "./requests";
import { TokenInfoAndMetadata } from "./types";
// const rayV4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
// const provider = new AnchorProvider(connection, new CustomWallet(wallet), {
// 	skipPreflight: true,
// 	commitment: "processed"
// });

export async function swapTx(
	poolKeys,
	swapAmount,
	reverse,
	tokenInfoAndMetadata: TokenInfoAndMetadata,
	minOut
) {
	const priorityFee = await getPriorityFeeEstimate(RAYDIUM_ACCOUNT_ADDRESS.toString());
	const UNITPRICE = ComputeBudgetProgram.setComputeUnitPrice({
		microLamports:
			priorityFee["high"] * 2 > 100000000 ? 100000000 : Math.round(priorityFee["high"] * 2)
	});
	const UNITLIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
	const createBaseAccountTx = spl.createAssociatedTokenAccountIdempotentInstruction(
		wallet.publicKey,
		poolKeys.ownerBaseAta,
		wallet.publicKey,
		poolKeys.baseMint
	);
	const programId = RAYDIUM_ACCOUNT_ADDRESS;

	const account1 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"); // token program
	const account2 = poolKeys.id; // amm id  writable
	const account3 = poolKeys.authority; // amm authority
	const account4 = poolKeys.openOrders; // amm open orders  writable
	const account5 = poolKeys.targetOrders; // amm target orders  writable
	const account6 = poolKeys.baseVault; // pool coin token account  writable  AKA baseVault
	const account7 = poolKeys.quoteVault; // pool pc token account  writable   AKA quoteVault
	const account8 = poolKeys.marketProgramId; // serum program id
	const account9 = poolKeys.marketId; //   serum market  writable
	const account10 = poolKeys.marketBids; // serum bids  writable
	const account11 = poolKeys.marketAsks; // serum asks  writable
	const account12 = poolKeys.marketEventQueue; // serum event queue  writable
	const account13 = poolKeys.marketBaseVault; // serum coin vault  writable     AKA marketBaseVault
	const account14 = poolKeys.marketQuoteVault; //   serum pc vault  writable    AKA marketQuoteVault
	const account15 = poolKeys.marketAuthority; // serum vault signer       AKA marketAuthority
	let account16 = poolKeys.ownerQuoteAta; // user source token account  writable
	let account17 = poolKeys.ownerBaseAta; // user dest token account   writable
	let minimumOut = reverse ? 0 : swapAmount * 0.5; // 0 = 100% slippage

	if (reverse === true) {
		account16 = poolKeys.ownerBaseAta;
		account17 = poolKeys.ownerQuoteAta;
	}

	const account18 = wallet.publicKey; // user owner (signer)  writable
	const args = { amountIn: new BN(swapAmount), minimumAmountOut: new BN(0) };
	const buffer = Buffer.alloc(16);
	args.amountIn.toArrayLike(Buffer, "le", 8).copy(buffer, 0);
	args.minimumAmountOut.toArrayLike(Buffer, "le", 8).copy(buffer, 8);
	const prefix = Buffer.from([0x09]);
	const instructionData = Buffer.concat([prefix, buffer]);

	const accountMetas = [
		{ pubkey: account1, isSigner: false, isWritable: false },
		{ pubkey: account2, isSigner: false, isWritable: true },
		{ pubkey: account3, isSigner: false, isWritable: false },
		{ pubkey: account4, isSigner: false, isWritable: true },
		{ pubkey: account5, isSigner: false, isWritable: true },
		{ pubkey: account6, isSigner: false, isWritable: true },
		{ pubkey: account7, isSigner: false, isWritable: true },
		{ pubkey: account8, isSigner: false, isWritable: false },
		{ pubkey: account9, isSigner: false, isWritable: true },
		{ pubkey: account10, isSigner: false, isWritable: true },
		{ pubkey: account11, isSigner: false, isWritable: true },
		{ pubkey: account12, isSigner: false, isWritable: true },
		{ pubkey: account13, isSigner: false, isWritable: true },
		{ pubkey: account14, isSigner: false, isWritable: true },
		{ pubkey: account15, isSigner: false, isWritable: false },
		{ pubkey: account16, isSigner: false, isWritable: true },
		{ pubkey: account17, isSigner: false, isWritable: true },
		{ pubkey: account18, isSigner: true, isWritable: true }
	];

	const wSolTx = spl.createAssociatedTokenAccountIdempotentInstruction(
		wallet.publicKey,
		poolKeys.ownerQuoteAta,
		wallet.publicKey,
		poolKeys.quoteMint
	);
	const swap = new TransactionInstruction({
		keys: accountMetas,
		programId,
		data: instructionData
	});
	const closeSol = spl.createCloseAccountInstruction(
		poolKeys.ownerQuoteAta,
		wallet.publicKey,
		wallet.publicKey
	);
	const closeAta = spl.createCloseAccountInstruction(
		poolKeys.ownerBaseAta,
		wallet.publicKey,
		wallet.publicKey
	);

	const transaction = new Transaction();
	transaction.add(UNITLIMIT);
	transaction.add(UNITPRICE);
	transaction.add(wSolTx);

	if (reverse === false) {
		transaction.add(
			SystemProgram.transfer({
				fromPubkey: wallet.publicKey,
				toPubkey: poolKeys.ownerQuoteAta,
				lamports: swapAmount
			}),
			spl.createSyncNativeInstruction(poolKeys.ownerQuoteAta)
		); // 10000000 lamports will send 0.01 sol to the ata
	}

	transaction.add(createBaseAccountTx);
	transaction.add(swap);

	if (reverse === false) {
		transaction.add(closeSol);
	} else if (reverse === true) {
		transaction.add(closeSol);
		transaction.add(closeAta);
	}

	transaction.feePayer = wallet.publicKey;
	console.log(transaction)
	return transaction;
}