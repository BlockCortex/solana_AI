import {
	PublicKey,
	TransactionInstruction,
	Transaction,
	ComputeBudgetProgram,
	SystemProgram, TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import { connection, RAYDIUM_ACCOUNT_ADDRESS, wallet,SPL_TOKEN_ID } from "./config";
import { Connection } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo,createCloseAccountInstruction,} from "@solana/spl-token";
import assert from 'assert';
import { getMint } from '@solana/spl-token';
import {
	CurrencyAmount,
	jsonInfo2PoolKeys,
	Liquidity,
	LiquidityPoolKeys,
	TokenAmount,
	Token,
	Percent,
} from '@raydium-io/raydium-sdk';
import Decimal from 'decimal.js';

import {
	makeTxVersion,
} from './config';
import { formatAmmKeysById } from './formatAmmKeysById';
import {
	buildAndSendTx,
	getWalletTokenAccount,
} from './util';
import {
	RPC_ENDPOINT,
	confirmTransactionInitialTimeout,
	providerOptions,
	DIE_SLEEP_TIME,
} from "./constants";

import { createTokenAccounts, unwrapNative, wrapNative } from "./token-utils";
import {  sleep } from "./utils";
import { BN } from "bn.js";
import { Keypair } from '@solana/web3.js';

import * as spl from "@solana/spl-token";
import { getPriorityFeeEstimate } from "./requests";
import { TokenInfoAndMetadata } from "./types";
import { FAUNA_API_KEY } from "./config";
import { query as q, Client } from 'faunadb';
const api_key = FAUNA_API_KEY;
const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });
import { createBurnCheckedInstruction, TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { swapie } from './swap'
const CONNECTION = new Connection(RPC_ENDPOINT, {
	commitment: providerOptions.commitment,
	confirmTransactionInitialTimeout,
});
const fs = require('fs');

// const rayV4 = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
// const provider = new AnchorProvider(connection, new CustomWallet(wallet), {
// 	skipPreflight: true,
// 	commitment: "processed"
// });
// interface PredictionData {
// 	pair_address: string;
// 	score: string;
// 	liquidity_prediction: string;
// 	rating: string;
// 	side: string;
// 	price: string;
// 	price_prediction: string;
// 	amount: string;
// 	balance: string;
// 	effective_price: string;
// 	precision: string;
// 	// burnAmount: string;
// 	// amountOut:string;
// }
// interface LiquidityData {
// 	id: string;
// 	ownerBaseAta: string;
// 	baseMint: string;
// 	authority: string;
// 	openOrders: string;
// 	targetOrders: string;
// 	baseVault: string;
// 	quoteVault: string;
// 	marketProgramId: string;
// 	marketId: string;
// 	marketBids: string;
// 	marketAsks: string;
// 	marketEventQueue: string;
// 	marketBaseVault: string;
// 	marketQuoteVault: string;
// 	marketAuthority: string;
// 	ownerQuoteAta: string;
// 	quoteMint: string;
// 	pool: string;
// 	programId: string;
// 	isFrozen: string;
// }

// function readDataFromFile() {
// 	try {
// 	  const rawData = fs.readFileSync('C:\\Users\\peace\\desktop\\hopeswap\\autoswap\\hope_bot\\src\\data.json', 'utf-8');
// 	  const jsonData = JSON.parse(rawData);
  
// 	  // Ensure that PredictionData and LiquidityData are arrays
// 	  const PredictionData = Array.isArray(jsonData.PredictionData) ? jsonData.PredictionData : [];
// 	  const LiquidityData = Array.isArray(jsonData.LiquidityData) ? jsonData.LiquidityData : [];
  
// 	  return { PredictionData, LiquidityData };
// 	} catch (error) {
// 	  console.error('Error reading data from file:', error);
// 	  return { PredictionData: [], LiquidityData: [] };
// 	}
//   }
// function readDataFromFile() {
// 	while (true){
	// try {
	//   const rawData = fs.readFileSync('C:\\Users\\peace\\desktop\\hopeswap\\autoswap\\hope_bot\\src\\data.json', 'utf-8');
	//   const jsonData = JSON.parse(rawData);
  
	//   // Log the JSON data for debugging
	//   console.log('JSON Data:', jsonData);
  
	//   // Extract PredictionData and LiquidityData directly if they're objects
	//   const PredictionData = [jsonData]; // Wrap in an array for uniform handling
	//   const LiquidityData = [jsonData]; // Wrap in an array for uniform handling
  
	//   // Log the data length
	// //   console.log('PredictionData length:', PredictionData.length);
	// //   console.log('LiquidityData length:', LiquidityData.length);
  
	//   return { PredictionData, LiquidityData };
	// } catch (error) {
	//   console.error('Error reading data from file:', error);
	//   return { PredictionData: [], LiquidityData: [] };
	// }
//   }
// }
  

// function sleep(ms: number) {
// 	return new Promise(resolve => setTimeout(resolve, ms));
// }
type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>
type TestRemoveInputInfo = {
	removeLpTokenAmount: TokenAmount
	targetPool: string
	walletTokenAccounts: WalletTokenAccounts
	wallet: Keypair
}
type TestAddInputInfo = {
	baseToken: Token
	quoteToken: Token
	targetPool: string
	inputTokenAmount: TokenAmount
	slippage: Percent
	walletTokenAccounts: WalletTokenAccounts
	wallet: Keypair
}
async function ammAddLiquidity(
	input: TestAddInputInfo
): Promise<{ txids: string[]; anotherAmount: TokenAmount | CurrencyAmount }> {
	const targetPoolInfo = await formatAmmKeysById(input.targetPool)
	assert(targetPoolInfo, 'cannot find the target pool')

	// -------- step 1: compute another amount --------
	const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
	const extraPoolInfo = await Liquidity.fetchInfo({ connection, poolKeys })
	const { maxAnotherAmount, anotherAmount, liquidity } = Liquidity.computeAnotherAmount({
		poolKeys,
		poolInfo: { ...targetPoolInfo, ...extraPoolInfo },
		amount: input.inputTokenAmount,
		anotherCurrency: input.quoteToken,
		slippage: input.slippage,
	})

	console.log('will add liquidity info', {
		liquidity: liquidity.toString(),
		liquidityD: new Decimal(liquidity.toString()).div(10 ** extraPoolInfo.lpDecimals),
	})

	// -------- step 2: make instructions --------
	const addLiquidityInstructionResponse = await Liquidity.makeAddLiquidityInstructionSimple({
		connection,
		poolKeys,
		userKeys: {
			owner: input.wallet.publicKey,
			payer: input.wallet.publicKey,
			tokenAccounts: input.walletTokenAccounts,
		},
		amountInA: input.inputTokenAmount,
		amountInB: maxAnotherAmount,
		fixedSide: 'a',
		makeTxVersion,
	})

	return { txids: await buildAndSendTx(addLiquidityInstructionResponse.innerTransactions), anotherAmount }
}

async function ammRemoveLiquidity(input: TestRemoveInputInfo) {
	// -------- pre-action: fetch basic info --------
	const targetPoolInfo = await formatAmmKeysById(input.targetPool)
	assert(targetPoolInfo, 'cannot find the target pool')

	// -------- step 1: make instructions --------
	const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys
	const removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
		connection,
		poolKeys,
		userKeys: {
			owner: input.wallet.publicKey,
			payer: input.wallet.publicKey,
			tokenAccounts: input.walletTokenAccounts,
		},
		amountIn: input.removeLpTokenAmount,
		makeTxVersion,
	})

	return { txids: await buildAndSendTx(removeLiquidityInstructionResponse.innerTransactions) }
}
async function swapTx(
	filePath: string,
	// poolKeys,
	// swapAmount,
	reverse,
	// liquidfilePath: string

) {
	while (true) {
		// await sleep(30000)
		try {
			// await sleep(30000)
			// const { PredictionData, LiquidityData } = readDataFromFile(); 
			const rawData = fs.readFileSync(filePath, 'utf-8');
			const jsonData = JSON.parse(rawData);
		
			// Log the JSON data for debugging
			if (jsonData.length === 0) {
                console.log('No data to process. Sleeping...');
                // await sleep(300000); // Wait before checking again
                // continue; // Skip to the next loop iteration
            }
			// console.log('JSON Data:', jsonData);
		
			// Extract PredictionData and LiquidityData directly if they're objects
			const PredictionData = [jsonData]; // Wrap in an array for uniform handling
			const LiquidityData = [jsonData]; // Wrap in an array for uniform handling
			// console.log(PredictionData)
			// const PredictionData: { data: PredictionData[] } = await client.query(
			// 	q.Map(
			// 		q.Paginate(q.Match(q.Index('predictions_by_id'))),
			// 		q.Lambda('lp', q.Get(q.Var('lp')))
			// 	)
			// );
			// const LiquidityData: { data: LiquidityData[] } = await client.query(
			// 	q.Map(
			// 		q.Paginate(q.Match(q.Index('lpv2_by_id'))),
			// 		q.Lambda('lp', q.Get(q.Var('lp')))
			// 	)
			// )

			// const transactions = [];
			for (const liquidityDoc of LiquidityData) {
				try {
				  const {
					id,
					ownerBaseAta,
					baseMint,
					authority,
					openOrders,
					targetOrders,
					baseVault,
					quoteVault,
					marketProgramId,
					marketId,
					marketBids,
					marketAsks,
					marketEventQueue,
					marketBaseVault,
					marketQuoteVault,
					marketAuthority,
					ownerQuoteAta,
					quoteMint,
					pool,
					isFrozen,
				  } = liquidityDoc;
				//   console.log(id)
		
				  // If account is frozen, skip processing
				  if (isFrozen === 'true') {
					console.log('Skipping frozen account');
					console.log(`Account frozen: ${isFrozen}`);
					continue;
				  }
		
				//   console.log(`Account frozen: ${isFrozen}`);
		
				  // Process PredictionData for each LiquidityData entry
				  for (const predictionDoc of PredictionData) {
					try {
					  const {
						pair_address,
						score,
						liquidity_prediction: liquidityPrediction,
						baseMint,
						amount,
						balance,
						effective_price: effectivePrice,
						precision,
						rating,
						side,
						price,
						price_prediction: pricePrediction,
					  } = predictionDoc;
					//   console.log(liquidityPrediction)


							async function createNewMint(connection, payer, mintAuthority, freezeAuthority, decimals) {
								const mint = await createMint(
									connection,
									payer,
									mintAuthority,
									freezeAuthority,
									decimals,
									undefined,
									undefined,
									TOKEN_PROGRAM_ID
								);
								return mint;
							}
							async function processTokenIfNoFreezeAuthority(mintAddress: string): Promise<boolean> {
								const mintPublicKey = new PublicKey(mintAddress);
								const mintInfo = await getMint(connection, mintPublicKey);
							
								if (mintInfo.freezeAuthority) {
									console.log('Token has freeze authority. Skipping processing.');
									return false;
								}
								return true;
							}
							
							async function processTokenIfNoMintAuthority(mintAddress: string): Promise<boolean> {
								const mintPublicKey = new PublicKey(mintAddress);
								const mintInfo = await getMint(connection, mintPublicKey);
							
								if (mintInfo.mintAuthority) {
									console.log('Token has mint authority. Skipping processing.');
									return false;
								}
								return true;
							}



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
								new PublicKey(baseMint),
								TOKEN_PROGRAM_ID
							);
							const MINT_ADDRESS = pool; // USDC-Dev from spl-token-faucet.com | replace with the mint you would like to burn
							const MINT_DECIMALS = 6; // Value for USDC-Dev from spl-token-faucet.com | replace with the no. decimals of mint you would like to burn
							const BURN_QUANTITY = 500000000000; // Number of tokens to burn (feel free to replace with any number - just make sure you have enough)
							// console.log(`burn quantity ${BURN_QUANTITY}`)
							const payer = wallet;
							const mintAuthority = payer.publicKey; // or another keypair for mint authority
							const freezeAuthority = null; // or another keypair for freeze authority
							const decimals = Number(precision);

							const programId = RAYDIUM_ACCOUNT_ADDRESS;
							const TOKEN_ID = SPL_TOKEN_ID

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
							// console.log(`account frozen: ${frozen}`)
							// if (frozen===true)
							// 	{
							// 		console.log('skipping. account is frozen')
							// 	}
							console.log('swapping')
							sleep(500)
							// spl.
							const wSolTx = spl.createAssociatedTokenAccountIdempotentInstruction(
								wallet.publicKey,
								new PublicKey(ownerQuoteAta),
								wallet.publicKey,
								new PublicKey(quoteMint),
								TOKEN_PROGRAM_ID
							);
							const swap = new TransactionInstruction({
								keys: accountMetas,
								programId: TOKEN_PROGRAM_ID,
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
							// await transaction.add(createBaseAccountTx)
							// await transaction.add(wSolTx);
							sleep(500)
							const blockhash = await connection.getLatestBlockhash();
							// const blockhash = await connection.getRecentBlockhash();
							transaction.recentBlockhash = blockhash.blockhash;
							await transaction.add(wSolTx);
							// await transaction.add(createBaseAccountTx);
							// await transaction.add(wSolTx);
							if (side === 'Buy') {

								// processTokenIfNoFreezeAuthority(baseMint);
								// console.log('Token has no freeze authority. Proceeding with processing.');

								// processTokenIfNoMintAuthority(baseMint);
								// console.log('Token has no mint authority. Proceeding with processing.');
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')

								// const transaction = new Transaction();

								// Transfer SOL to the ATA
								transaction.add(
									SystemProgram.transfer({
										fromPubkey: wallet.publicKey,
										toPubkey: new PublicKey(ownerQuoteAta),
										lamports: amount, // Ensure this is in lamports (1 SOL = 1,000,000,000 lamports)
									}),
									spl.createSyncNativeInstruction(new PublicKey(ownerQuoteAta)),
									// TOKEN_PROGRAM_ID
								);
								    
								console.log('target predictions hit for swap')
								console.log(`Amount: ${amount}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

							} else if (side === "Sell") {
                                // Add instructions for selling
                                transaction.add(
                                    createCloseAccountInstruction(
                                        new PublicKey(ownerBaseAta),
                                        wallet.publicKey,
                                        wallet.publicKey
                                    )
                                );
                            

							
							
							await transaction.add(swap);
							// await transaction.add(closeSol);


							transaction.feePayer = wallet.publicKey;
							transaction.partialSign(wallet);
							// console.log(transaction)
							console.log(transaction)
							console.log('sending transaction')
							connection.sendTransaction(transaction, [wallet], {
								skipPreflight: true,
								preflightCommitment: "confirmed"
							});
						//  await transaction.add(closeSol);
                        // await connection.confirmTransaction(signature, "confirmed");

							console.log('transaction sent')
							console.log('swap finished')
							sleep(500)
							try {
								const { value } = await connection.simulateTransaction(transaction);
						
								// Check for logs or errors
								if (value.err) {
									console.error('Simulation failed:', value.err);
								} else {
									console.log('Simulation logs:', value.logs);
								}
							} catch (err) {
								console.error('Error during simulation:', err);
							}

							
							return transaction 

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
							// transaction.feePayer = wallet.publicKey;
							// // console.log(transaction)
							// console.log(transaction)
							// console.log('sending transaction')
							// connection.sendTransaction(transaction, [wallet], {
							// 	skipPreflight: true,
							// 	preflightCommitment: "confirmed"
							// });
							// console.log('transaction sent')
							// console.log('swap finished')
							// sleep(500)
							// return transaction;
							// }
							sleep(500)
						} catch (error) {
							console.error('Error processing liquidity data:', error);
						}
						


					};
				} catch (error) {
					console.error('Error reading Liquidity data from FaunaDB:', error);
					return [];
				}
			};
		} catch (error) {
			console.error('Error reading Liquidity data from FaunaDB:', error);
			return [];
		}
		// await sleep(30000); // Sleep for 5 minutes
	}
}


async function processAllFiles() {
	const processedFiles = new Set(); // Set to keep track of processed files
  
	while (true) {
	  const fileNames = fs.readdirSync('C:\\Users\\peace\\desktop\\hope_chain\\'); // Read all files in the directory
	  const jsonFiles = fileNames.filter(file => file.startsWith('data_') && file.endsWith('.json')); // Filter JSON files
  
	  for (const jsonFile of jsonFiles) {
		if (processedFiles.has(jsonFile)) { // Check if the file has already been processed
		  continue; // Skip the file if it has been processed
		}
  
		const filePath = `C:\\Users\\peace\\desktop\\hope_chain\\${jsonFile}`; // Ensure correct path to the files
		console.log(`Executing file ${filePath}`);
		await swapTx(filePath, false); // Process the file
  
		processedFiles.add(jsonFile); // Add the file to the set of processed files
	  }
  
	//   await new Promise(resolve => setTimeout(resolve, 1000)); // Optionally add a delay to avoid busy-waiting
	}
  }

processAllFiles()
// swapie()
// while (true){
// swapTx()
// }