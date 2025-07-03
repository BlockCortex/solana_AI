import {
	PublicKey,
	TransactionInstruction,
	Transaction,
	ComputeBudgetProgram,
	SystemProgram, TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import { connection, RAYDIUM_ACCOUNT_ADDRESS, wallet, SPL_TOKEN_ID,QUICKNODE_API_KEY } from "./config";
import { Connection } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, createCloseAccountInstruction,createTransferCheckedInstruction } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction ,} from "@solana/spl-token";
import { sendAndConfirmTransaction } from "@solana/web3.js";

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
import { sleep } from "./utils";
import { BN } from "bn.js";
import { Keypair } from '@solana/web3.js';

import * as spl from "@solana/spl-token";
import { getPriorityFeeEstimate } from "./requests";
import { TokenInfoAndMetadata } from "./types";
import { FAUNA_API_KEY } from "./config";
import { query as q, Client } from 'faunadb';
const api_key = FAUNA_API_KEY;
const client = new Client({ secret: api_key, domain: 'db.us.fauna.com' });
import { createBurnCheckedInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { swapie } from './swap'
import bs58 from "bs58";

// const CONNECTION = new Connection(RPC_ENDPOINT, {
// 	commitment: providerOptions.commitment,
// 	confirmTransactionInitialTimeout,
// });
const fs = require('fs');
const QUICKNODE_RPC = QUICKNODE_API_KEY // 👈 Replace with your QuickNode Endpoint OR clusterApiUrl('mainnet-beta')
const SOLANA_CONNECTION = new Connection(QUICKNODE_RPC);


async function sendLocalCreateTx() {
	const payer = new PublicKey(wallet.publicKey);
	const secretKeyString = bs58.encode(wallet.secretKey);
	const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
	const mintKeypair = Keypair.generate(); // Generate once and reuse
	const mint = mintKeypair.publicKey.toBase58();
	const imageBuffer = fs.readFileSync("AZARI.jpg");
	const imageBlob = new Blob([imageBuffer], { type: "image/jpeg" });
	// Define token metadata
	const formData = new FormData();
	formData.append("file", imageBlob); // Image file
	formData.append("name", "$AZARI");
	formData.append("symbol", "ARI");
	formData.append("description", "AZARI. FOREVER");
	formData.append("twitter", "https://x.com/");
	formData.append("telegram", "https://t.me/");
	formData.append("website", `https://solscan.io/account/${mint}`);
	formData.append("showName", "true");
	// Create IPFS metadata storage
	const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
		method: "POST",
		body: formData,
	});
	const metadataResponseJSON = await metadataResponse.json();

	// Get the create transaction
	const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			"publicKey": payer.toBase58(),
			"action": "create",
			"tokenMetadata": {
				name: metadataResponseJSON.metadata.name,
				symbol: metadataResponseJSON.metadata.symbol,
				uri: metadataResponseJSON.metadataUri,
			},
			"mint": mintKeypair.publicKey.toBase58(),
			"denominatedInSol": "true",
			"amount": 0.2, // dev buy of 1 SOL
			"slippage": 2,
			"priorityFee": 0.0005,
			"pool": "auto",
		}),
	});

	if (response.status === 200) {
		const data = await response.arrayBuffer();
		const tx = VersionedTransaction.deserialize(new Uint8Array(data));
		tx.sign([mintKeypair, signerKeyPair]);
		const mint = new PublicKey(mintKeypair.publicKey.toBase58());
		const ata = await getAssociatedTokenAddress(mint, payer, false);
		// Check if ATA exists
		const ataInfo = await connection.getAccountInfo(ata);
		let ataSignature: string | null = null;
		const signature = await connection.sendTransaction(tx);
		console.log("Mint Transaction: https://solscan.io/tx/" + signature);



		const lp_v2 = {

			quoteMint: new PublicKey('So11111111111111111111111111111111111111112'),
			baseMint: mintKeypair.publicKey.toBase58(),

		};

		// Define the file path
		const lp_v2_path = `../../../hope_chain/data/lp_v2.json`;

		// Write JSON object to file
		fs.writeFileSync(lp_v2_path, JSON.stringify(lp_v2, null, 2)); // Write JSON to file

		console.log(`LP V2 data saved to ${lp_v2_path}`);
		// 		let dynamicSlippage = Math.min(4, Math.max(0.5, liquidityPrediction * 0.1));,
		// console.log(`dynamic slippage ${dynamicSlippage}`)

		console.log('SELLING');

		const response1 = await fetch(`https://pumpportal.fun/api/trade-local`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				"publicKey": payer.toBase58(),
				"action": "sell",
				"mint": mint,
				"denominatedInSol": "false",
				"amount": "10%",
				"slippage": 2,
				"priorityFee": 0.000005,
				"pool": "auto"
			})
		});

		if (response1.status === 200) {
			const data = await response1.arrayBuffer();
			const tx = VersionedTransaction.deserialize(new Uint8Array(data));

			// Sign the transaction
			const secretKeyString = bs58.encode(wallet.secretKey);
			const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
			await tx.sign([signerKeyPair]);

			// Send the transaction
			const signature = await connection.sendRawTransaction(tx.serialize());
			console.log("Sell Transaction: https://solscan.io/tx/" + signature);

			// Wait for confirmation before proceeding to close
			await connection.confirmTransaction(signature, "finalized");

			// Check if the ATA is now empty
			const ataBalance = await connection.getTokenAccountBalance(ata);
			if (ataBalance.value.amount === "0") {
				console.log("Account empty. Closing ATA...");

				const closeIx = createCloseAccountInstruction(
					ata,      // Associated Token Account to close
					payer,    // Rent goes back to the payer
					payer     // Wallet that owns the ATA
				);

				const closeTransaction = new Transaction().add(closeIx);
				const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
				console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
			} else {
				console.log("ATA still has balance, not closing.");
			}
		} else {
			console.log("Error selling tokens:", response1.statusText);
		}



		return mint; // Return the minted token
	} else {
		console.log(response.statusText);
		return null; // Handle minting failure
	}




}

