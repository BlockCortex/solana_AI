import {
	PublicKey,
	TransactionInstruction,
	Transaction,
	ComputeBudgetProgram,
	SystemProgram, TransactionMessage, VersionedTransaction,
Keypair,sendAndConfirmTransaction,} from "@solana/web3.js";
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
import { createBurnCheckedInstruction, TOKEN_PROGRAM_ID, getAssociatedTokenAddress,getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { send } from "process";
import * as borsh from 'borsh';

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
	swapAmount,
	reverse,

) {
	while (true) {
		sleep(500)
		try {
			const PredictionData: { data: PredictionData[] } = await client.query(
				q.Map(
					q.Paginate(q.Match(q.Index('predictions_by_id'))),
					q.Lambda('lp', q.Get(q.Var('lp')))
				)
			);
			const LiquidityData: { data: LiquidityData[] } = await client.query(
				q.Map(
					q.Paginate(q.Match(q.Index('lpV2_by_id'))),
					q.Lambda('lp', q.Get(q.Var('lp')))
				)
			)

			const transactions = [];
			LiquidityData.data.forEach(async (doc1: any) => {
				try {
					// const id = doc.data.tokenInfoAndMetadata.pool.id;
					const id = doc1.data.id; //pair_address
					const ownerBaseAta = doc1.data.ownerBaseAta;
					const baseMint = doc1.data.baseMint;
					const authority = doc1.data.authority;
					const openOrders = doc1.data.openOrders;
					const targetOrders = doc1.data.targetOrders;
					const baseVault = doc1.data.baseVault;
					const quoteVault = doc1.data.quoteVault;
					const marketProgramId = doc1.data.marketProgramId;
					const marketId = doc1.data.marketId;
					const marketBids = doc1.data.marketBids;
					const marketAsks = doc1.data.marketAsks;
					const marketEventQueue = doc1.data.marketEventQueue;
					const marketBaseVault = doc1.data.marketBaseVault;
					const marketQuoteVault = doc1.data.marketQuoteVault;
					const marketAuthority = doc1.data.marketAuthority;
					const ownerQuoteAta = doc1.data.ownerQuoteAta;
					const quoteMint = doc1.data.quoteMint;
					const pool = doc1.data.pool;

					PredictionData.data.forEach(async (doc: any) => {
						try {
							// const id = doc.data.tokenInfoAndMetadata.pool.id;
							const pair_address = doc.data.pair_address;
							const score = doc.data.score;
							const liquidityPrediction = doc.data.liquidity_prediction;
							// const baseMint = doc.data.baseMint0;
							// const baseMint = doc.data.baseMint;
							const amount = doc.data.amount;

							const rating = doc.data.rating;
							const side = doc.data.side;
							const price = doc.data.price;
							const pricePrediction = doc.data.price_prediction;
							if (liquidityPrediction > 1000 && pricePrediction >= price) {
								console.log('target predictions hit for swap')
								// console.log(`Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);
								// console.log(`baseMint: ${baseMint}, baseMint0: ${baseMint0}`);

								const priorityFee = await getPriorityFeeEstimate(RAYDIUM_ACCOUNT_ADDRESS.toString());
								const UNITPRICE = ComputeBudgetProgram.setComputeUnitPrice({
									microLamports:
										priorityFee["high"] * 2 > 100000000 ? 100000000 : Math.round(priorityFee["high"] * 2)
								});
								const UNITLIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
								const tokenMintAddress = new PublicKey(baseMint) // SRM tokenMintAddress
								const createBaseAccountTx = await spl.createAssociatedTokenAccountIdempotentInstruction(
									wallet.publicKey,
									new PublicKey(ownerBaseAta),
									wallet.publicKey,
									new PublicKey(baseMint)
								);
								const MINT_ADDRESS = pool; // USDC-Dev from spl-token-faucet.com | replace with the mint you would like to burn
								const MINT_DECIMALS = 6; // Value for USDC-Dev from spl-token-faucet.com | replace with the no. decimals of mint you would like to burn
								const BURN_QUANTITY = 100000000; // Number of tokens to burn (feel free to replace with any number - just make sure you have enough)
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
								
								console.log('swapping')
								// const senderTokenAccountAddress = await getAssociatedTokenAddress(
								// 	baseMint,
								// 	wallet.publicKey
								//   )
								// console.log(senderTokenAccountAddress)
								
								//   const receiverTokenAccountAddress = await getAssociatedTokenAddress(
								// 	baseMint,
								// 	wallet.publicKey
								//   )
								//   console.log(`ownerQuotATA: ${ownerQuoteAta}`)
								//   console.log(`Sender Token Account: ${senderTokenAccountAddress}`)
								//   if (senderTokenAccountAddress !==ownerQuoteAta)
								// 	{console.log('skipping')}
								class GreetingAccount {
									counter = 0;
									constructor(fields: {counter: number} | undefined = undefined) {
									  if (fields) {
										this.counter = fields.counter;
									  }
									}
								  }
								  const GreetingSchema = new Map([
									[GreetingAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
								  ]);
								  const GREETING_SIZE = borsh.serialize(
									GreetingSchema,
									new GreetingAccount(),
								  ).length;
								  const GREETING_SEED = 'tap in';
								  const greetedPubkey = await PublicKey.createWithSeed(
									wallet.publicKey,
									GREETING_SEED,
									programId,
								  );
								  const greetedAccount = await connection.getAccountInfo(greetedPubkey);
								  if (greetedAccount === null) {
								
								sleep(500)
								// const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
								// 	connection,
								// 	wallet,
								// 	tokenMintAddress,
								// 	wallet.publicKey
								// );
								// console.log(senderTokenAccount)
								console.log(
									'Creating account',
									greetedPubkey.toBase58(),
									'to say hello to',
								  );
								  const lamports = await connection.getMinimumBalanceForRentExemption(
									GREETING_SIZE,
								  );
								const wSolTx = spl.createAssociatedTokenAccountIdempotentInstruction(
									wallet.publicKey,
									new PublicKey(ownerQuoteAta), //ownerQuoteAta
									wallet.publicKey,
									new PublicKey(quoteMint),
								);
								console.log(wSolTx)
								const swap = new TransactionInstruction({
									keys: accountMetas,
									programId,
									data: instructionData
								});
								sleep(500)
								const closeSol = spl.createCloseAccountInstruction(
									new PublicKey(ownerQuoteAta), //ownerQuoteAta
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
								transaction.add(UNITLIMIT);
								transaction.add(UNITPRICE);
								
								// transaction.add(wSolTx);
								
								// transaction.add(closeSol);
								sleep(500)
								const blockhash = await connection.getRecentBlockhash();
								// const blockhash = await connection.getRecentBlockhash();
								transaction.recentBlockhash = blockhash.blockhash;
								const name = SystemProgram.createAccountWithSeed({
									fromPubkey: wallet.publicKey,
									basePubkey: wallet.publicKey,
									seed: GREETING_SEED,
									newAccountPubkey: greetedPubkey,
									lamports,
									space: GREETING_SIZE,
									programId,
								  })
								

								if (side === 'Buy') {
								// 	await transaction.add(
								// 		SystemProgram.createAccountWithSeed({
								// 			fromPubkey: wallet.publicKey,
								// 			basePubkey: wallet.publicKey,
								// 			seed: GREETING_SEED,
								// 			newAccountPubkey: greetedPubkey,
								// 			lamports,
								// 			space: GREETING_SIZE,
								// 			programId,
								// 		  }),
								// 		//   await sendAndConfirmTransaction(connection, transaction, [payer]);
								// 	); // 10000000 lamports will send 0.01 sol to the ata
								// 	// await sendAndConfirmTransaction(connection, transaction, [wallet]);
								// // }
								transaction.add(
									SystemProgram.transfer({
										fromPubkey: wallet.publicKey,
										toPubkey: new PublicKey(name),
										lamports: swapAmount
									}),
									spl.createSyncNativeInstruction(new PublicKey(name))
								); // 10000000 lamports will send 0.01 sol to the ata
							}

								// transaction.add(createBaseAccountTx);
								transaction.add(swap);

								if (side === 'Buy') {
									transaction.add(closeSol);
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	console.log('BUYING')
								// 	sleep(500)
								// 	// console.log(`Step 2 - Create Burn Instructions`);
								// 	// const burnIx = createBurnCheckedInstruction(
								// 	// 	new PublicKey(ownerBaseAta),
								// 	// 	new PublicKey(MINT_ADDRESS), // Public Key of the Token Mint Address
								// 	// 	wallet.publicKey, // Public Key of Owner's Wallet
								// 	// 	BURN_QUANTITY, // Number of tokens to burn
								// 	// 	MINT_DECIMALS // Number of Decimals of the Token Mint
								// 	// );
								// 	// console.log(`    ✅ - Burn Instruction Created`);
								// 	// // Step 3 - Fetch Blockhash
								// 	// console.log(`Step 3 - Fetch Blockhash`);
								// 	// const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
								// 	// console.log(`    ✅ - Latest Blockhash: ${blockhash}`);
								// 	// console.log(`Step 4 - Assemble Transaction`);
								// 	// const messageV0 = new TransactionMessage({
								// 	// 	payerKey: wallet.publicKey,
								// 	// 	recentBlockhash: blockhash,
								// 	// 	instructions: [burnIx]
								// 	// }).compileToV0Message();
								// 	// const transaction1 = new VersionedTransaction(messageV0);
								// 	// transaction1.sign([wallet]);
								// 	// console.log(`    ✅ - Transaction Created and Signed`);
								// 	// console.log(`Step 5 - Execute & Confirm Transaction`);
								// 	// const txid = await connection.sendTransaction(transaction1);
								// 	// console.log("    ✅ - Transaction sent to network");
								// 	// const confirmation = await connection.confirmTransaction({
								// 	// 	signature: txid,
								// 	// 	blockhash: blockhash,
								// 	// 	lastValidBlockHeight: lastValidBlockHeight
								// 	// });
								// 	// console.log(confirmation)
								// 	transaction.add(closeSol);
								// transaction.add(closeAta);
								} 
								else if (side === 'Sell') {
									// transaction.add(closeSol);
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	console.log('SELLING')
								// 	sleep(500)
								// 	console.log(`Step 2 - Create Burn Instructions`);
								// 	// const burnIx = createBurnCheckedInstruction(
								// 	// 	new PublicKey(ownerBaseAta),
								// 	// 	new PublicKey(MINT_ADDRESS), // Public Key of the Token Mint Address
								// 	// 	wallet.publicKey, // Public Key of Owner's Wallet
								// 	// 	BURN_QUANTITY, // Number of tokens to burn
								// 	// 	MINT_DECIMALS // Number of Decimals of the Token Mint
								// 	// );
								// 	// console.log(`    ✅ - Burn Instruction Created`);
								// 	// // Step 3 - Fetch Blockhash
								// 	// console.log(`Step 3 - Fetch Blockhash`);
								// 	// const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
								// 	// console.log(`    ✅ - Latest Blockhash: ${blockhash}`);
								// 	// console.log(`Step 4 - Assemble Transaction`);
								// 	// const messageV0 = new TransactionMessage({
								// 	// 	payerKey: wallet.publicKey,
								// 	// 	recentBlockhash: blockhash,
								// 	// 	instructions: [burnIx]
								// 	// }).compileToV0Message();
								// 	// const transaction1 = new VersionedTransaction(messageV0);
								// 	// transaction1.sign([wallet]);
								// 	// console.log(`    ✅ - Transaction Created and Signed`);
								// 	// // transaction.add(closeAta);
								// 	// sleep(500)
								// 	// // transaction.add(closeSol);
								// 	// // Step 5 - Execute & Confirm Transaction 
								// 	// console.log(`Step 5 - Execute & Confirm Transaction`);
								// 	// const txid = await connection.sendTransaction(transaction1);
								// 	// console.log("    ✅ - Transaction sent to network");
								// 	// const confirmation = await connection.confirmTransaction({
								// 	// 	signature: txid,
								// 	// 	blockhash: blockhash,
								// 	// 	lastValidBlockHeight: lastValidBlockHeight
								// 	// });
								// 	// console.log(confirmation)
									transaction.add(closeSol);
								// 	// transaction.add(closeAta);
								}

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
									// transaction.add(closeAta);
								sleep(500)
								return transaction;
							}
							sleep(500)
						}} catch (error) {
							console.error('Error processing liquidity data:', error);
						}


					});
				} catch (error) {
					console.error('Error reading Liquidity data from FaunaDB:', error);
					return [];
				}
			});
		} catch (error) {
			console.error('Error reading Liquidity data from FaunaDB:', error);
			return [];
		}
	}
}
swapTx(42069, false)