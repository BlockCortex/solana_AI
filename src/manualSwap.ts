import {
	PublicKey,
	TransactionInstruction,
	Transaction,
	ComputeBudgetProgram,
	SystemProgram, TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import { connection, RAYDIUM_ACCOUNT_ADDRESS, wallet } from "./config";
import { AnchorProvider } from "@coral-xyz/anchor";
import { CustomWallet } from "./wallet";
import { BN } from "bn.js";
import * as spl from "@solana/spl-token";
import { getPriorityFeeEstimate } from "./requests";
import { TokenInfoAndMetadata } from "./types";
import { FAUNA_API_KEY } from "./config";
import { query as q, Client } from 'faunadb';
const api_key = FAUNA_API_KEY;
const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });
import { createBurnCheckedInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import {swapie} from './swap'
// const rayV4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
// const provider = new AnchorProvider(connection, new CustomWallet(wallet), {
// 	skipPreflight: true,
// 	commitment: "processed"
// });
interface PredictionData {
	pair_address: string;
	score: string;
	liquidity_prediction: string;
	rating: string;
	side: string;
	price: string;
	price_prediction: string;
	amount: string;
	balance:string;
	effective_price:string;
    baseMint: string;
	quoteMint: string;

	// amountOut:string;
}
interface LiquidityData {
	id: string;
	ownerBaseAta: string;
	baseMint: string;
	authority: string;
	openOrders: string;
	targetOrders: string;
	baseVault: string;
	quoteVault: string;
	marketProgramId: string;
	marketId: string;
	marketBids: string;
	marketAsks: string;
	marketEventQueue: string;
	marketBaseVault: string;
	marketQuoteVault: string;
	marketAuthority: string;
	ownerQuoteAta: string;
	quoteMint: string;
	pool: string;
	programId: string;
}
function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function swapTx(
	// poolKeys,
	// swapAmount,
	reverse,
	// liquid

) {
	while (true) {
		await sleep(9000)
		try {
			const PredictionData: { data: PredictionData[] } = await client.query(
				q.Map(
					q.Paginate(q.Match(q.Index('predictions_by_id'))),
					q.Lambda('lp', q.Get(q.Var('lp')))
				)
			);
			// const LiquidityData: { data: LiquidityData[] } = await client.query(
			// 	q.Map(
			// 		q.Paginate(q.Match(q.Index('lpV2_by_id'))),
			// 		q.Lambda('lp', q.Get(q.Var('lp')))
			// 	)
			// )

			const transactions = [];
			// LiquidityData.data.forEach(async (doc1: any) => {
			// 	try {
					// const id = doc.data.tokenInfoAndMetadata.pool.id;
					const id = "2RFBM2nLrG985gV5TNB7SHnKg5D1zZnuaohawjYtFw5Y";
                    const authority = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
                    const openOrders = "GM7q6UEdt13rSLv2g2E7hRLcQt5GoA5ou8Qu8SRtYxmN";
                    const targetOrders = "7NV8EvjYnA7cjLKyBcc1vVDL3DCk1QtPmu7qAJsvGKbc";
					const baseVault = "B75DTKQiEPguSWFxYN3uA1d62aro1kA2nK6jbZ7GFuKs";
					const quoteVault = "BievQzf2a321d7WVSB4vS73io1iwoWhC38WRDzZH4ZFm"
					const marketProgramId = "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX";
					const marketId = "4dHv4NefEKVL2MPvTvDGfRVYgHKBN2DUq5MiXsmQTgPN";
					const marketBids = "VRpbCZzYyud9erSfgpdp8bBsWzWfsnT276hzHreFX9t";
					const marketAsks = "4yMEpXUJhMtTQwGFTmBSL4c3jeWLNHusFK8YGtG4NpjV";
					const marketEventQueue = "14VXU8tPrEYLrZs8spz86L3xgbsMXbRvFbUzmCqErELn";
					const marketBaseVault = "FM2Wi2JaPwMizHKLnTQdi8LiQf4b9VvkZKixK9wLHVaq";
					const marketQuoteVault = "GrdqyRUPtG78FJhoh4ezza9h6K2jNQacpMkarZqpbGtK";
					const marketAuthority = "EpT9kuRMvDye3CM4zevBj3kNxRnM2NgU1rHnG14HMsGm";
					const ownerQuoteAta = "9JfzJRx7P4XdjXwXuTzQtv8ZrMLJN5n7yKYP3Z3voXP3";
                    const ownerBaseAta = "HnJeU1pZX3m8u9SEKy8gw41jjC2BDYWX5Mr8FsWhc58K";

					PredictionData.data.forEach(async (doc: any) => {
						try {
							// const id = doc.data.tokenInfoAndMetadata.pool.id;
							const pair_address = doc.data.pair_address;
							const score = doc.data.score;
							const liquidityPrediction = doc.data.liquidity_prediction;
							const baseMint = doc.data.baseMint;
                            const quoteMint = doc.data.quoteMint;
							const amount = doc.data.amount;
							const balance = doc.data.balance;
							const effectivePrice = doc.data.effective_price;
							// const amountOut = doc.data.amountOut;

							const rating = doc.data.rating;
							const side = doc.data.side;
							const price = doc.data.price;
							const pricePrediction = doc.data.price_prediction;
							// if (liquidityPrediction > 1000 && pricePrediction >= price) {
								// swapie
								// console.log(`baseMint: ${baseMint}, baseMint0: ${baseMint0}`);

								const priorityFee = await getPriorityFeeEstimate(RAYDIUM_ACCOUNT_ADDRESS.toString());
								const UNITPRICE = ComputeBudgetProgram.setComputeUnitPrice({
									microLamports:
										priorityFee["high"] * 2 > 100000000 ? 100000000 : Math.round(priorityFee["high"] * 2)
								});
								const UNITLIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
								const createBaseAccountTx = spl.createAssociatedTokenAccountIdempotentInstruction(
									wallet.publicKey,
									new PublicKey(ownerBaseAta),
									wallet.publicKey,
									new PublicKey(baseMint)
								);
								// const MINT_ADDRESS = pool; // USDC-Dev from spl-token-faucet.com | replace with the mint you would like to burn
								const MINT_DECIMALS = 9; // Value for USDC-Dev from spl-token-faucet.com | replace with the no. decimals of mint you would like to burn
								const BURN_QUANTITY = 1000000000000; // Number of tokens to burn (feel free to replace with any number - just make sure you have enough)
								const programId = RAYDIUM_ACCOUNT_ADDRESS;

								const account1 = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"); // token program
								const account2 = new PublicKey(id);
								const account3 = new PublicKey(authority);
								const account4 = new PublicKey(openOrders);
								const account5 = new PublicKey(targetOrders);
								const account6 = new PublicKey(baseVault);
								const account7 = new PublicKey(quoteVault);
								const account8 = new PublicKey(marketProgramId);
								const account9 = new PublicKey(marketId);
								const account10 = new PublicKey(marketBids);
								const account11 = new PublicKey(marketAsks);
								const account12 = new PublicKey(marketEventQueue);
								const account13 = new PublicKey(marketBaseVault);
								const account14 = new PublicKey(marketQuoteVault);
								const account15 = new PublicKey(marketAuthority);
								let account16 = new PublicKey(ownerQuoteAta);
								let account17 = new PublicKey(ownerBaseAta);
								// let minimumOut = reverse ? 0 : amount * 0.5; // 0 = 100% slippage

								if (side === 'Sell') {
									account16 = new PublicKey(ownerBaseAta);
									account17 = new PublicKey(ownerQuoteAta);
								}

								const account18 = wallet.publicKey; // user owner (signer)  writable
								const args = { amountIn: new BN(amount), minimumAmountOut: new BN(0) };
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
								console.log('swapping')
								sleep(500)
								const wSolTx = spl.createAssociatedTokenAccountIdempotentInstruction(
									wallet.publicKey,
									new PublicKey(ownerQuoteAta),
									wallet.publicKey,
									new PublicKey(quoteMint),
								);
								const swap = new TransactionInstruction({
									keys: accountMetas,
									programId,
									data: instructionData
								});
								sleep(500)
								const closeSol = spl.createCloseAccountInstruction(
									new PublicKey(ownerQuoteAta),
									wallet.publicKey,
									wallet.publicKey
								);
								const closeAta = spl.createCloseAccountInstruction(
									new PublicKey(ownerBaseAta),
									wallet.publicKey,
									wallet.publicKey
								);
								sleep(500)
								const transaction = new Transaction();
								// await transaction.add(closeSol);
								// await transaction.add(closeAta);
								// await transaction.add(closeSol);
								await transaction.add(UNITLIMIT);
								await transaction.add(UNITPRICE);
								await transaction.add(wSolTx);
								sleep(500)
								const blockhash = await connection.getRecentBlockhash();
								// const blockhash = await connection.getRecentBlockhash();
								transaction.recentBlockhash = blockhash.blockhash;
								if (side === 'Buy') {
									console.log('BUYING')
									console.log('BUYING')
									console.log('BUYING')
									console.log('BUYING')

									await transaction.add(
										SystemProgram.transfer({
											fromPubkey: wallet.publicKey,
											toPubkey: new PublicKey(ownerQuoteAta),
											lamports: amount
										}),
										spl.createSyncNativeInstruction(new PublicKey(ownerQuoteAta))
									); // 10000000 lamports will send 0.01 sol to the ata
								}

								await transaction.add(createBaseAccountTx);
								await transaction.add(swap);

								if (side === 'Buy') {
									await transaction.add(closeSol);
									console.log('target predictions hit for swap')
									console.log(`Amount: ${amount}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);
	
									sleep(500)
									// console.log(`Step 2 - Create Burn Instructions`);
									// const burnIx = createBurnCheckedInstruction(
									// 	new PublicKey(ownerBaseAta),
									// 	new PublicKey(MINT_ADDRESS), // Public Key of the Token Mint Address
									// 	wallet.publicKey, // Public Key of Owner's Wallet
									// 	BURN_QUANTITY, // Number of tokens to burn
									// 	MINT_DECIMALS // Number of Decimals of the Token Mint
									// );
									// console.log(`    ✅ - Burn Instruction Created`);
									// // Step 3 - Fetch Blockhash
									// console.log(`Step 3 - Fetch Blockhash`);
									// const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
									// console.log(`    ✅ - Latest Blockhash: ${blockhash}`);
									// console.log(`Step 4 - Assemble Transaction`);
									// const messageV0 = new TransactionMessage({
									// 	payerKey: wallet.publicKey,
									// 	recentBlockhash: blockhash,
									// 	instructions: [burnIx]
									// }).compileToV0Message();
									// const transaction1 = new VersionedTransaction(messageV0);
									// transaction1.sign([wallet]);
									// console.log(`    ✅ - Transaction Created and Signed`);
									// console.log(`Step 5 - Execute & Confirm Transaction`);
									// const txid = await connection.sendTransaction(transaction1);
									// console.log("    ✅ - Transaction sent to network");
									// const confirmation = await connection.confirmTransaction({
									// 	signature: txid,
									// 	blockhash: blockhash,
									// 	lastValidBlockHeight: lastValidBlockHeight
									// });
									// console.log(confirmation)
									// await transaction.add(closeSol);
								} 
								// else
								
								if (side === 'Sell'){
									console.log('SELLING')
									await transaction.add(closeSol);
									console.log('target predictions hit for swap')
									console.log(`Amount: ${amount}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);
	
									// await transaction.add(closeAta);
								}
								// if (side === 'Sell') {
								// 	await transaction.add(closeSol);
								// 	sleep(500)
								// 	// console.log(`Step 2 - Create Burn Instructions`);
								// 	const burnIx = createBurnCheckedInstruction(
								// 		new PublicKey(ownerBaseAta),
								// 		new PublicKey(MINT_ADDRESS), // Public Key of the Token Mint Address
								// 		wallet.publicKey, // Public Key of Owner's Wallet
								// 		BURN_QUANTITY, // Number of tokens to burn
								// 		MINT_DECIMALS // Number of Decimals of the Token Mint
								// 	);
								// 	console.log(`    ✅ - Burn Instruction Created`);
								// 	// Step 3 - Fetch Blockhash
								// 	console.log(`Step 3 - Fetch Blockhash`);
								// 	const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
								// 	console.log(`    ✅ - Latest Blockhash: ${blockhash}`);
								// 	console.log(`Step 4 - Assemble Transaction`);
								// 	const messageV0 = new TransactionMessage({
								// 		payerKey: wallet.publicKey,
								// 		recentBlockhash: blockhash,
								// 		instructions: [burnIx]
								// 	}).compileToV0Message();
								// 	const transaction1 = new VersionedTransaction(messageV0);
								// 	transaction1.sign([wallet]);
								// 	console.log(`    ✅ - Transaction Created and Signed`);
								// 	// Step 5 - Execute & Confirm Transaction 
								// 	console.log(`Step 5 - Execute & Confirm Transaction`);
								// 	const txid = await connection.sendTransaction(transaction1);
								// 	console.log("    ✅ - Transaction sent to network");
								// 	const confirmation = await connection.confirmTransaction({
								// 		signature: txid,
								// 		blockhash: blockhash,
								// 		lastValidBlockHeight: lastValidBlockHeight
								// 	});
								// 	await confirmation;
								// 	console.log(confirmation)
								// }
								transaction.feePayer = wallet.publicKey;
								// console.log(transaction)
								console.log(transaction)
								console.log('sending transaction')
								connection.sendTransaction(transaction, [wallet], {
									skipPreflight: true,
									preflightCommitment: "confirmed"
								});
								console.log('transaction sent')
								console.log('swap finished')
								sleep(500)
								return transaction;
							// }
							sleep(500)
						} catch (error) {
							console.error('Error processing liquidity data:', error);
						}


					});
				// } catch (error) {
				// 	console.error('Error reading Liquidity data from FaunaDB:', error);
				// 	return [];
				// }
			// });
		} catch (error) {
			console.error('Error reading Liquidity data from FaunaDB:', error);
			return [];
		}
	}
}
// swapTx(690000, false) //2500000000 =.25SOL 539000000=539 tokens 10000000000= $1 100000000 =10 10tokens> 75000000000000=75mil tokens > 100000000000000=100mil tokens
// swapie()
swapTx(false)