// sendLocalCreateTx()
// const mintedToken = sendLocalCreateTx();
// mintedToken


// function createNewKeypair(): Keypair {
//     const keypair = Keypair.generate();
//     const privateKey = Array.from(keypair.secretKey);

//     // Save private key to JSON file
//     const keysFile = 'private_keys.json';
//     let keys: number[][] = [];

//     if (fs.existsSync(keysFile)) {
//         try {
//             keys = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
//         } catch (error) {
//             console.error('Error reading keys file:', error);
//         }
//     }

//     keys.push(privateKey);

//     try {
//         fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
//     } catch (error) {
//         console.error('Error saving keys file:', error);
//     }

//     return keypair;
// }


async function swapTx(
	filePath: string,
	// poolKeys,
	// swapAmount,
	reverse,
	// liquidfilePath: string

) {



	// const mintedToken = await sendLocalCreateTx(); // Get the minted token
	// if (!mintedToken) {
	//     console.log("Minting failed, aborting swap.");
	//     return;
	// }

	while (true) {



		// await sleep(30000)
		try {


			const payer = new PublicKey(wallet.publicKey);

			// await sleep(30000)
			// const { PredictionData, LiquidityData } = readDataFromFile(); 
			const rawData = fs.readFileSync(filePath, 'utf-8');
			const jsonData = JSON.parse(rawData);
			// const keypair = createNewKeypair();
			// console.log('Generated new public key:', keypair.publicKey.toBase58());
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
								// baseMint_Me,
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




							const mint = new PublicKey(baseMint);
							// const mintMe = new PublicKey(baseMint_Me);

							const ata = await getAssociatedTokenAddress(mint, payer, false);
							// Check if ATA exists
							const ataInfo = await connection.getAccountInfo(ata);
							let ataSignature: string | null = null;
							// // Check if ATA exists
							// const ataInfo = await connection.getAccountInfo(ata);
							// const transaction = new Transaction();

							if (!ataInfo) {
								console.log("ATA does not exist, creating it...");
								const ataTransaction = new Transaction().add(
									createAssociatedTokenAccountInstruction(
										payer,  // Payer for account creation
										ata,    // Associated token account address
										payer,  // Wallet owner
										mint    // Token mint
									)
								);

								const secretKeyString = bs58.encode(wallet.secretKey);
								const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));

								ataSignature = await sendAndConfirmTransaction(connection, ataTransaction, [signerKeyPair]);
								console.log("ATA Created: https://solscan.io/tx/" + ataSignature);
							}

							const grace = new PublicKey('CdZSahGBRo32uZubdkUh8yX2EoxD3xGn2xTs5G8artbu')



							const ata2 = await getAssociatedTokenAddress(mint, grace, false);
							// Check if ATA exists
							const ataInfo2 = await connection.getAccountInfo(ata2);
							let ataSignature2: string | null = null;
							// // Check if ATA exists
							// const ataInfo = await connection.getAccountInfo(ata);
							// const transaction = new Transaction();
							
							const TOKEN_ADDRESS = new PublicKey(ata); 

							const mintInfo = await getMint(connection, mint);
							console.log(`Token Decimals: ${mintInfo.decimals}`);

							if (!ataInfo2) {
								console.log("ATA does not exist, creating it...");
								const ataTransaction2 = new Transaction().add(
									createAssociatedTokenAccountInstruction(
										payer,  // Payer for account creation
										ata2,    // Associated token account address
										grace,  // Wallet owner
										mint    // Token mint
									)
								);

								const secretKeyString = bs58.encode(wallet.secretKey);
								const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));

								ataSignature2 = await sendAndConfirmTransaction(connection, ataTransaction2, [signerKeyPair]);
								console.log("ATA Created: https://solscan.io/tx/" + ataSignature2);
							}
							const tokenAccount1Pubkey = new PublicKey(ata);
							const tokenAccount2Pubkey = new PublicKey(ata2);
							const prevOwner = wallet

							// const keypair = Keypair.generate();
							// const privateKey = Array.from(keypair.secretKey);
							// const pub_key = keypair.publicKey.toBase58(); // ✅ Convert to string here
							// const ata3 = await getAssociatedTokenAddress(mint, new PublicKey(pub_key), false);
							// const tokenAccount3Pubkey = new PublicKey(ata3);
							// Check if ATA exists
							// const ataInfo3 = await connection.getAccountInfo(ata3);
							// let ataSignature3: string | null = null;
							const ammo = 0.0001
							// const amountInSol = ammo*.5;

							// // 🛠 Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
							// const amountInLamports = amountInSol * 10 ** 9;
							// const transaction011 = new Transaction().add(
							// 	SystemProgram.transfer({
							// 	  fromPubkey: wallet.publicKey,
							// 	  toPubkey: new PublicKey(pub_key),
							// 	  lamports: 10000000,
							// 	})
							//   );

							// //   (async () => {
							// // 	try {
							// 	  const signature01 = await sendAndConfirmTransaction(connection, transaction011, [wallet]);
							// 	  console.log(`✅ Transaction successful! Hash: ${signature01}`);

							// if (!ataInfo3) {
							// 	console.log("ATA does not exist, creating it...");
							// 	const ataTransaction3 = new Transaction().add(
							// 		createAssociatedTokenAccountInstruction(
							// 			payer,  // Payer for account creation
							// 			ata3,    // Associated token account address
							// 			new PublicKey(pub_key),  // Wallet owner
							// 			mint    // Token mint
							// 		)
							// 	);

							// 	const secretKeyString = bs58.encode(wallet.secretKey);
							// 	const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));

							// 	ataSignature3= await sendAndConfirmTransaction(connection, ataTransaction3, [signerKeyPair]);
							// 	console.log("ATA Created: https://solscan.io/tx/" + ataSignature3);
							// }

							// // Save private key to JSON file

							// const keysFile = 'private_keys3.json';
							
							// let keys: { privateKey: number[], pubKey: string }[] = [];
							
							// if (fs.existsSync(keysFile)) {
							//   try {
							// 	keys = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
							//   } catch (error) {
							// 	console.error('Error reading keys file:', error);
							//   }
							// }
							
							// keys.push({ privateKey, pubKey: pub_key }); // ✅ pubKey is now a string
							
							// try {
							//   fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2));
							//   console.log('Keypair saved successfully.');
							// } catch (error) {
							//   console.error('Error saving keys file:', error);
							// }
							// const secretKey = Uint8Array.from(privateKey);
							// const signerKeypair = Keypair.fromSecretKey(secretKey);

							// return keypair;

							// const info = await connection.getTokenAccountBalance(ata);
							// if (info.value.uiAmount == null) throw new Error('No balance found');
							// console.log('Balance): ', info.value.uiAmount);
							// console.log('Balance to transfer to grace): ', info.value.uiAmount*0.25);



							let dynamicSlippage = Math.min(2, Math.max(0.5, liquidityPrediction * 0.1));

							let amountToSell = dynamicSlippage > 0.05 ? "80%" : dynamicSlippage < 0.02 ? "40%" : "60%";

							// if (dynamicSlippage > 0.05) {
							// 	amountToSell = "80%"; // Sell more when slippage is high
							// } else if (dynamicSlippage < 0.02) {
							// 	amountToSell = "40%"; // Sell less when slippage is very low
							// }

							console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`);
							// const ammo = 0.2;
							console.log(`Dynamic Slippage: ${dynamicSlippage}`);
							console.log('BUYING NUKE ON PUMP');
							console.log('BUYING'.repeat(6)); // More concise way to log multiple times
							
							// await sleep(3000);
							console.log(dynamicSlippage)
							// console.log('BUYING NUKE ON PUMP')
		
							await sleep(3000)



							// const response_gen = await fetch(`https://pumpportal.fun/api/trade-local`, {
							// 	method: "POST",
							// 	headers: { "Content-Type": "application/json" },
							// 	body: JSON.stringify({
							// 		"publicKey": new PublicKey(pub_key),
							// 		"action": "buy",
							// 		"mint": mint,
							// 		"denominatedInSol": "false",
							// 		"amount": "100%",
							// 		"slippage": dynamicSlippage,
							// 		"priorityFee": 0.000005,
							// 		"pool": "auto"
							// 	})
							// });
							// console.log(`dynamic slippage ${dynamicSlippage}`)
							// console.log('target predictions hit for swap')
							// console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

							// if (response_gen.status === 200) {
							// 	const data = await response_gen.arrayBuffer();
							// 	const tx = VersionedTransaction.deserialize(new Uint8Array(data));

							// 	// Sign the versioned transaction
							// 	// const secretKeyString = bs58.encode(wallet.secretKey);
							// 	const signerKeyPair = Keypair.fromSecretKey(secretKey);
							// 	await tx.sign([signerKeyPair]);

							// 	// Send the transaction
							// 	const signature = await connection.sendRawTransaction(tx.serialize());
							// 	console.log("Trade Transaction: https://solscan.io/tx/" + signature);
							// } else {
							// 	console.log("Error:", response_gen.statusText);
							// }




							// const response_gen0 = await fetch(`https://pumpportal.fun/api/trade-local`, {
							// 	method: "POST",
							// 	headers: { "Content-Type": "application/json" },
							// 	body: JSON.stringify({
							// 		"publicKey": new PublicKey(pub_key),
							// 		"action": "sell",
							// 		"mint": mint,
							// 		"denominatedInSol": "false",
							// 		"amount": "100%",
							// 		"slippage": dynamicSlippage,
							// 		"priorityFee": 0.000005,
							// 		"pool": "auto"
							// 	})
							// });

							// if (response_gen0.status === 200) {
							// 	const data = await response_gen0.arrayBuffer();
							// 	const tx = VersionedTransaction.deserialize(new Uint8Array(data));

							// 	// Sign the transaction
							// 	// const secretKeyString = bs58.encode(wallet.secretKey);
							// 	const signerKeyPair = Keypair.fromSecretKey(secretKey);
							// 	await tx.sign([signerKeyPair]);

							// 	// Send the transaction
							// 	const signature = await connection.sendRawTransaction(tx.serialize());
							// 	console.log("Sell Transaction: https://solscan.io/tx/" + signature);

							// 	// Wait for confirmation before proceeding to close
							// 	await connection.confirmTransaction(signature, "finalized");

							// 	// Check if the ATA is now empty
							// 	const ataBalance = await connection.getTokenAccountBalance(ata);
							// 	if (ataBalance.value.amount === "0") {
							// 		console.log("Account empty. Closing ATA...");

							// 		const closeIx = createCloseAccountInstruction(
							// 			ata,      // Associated Token Account to close
							// 			payer,    // Rent goes back to the payer
							// 			payer     // Wallet that owns the ATA
							// 		);

							// 		const closeTransaction = new Transaction().add(closeIx);
							// 		const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
							// 		console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
							// 	} else {
							// 		console.log("ATA still has balance, not closing.");
							// 	}
							// } else {
							// 	console.log("Error selling tokens:", response_gen0.statusText);
							// }

							// // const amountInSol0 = ammo*.23;

							// // // 🛠 Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
							// // const amountInLamports0 = amountInSol0 * 10 ** 9;
							// const transaction_gen = new Transaction().add(
							// 	SystemProgram.transfer({
							// 	  fromPubkey: new PublicKey(pub_key),
							// 	  toPubkey: wallet.publicKey,
							// 	  lamports: amountInLamports,
								
							// 	})
							//   );

							// //   (async () => {
							// // 	try {
							// 	  const signature_gen0 = await sendAndConfirmTransaction(connection, transaction_gen, [keypair]);
							// 	  console.log(`✅ Transaction successful! Hash: ${signature_gen0}`);







							const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									"publicKey": payer.toBase58(),
									"action": "buy",
									"mint": mint,
									"denominatedInSol": "true",
									"amount": ammo,
									"slippage": dynamicSlippage,
									"priorityFee": 0.000005,
									"pool": "auto"
								})
							});
							console.log(`dynamic slippage ${dynamicSlippage}`)
							console.log('target predictions hit for swap')
							console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

							if (response.status === 200) {
								const data = await response.arrayBuffer();
								const tx = VersionedTransaction.deserialize(new Uint8Array(data));

								// Sign the versioned transaction
								const secretKeyString = bs58.encode(wallet.secretKey);
								const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
								await tx.sign([signerKeyPair]);

								// Send the transaction
								const signature = await connection.sendRawTransaction(tx.serialize());
								console.log("Trade Transaction: https://solscan.io/tx/" + signature);
							} else {
								console.log("Error:", response.statusText);
							}

							// await sleep(2000)


							
							await sleep(8000)
							const info = await connection.getTokenAccountBalance(ata);
							if (info.value.uiAmount == null) throw new Error('No balance found');
							console.log('Balance): ', info.value.uiAmount);
							console.log('Balance to transfer to grace): ', info.value.uiAmount*0.25);

							const tx1 = new Transaction();
							tx1.add(
							  createTransferCheckedInstruction(
								tokenAccount1Pubkey,
								mint,
								tokenAccount2Pubkey,
								prevOwner.publicKey,
								BigInt(Math.round(info.value.uiAmount *0.25 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
								mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
							  )
							);

							const txhash = await sendAndConfirmTransaction(connection,tx1, [prevOwner]);
							console.log(`Sent Transaction hash: ${txhash}`);
							await sleep(8000)


							// await sleep(8000)
							// const info = await connection.getTokenAccountBalance(ata);
							// if (info.value.uiAmount == null) throw new Error('No balance found');
							// console.log('Balance): ', info.value.uiAmount);
							// console.log(`Balance to transfer to ${pub_key}): `, info.value.uiAmount*0.01);
							// const transaction00 = new Transaction().add(
							// 	SystemProgram.transfer({
							// 	  fromPubkey: wallet.publicKey,
							// 	  toPubkey: new PublicKey(pub_key),
							// 	  lamports: amountInLamports,
								
							// 	})
							//   );

							// //   (async () => {
							// // 	try {
							// 	  const signature00 = await sendAndConfirmTransaction(connection, transaction00, [wallet]);
							// 	  console.log(`✅ Transaction successful! Hash: ${signature00}`);
							// const tx00 = new Transaction();
							// tx00.add(
							//   createTransferCheckedInstruction(
							// 	tokenAccount1Pubkey,
							// 	mint,
							// 	tokenAccount3Pubkey,
							// 	prevOwner.publicKey,
							// 	BigInt(Math.round(info.value.uiAmount *0.01 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
							// 	mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
							//   )
							// );

							// const txhash00 = await sendAndConfirmTransaction(connection,tx00, [prevOwner]);
							// console.log(`Sent Transaction hash: ${txhash00}`);
							// await sleep(8000)


							// let amountToSell = "60%"; // Default sell amount (60%)
							if (dynamicSlippage > 0.05) {
								// If slippage is greater than 5%, sell a larger portion (e.g., 80%)
								amountToSell = "98%";
								console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)
							} else if (dynamicSlippage < 0.02) {
								// If slippage is lower than 2%, sell a smaller portion (e.g., 40%)
								amountToSell = "96%";
								console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)

							}


							const response3 = await fetch(`https://pumpportal.fun/api/trade-local`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									"publicKey": payer.toBase58(),
									"action": "sell",
									"mint": mint,
									"denominatedInSol": "false",
									"amount": amountToSell,
									"slippage": dynamicSlippage,
									"priorityFee": 0.000005,
									"pool": "auto"
								})
							});

							if (response3.status === 200) {
								const data = await response3.arrayBuffer();
								const tx = VersionedTransaction.deserialize(new Uint8Array(data));

								// Sign the transaction
								const secretKeyString = bs58.encode(wallet.secretKey);
								const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
								await tx.sign([signerKeyPair]);

								// Send the transaction
								const signature = await connection.sendRawTransaction(tx.serialize());
								console.log("Sell Transaction: https://solscan.io/tx/" + signature);

								// Wait for confirmation before proceeding to close
								await connection.confirmTransaction(signature, "finalized");

								// Check if the ATA is now empty
								const ataBalance = await connection.getTokenAccountBalance(ata);
								if (ataBalance.value.amount === "0") {
									console.log("Account empty. Closing ATA...");

									const closeIx = createCloseAccountInstruction(
										ata,      // Associated Token Account to close
										payer,    // Rent goes back to the payer
										payer     // Wallet that owns the ATA
									);

									const closeTransaction = new Transaction().add(closeIx);
									const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
									console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
								} else {
									console.log("ATA still has balance, not closing.");
								}
							} else {
								console.log("Error selling tokens:", response3.statusText);
							}
							const amountInSol = ammo*.25;

							// // 🛠 Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
							const amountInLamports = amountInSol * 10 ** 9;
							
							


							
							
							const transaction = new Transaction().add(
								SystemProgram.transfer({
								  fromPubkey: wallet.publicKey,
								  toPubkey: grace,
								  lamports: amountInLamports,
								})
							  );

							  (async () => {
								try {
								  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
								  console.log(`✅ Transaction successful! Hash: ${signature}`);
								} catch (error) {
								  console.error("❌ Error sending SOL:", error);
								}
							})




							// }
							console.log('BUYING NUKE ON PUMP')
							console.log('BUYING')
							console.log('BUYING')
							console.log('BUYING')
							console.log('BUYING')
							console.log('BUYING')
							console.log('BUYING')
							await sleep(3000)

							const response7 = await fetch(`https://pumpportal.fun/api/trade-local`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									"publicKey": payer.toBase58(),
									"action": "buy",
									"mint": mint,
									"denominatedInSol": "true",
									"amount": ammo,
									"slippage": dynamicSlippage,
									"priorityFee": 0.000005,
									"pool": "auto"
								})
							});
							console.log(`dynamic slippage ${dynamicSlippage}`)
							console.log('target predictions hit for swap')
							console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

							if (response7.status === 200) {
								const data = await response7.arrayBuffer();
								const tx = VersionedTransaction.deserialize(new Uint8Array(data));

								// Sign the versioned transaction
								const secretKeyString = bs58.encode(wallet.secretKey);
								const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
								await tx.sign([signerKeyPair]);

								// Send the transaction
								const signature = await connection.sendRawTransaction(tx.serialize());
								console.log("Trade Transaction: https://solscan.io/tx/" + signature);
							} else {
								console.log("Error:", response7.statusText);
							}
							await sleep(8000)
							const info0 = await connection.getTokenAccountBalance(ata);
							if (info0.value.uiAmount == null) throw new Error('No balance found');
							console.log('Balance): ', info0.value.uiAmount);
							console.log('Balance to transfer to grace): ', info0.value.uiAmount*0.25);

							const tx2 = new Transaction();
							tx2.add(
							  createTransferCheckedInstruction(
								tokenAccount1Pubkey,
								mint,
								tokenAccount2Pubkey,
								prevOwner.publicKey,
								info0.value.uiAmount, // Amount you are transferring. 
								mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
							  )
							);

							// const txhash2 = await sendAndConfirmTransaction(connection,tx1, [prevOwner]);
							// console.log(`Sent Transaction hash: ${txhash2}`);
							// await sleep(8000)
						
							if (side === 'Buy') {


								
								const ammo = 0.0001
								
								console.log('BUYING NUKE ON PUMP')
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')
								console.log('BUYING')
								await sleep(3000)

								const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										"publicKey": payer.toBase58(),
										"action": "buy",
										"mint": mint,
										"denominatedInSol": "true",
										"amount": ammo,
										"slippage": dynamicSlippage,
										"priorityFee": 0.000005,
										"pool": "auto"
									})
								});
								console.log(`dynamic slippage ${dynamicSlippage}`)
								console.log('target predictions hit for swap')
								console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

								if (response.status === 200) {
									const data = await response.arrayBuffer();
									const tx = VersionedTransaction.deserialize(new Uint8Array(data));

									// Sign the versioned transaction
									const secretKeyString = bs58.encode(wallet.secretKey);
									const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
									await tx.sign([signerKeyPair]);

									// Send the transaction
									const signature = await connection.sendRawTransaction(tx.serialize());
									console.log("Trade Transaction: https://solscan.io/tx/" + signature);
								} else {
									console.log("Error:", response.statusText);
								}




							const info1 = await connection.getTokenAccountBalance(ata);
							if (info1.value.uiAmount == null) throw new Error('No balance found');
							console.log('Balance): ', info1.value.uiAmount);
							console.log('Balance to transfer to grace): ', info1.value.uiAmount*0.25);

								const tx1 = new Transaction();
								tx1.add(
								  createTransferCheckedInstruction(
									tokenAccount1Pubkey,
									mint,
									tokenAccount2Pubkey,
									prevOwner.publicKey,
									BigInt(Math.round(info1.value.uiAmount *0.25 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
									mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
								  )
								);
	
								const txhash = await sendAndConfirmTransaction(connection,tx1, [prevOwner]);
								console.log(`Sent Transaction hash: ${txhash}`);
								await sleep(8000)
								console.log('SELLING90UKE ON PUMP')
								let amountToSell = "60%"; // Default sell amount (60%)
								if (dynamicSlippage > 0.05) {
									// If slippage is greater than 5%, sell a larger portion (e.g., 80%)
									amountToSell = "80%";
									console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)
								} else if (dynamicSlippage < 0.02) {
									// If slippage is lower than 2%, sell a smaller portion (e.g., 40%)
									amountToSell = "75%";
									console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)

								}


								const response3 = await fetch(`https://pumpportal.fun/api/trade-local`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										"publicKey": payer.toBase58(),
										"action": "sell",
										"mint": mint,
										"denominatedInSol": "false",
										"amount": amountToSell,
										"slippage": dynamicSlippage,
										"priorityFee": 0.000005,
										"pool": "auto"
									})
								});

								if (response3.status === 200) {
									const data = await response3.arrayBuffer();
									const tx = VersionedTransaction.deserialize(new Uint8Array(data));

									// Sign the transaction
									const secretKeyString = bs58.encode(wallet.secretKey);
									const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
									await tx.sign([signerKeyPair]);

									// Send the transaction
									const signature = await connection.sendRawTransaction(tx.serialize());
									console.log("Sell Transaction: https://solscan.io/tx/" + signature);

									// Wait for confirmation before proceeding to close
									await connection.confirmTransaction(signature, "finalized");

									// Check if the ATA is now empty
									const ataBalance = await connection.getTokenAccountBalance(ata);
									if (ataBalance.value.amount === "0") {
										console.log("Account empty. Closing ATA...");

										const closeIx = createCloseAccountInstruction(
											ata,      // Associated Token Account to close
											payer,    // Rent goes back to the payer
											payer     // Wallet that owns the ATA
										);

										const closeTransaction = new Transaction().add(closeIx);
										const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
										console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
									} else {
										console.log("ATA still has balance, not closing.");
									}
								} else {
									console.log("Error selling tokens:", response3.statusText);
								}

								const amountInSol = ammo*.25;

								// 🛠 Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
								const amountInLamports = amountInSol * 10 ** 9;
								const transaction = new Transaction().add(
									SystemProgram.transfer({
									  fromPubkey: wallet.publicKey,
									  toPubkey: grace,
									  lamports: amountInLamports,
									
									})
								  );
	
								//   (async () => {
								// 	try {
									  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
									  console.log(`✅ Transaction successful! Hash: ${signature}`);
									// } catch (error) {
									//   console.error("❌ Error sending SOL:", error);
								// 	}
								// })

								// const amountInLamports = amountInSol * 10 ** 9;



							const info2 = await connection.getTokenAccountBalance(ata);
							if (info2.value.uiAmount == null) throw new Error('No balance found');
							console.log('Balance): ', info2.value.uiAmount);
							console.log('Balance to transfer to grace): ', info2.value.uiAmount*0.25);

								const tx0 = new Transaction();
								tx0.add(
								  createTransferCheckedInstruction(
									tokenAccount1Pubkey,
									mint,
									tokenAccount2Pubkey,
									prevOwner.publicKey,
									BigInt(Math.round(info2.value.uiAmount *0.25 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
									mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
								  )
								);
	
								const txhash0 = await sendAndConfirmTransaction(connection,tx0, [prevOwner]);
								console.log(`Sent Transaction hash: ${txhash0}`);



								console.log('SELLING NUKE ON PUMP')
								// let amountToSell = "98%"; // Default sell amount (60%)
								// let amountToSell = "60%"; // Default sell amount (60%)
								// let amountToSell = "60%"; // Default sell amount (60%)
								if (dynamicSlippage > 0.05) {
									// If slippage is greater than 5%, sell a larger portion (e.g., 80%)
									amountToSell = "80%";
									console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)
								} else if (dynamicSlippage < 0.02) {
									// If slippage is lower than 2%, sell a smaller portion (e.g., 40%)
									amountToSell = "75%";
									console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)

								}


								const response4 = await fetch(`https://pumpportal.fun/api/trade-local`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										"publicKey": payer.toBase58(),
										"action": "sell",
										"mint": mint,
										"denominatedInSol": "false",
										"amount": amountToSell,
										"slippage": dynamicSlippage,
										"priorityFee": 0.000005,
										"pool": "auto"
									})
								});

								if (response4.status === 200) {
									const data = await response4.arrayBuffer();
									const tx = VersionedTransaction.deserialize(new Uint8Array(data));

									// Sign the transaction
									const secretKeyString = bs58.encode(wallet.secretKey);
									const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
									await tx.sign([signerKeyPair]);

									// Send the transaction
									const signature = await connection.sendRawTransaction(tx.serialize());
									console.log("Sell Transaction: https://solscan.io/tx/" + signature);

									// Wait for confirmation before proceeding to close
									await connection.confirmTransaction(signature, "finalized");
									const amountInSol = ammo*.25;

									// 🛠 Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
									const amountInLamports = amountInSol * 10 ** 9;
									const transaction = new Transaction().add(
										SystemProgram.transfer({
										  fromPubkey: wallet.publicKey,
										  toPubkey: grace,
										  lamports: amountInLamports,
										})
									  );
		
									//   (async () => {
									// 	try {
										  const signature1 = await sendAndConfirmTransaction(connection, transaction, [wallet]);
										  console.log(`✅ Transaction successful! Hash: ${signature1}`);
									// 	} catch (error) {
									// 	  console.error("❌ Error sending SOL:", error);
									// 	}
									// })

							const info3 = await connection.getTokenAccountBalance(ata);
							if (info3.value.uiAmount == null) throw new Error('No balance found');
							console.log('Balance): ', info3.value.uiAmount);
							console.log('Balance to transfer to grace): ', info3.value.uiAmount*0.25);

									const tx1 = new Transaction();
									tx1.add(
									  createTransferCheckedInstruction(
										ata,
										mint,
										grace,
										prevOwner.publicKey,
										BigInt(Math.round(info3.value.uiAmount *0.25 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
										mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
									  )
									);
		
									const txhash = await sendAndConfirmTransaction(connection,tx1, [prevOwner]);
									console.log(`Sent Transaction hash: ${txhash}`);
									// const tx1 = new Transaction();
									// tx1.add(
									//   createTransferCheckedInstruction(
									// 	tokenAccount1Pubkey,
									// 	mint,
									// 	tokenAccount2Pubkey,
									// 	prevOwner.publicKey,
									// 	BigInt(Math.round(info.value.uiAmount *0.25 * 10 ** mintInfo.decimals)), // Amount you are transferring. 
									// 	mintInfo.decimals // Decimals, since this is an NFT you can leave 0. 
									//   )
									// );
		
									// const txhash = await sendAndConfirmTransaction(connection,tx1, [prevOwner]);
									// console.log(`Sent Transaction hash: ${txhash}`);
									// Check if the ATA is now empty
									// const ataBalance = await connection.getTokenAccountBalance(ata);
									// if (ataBalance.value.amount === "0") {
									// 	console.log("Account empty. Closing ATA...");

									// 	const closeIx = createCloseAccountInstruction(
									// 		ata,      // Associated Token Account to close
									// 		payer,    // Rent goes back to the payer
									// 		payer     // Wallet that owns the ATA
									// 	);

									// 	const closeTransaction = new Transaction().add(closeIx);
									// 	const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
									// 	console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
									// } else {
									// 	console.log("ATA still has balance, not closing.");
									// }
								} else {
									console.log("Error selling tokens:", response3.statusText);
								}






								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// console.log('BUYING NUKE ON RAYDIUM')
								// await sleep(8000)
								// const response4 = await fetch(`https://pumpportal.fun/api/trade-local`, {
								// 	method: "POST",
								// 	headers: { "Content-Type": "application/json" },
								// 	body: JSON.stringify({
								// 		"publicKey": payer.toBase58(),
								// 		"action": "buy",
								// 		"mint": "2VtFSGafr5XPtFxDqdSxxSaZyvwLEW17pVKz9cMWSzuC",
								// 		"denominatedInSol": "true",
								// 		"amount": ammo,
								// 		"slippage": dynamicSlippage,
								// 		"priorityFee": 0.000005,
								// 		"pool": "auto"
								// 	})
								// });
								// console.log('target predictions hit for swap')
								// console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

								// if (response4.status === 200) {
								// 	const data = await response4.arrayBuffer();
								// 	const tx = VersionedTransaction.deserialize(new Uint8Array(data));

								// 	// Sign the versioned transaction
								// 	const secretKeyString = bs58.encode(wallet.secretKey);
								// 	const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
								// 	await tx.sign([signerKeyPair]);

								// 	// Send the transaction
								// 	const signature = await connection.sendRawTransaction(tx.serialize());
								// 	console.log("Trade Transaction: https://solscan.io/tx/" + signature);
								// } else {
								// 	console.log("Error:", response4.statusText);
								// }

								// await sleep(4000)
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


							// }
							else

								if (side === 'Sell') {
									console.log(`dynamic slippage ${dynamicSlippage}`)
									console.log('SELLING NUKE ON PUMP');
									let amountToSell = "100%"; // Default sell amount (60%)
									if (dynamicSlippage > 0.05) {
										// If slippage is greater than 5%, sell a larger portion (e.g., 80%)
										amountToSell = "100%";
										console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)
									} else if (dynamicSlippage < 0.02) {
										// If slippage is lower than 2%, sell a smaller portion (e.g., 40%)
										amountToSell = "100%";
										console.log(`slippage: ${dynamicSlippage}, amount to sell: ${amountToSell}`)

									}
									const response6 = await fetch(`https://pumpportal.fun/api/trade-local`, {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											"publicKey": payer.toBase58(),
											"action": "sell",
											"mint": mint,
											"denominatedInSol": "false",
											"amount": amountToSell,
											"slippage": dynamicSlippage,
											"priorityFee": 0.000005,
											"pool": "auto"
										})
									});

									if (response6.status === 200) {
										const data = await response6.arrayBuffer();
										const tx = VersionedTransaction.deserialize(new Uint8Array(data));

										// Sign the transaction
										const secretKeyString = bs58.encode(wallet.secretKey);
										const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
										await tx.sign([signerKeyPair]);

										// Send the transaction
										const signature = await connection.sendRawTransaction(tx.serialize());
										console.log("Sell Transaction: https://solscan.io/tx/" + signature);

										// Wait for confirmation before proceeding to close
										await connection.confirmTransaction(signature, "finalized");

										// Check if the ATA is now empty
										const ataBalance = await connection.getTokenAccountBalance(ata);
										if (ataBalance.value.amount === "0") {
											console.log("Account empty. Closing ATA...");

											const closeIx = createCloseAccountInstruction(
												ata,      // Associated Token Account to close
												payer,    // Rent goes back to the payer
												payer     // Wallet that owns the ATA
											);

											const closeTransaction = new Transaction().add(closeIx);
											const closeSignature = await sendAndConfirmTransaction(connection, closeTransaction, [signerKeyPair]);
											console.log("ATA Closed: https://solscan.io/tx/" + closeSignature);
										} else {
											console.log("ATA still has balance, not closing.");
										}
									} else {
										console.log("Error selling tokens:", response6.statusText);
									}
									// const ammo = 0.0011
									// console.log('BUYING NUKE ON PUMP')
									// console.log('BUYING')
									// console.log('BUYING')
									// console.log('BUYING')
									// console.log('BUYING')
									// console.log('BUYING')
									// console.log('BUYING')
									// await sleep(1000)
									// const response7 = await fetch(`https://pumpportal.fun/api/trade-local`, {
									// 	method: "POST",
									// 	headers: { "Content-Type": "application/json" },
									// 	body: JSON.stringify({
									// 		"publicKey": payer.toBase58(),
									// 		"action": "buy",
									// 		"mint": mint,
									// 		"denominatedInSol": "true",
									// 		"amount": ammo,
									// 		"slippage": dynamicSlippage,
									// 		"priorityFee": 0.000005,
									// 		"pool": "auto"
									// 	})
									// });
									// console.log('target predictions hit for swap')
									// console.log(`Amount: ${ammo}, Address: ${pair_address},Liquidity Prediction: ${liquidityPrediction}, Side:${side}, Price: ${price}, Price Prediction: ${pricePrediction}`);

									// if (response7.status === 200) {
									// 	const data = await response7.arrayBuffer();
									// 	const tx = VersionedTransaction.deserialize(new Uint8Array(data));

									// 	// Sign the versioned transaction
									// 	const secretKeyString = bs58.encode(wallet.secretKey);
									// 	const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
									// 	await tx.sign([signerKeyPair]);

									// 	// Send the transaction
									// 	const signature = await connection.sendRawTransaction(tx.serialize());
									// 	console.log("Trade Transaction: https://solscan.io/tx/" + signature);
									// } else {
									// 	console.log("Error:", response7.statusText);
									// }

									await sleep(1000)
									// await sleep(1000)
									// 	transaction.feePayer = wallet.publicKey;
									// 	transaction.partialSign(wallet)
									// 	// console.log(transaction)
									// 	console.log(transaction)
									// 	console.log('sending transaction')
									// 	connection.sendTransaction(transaction, [wallet], {
									// 		skipPreflight: true,
									// 		preflightCommitment: "confirmed"
									// 	});
									// 	console.log('transaction sent')
									// 	console.log('swap finished')
									// 	sleep(500)
									// 	try {
									// 		const { value } = await connection.simulateTransaction(transaction);

									// 		// Check for logs or errors
									// 		if (value.err) {
									// 			console.error('Simulation failed:', value.err);
									// 		} else {
									// 			console.log('Simulation logs:', value.logs);
									// 		}
									// 	} catch (err) {
									// 		console.error('Error during simulation:', err);
									// 	}
									// return transaction 

								}
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
							// // transaction.add(closeAta);
							// sleep(500)
							// return transaction;
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

		await new Promise(resolve => setTimeout(resolve, 1000)); // Optionally add a delay to avoid busy-waiting
	}
}

processAllFiles()
// swapie()
// while (true){
// swapTx()
// }