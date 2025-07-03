import {
  PublicKey,
  TransactionInstruction,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram, TransactionMessage, VersionedTransaction
} from "@solana/web3.js";
import { connection, RAYDIUM_ACCOUNT_ADDRESS, wallet, SPL_TOKEN_ID } from "./config";
import { Connection } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, createCloseAccountInstruction } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
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
import path from 'path';
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

const CONNECTION = new Connection(RPC_ENDPOINT, {
  commitment: providerOptions.commitment,
  confirmTransactionInitialTimeout,
});
const fs = require('fs');

async function sendLocalCreateTx() {
  const secretKeyString = bs58.encode(wallet.secretKey);
  const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
  const mintKeypair = Keypair.generate();
  const payer = new PublicKey(wallet.publicKey);
  // const ata = await getAssociatedTokenAddress(new PublicKey(mintKeypair.publicKey.toBase58()), payer, false);
  // // Check if ATA exists

  // const ataInfo = await connection.getAccountInfo(ata);
  // let ataSignature: string | null = null;
  // // // Check if ATA exists
  // // const ataInfo = await connection.getAccountInfo(ata);
  // // const transaction = new Transaction();

  // if (!ataInfo) {
  //   console.log("ATA does not exist, creating it...");
  //   const ataTransaction = new Transaction().add(
  //     createAssociatedTokenAccountInstruction(
  //       payer,  // Payer for account creation
  //       ata,    // Associated token account address
  //       payer,  // Wallet owner
  //       new PublicKey(mintKeypair.publicKey.toBase58())   // Token mint
  //     )
  //   )
  // }


  // Define token metadata
  const formData = new FormData();

const filePath = path.resolve(__dirname, './nukeV2.jpg');
const fileContent = fs.readFileSync(filePath);

  formData.append("file", await fs.openAsBlob(filePath)), // Image file
    formData.append("name", "NukeBot Pro AI"),
    formData.append("symbol", "NukeEm"),
    formData.append("description", "THE OFFICIAL NUKEBOT PRO AI BOT MODEL FOR LIQUIDITY PROVIONING ON SOLANA. "),
    formData.append("twitter", "https://x.com/NukeBotTrading"),
    formData.append("telegram", ""),
    formData.append("website", `https://solscan.io/account/${mintKeypair.publicKey}`),
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "publicKey": payer.toBase58(),
      "action": "create",
      "tokenMetadata": {
        name: metadataResponseJSON.metadata.name,
        symbol: metadataResponseJSON.metadata.symbol,
        uri: metadataResponseJSON.metadataUri
      },
      "mint": mintKeypair.publicKey.toBase58(),
      "denominatedInSol": "true",
      "amount": 0.04, // dev buy of 1 SOL
      "slippage": 10,
      "priorityFee": 0.0005,
      "pool": "pump"
    })
  });




  if (response.status === 200) { // successfully generated transaction
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    tx.sign([mintKeypair, signerKeyPair]);
    const signature = await connection.sendTransaction(tx)
    console.log("Transaction: https://solscan.io/tx/" + signature);
    console.log(`${mintKeypair.publicKey}`)
  } else {
    console.log(response.statusText); // log error
  }

  console.log('SELLING');

  const response2 = await fetch(`https://pumpportal.fun/api/trade-local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "publicKey": payer.toBase58(),
      "action": "sell",
      "mint": mintKeypair.publicKey.toBase58(),
      "denominatedInSol": "false",
      "amount": "3%",
      "slippage": 10,
      "priorityFee": 0.001,
      "pool": "pump"
    })
  });

  if (response2.status === 200) {
    const data = await response2.arrayBuffer();
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
  }


}

sendLocalCreateTx();