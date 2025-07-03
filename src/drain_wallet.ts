import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  createCloseAccountInstruction,
} from '@solana/spl-token';

import {  RAYDIUM_ACCOUNT_ADDRESS, wallet, SPL_TOKEN_ID,QUICKNODE_API_KEY } from "./config";

import bs58 from "bs58";

import fs from 'fs';
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// Load the private key array from a JSON file
const keys: number[][] = JSON.parse(fs.readFileSync('./private_keys.json', 'utf8'));

// Configure connection and destination
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const DESTINATION_PUBLIC_KEY = new PublicKey('9TqvnNUaKUF162BatKE6A8BY3ydokCptWCQcH9NFkA9v'); // <-- Replace this
const TOKEN_MINT_ADDRESS = new PublicKey('VCPTUmmNHSdeCoadkVDGjDuAAKp2YgG4LZDr2mPM3gt');    // <-- Replace this

async function transferTokenAndSol(keypair: Keypair) {
  const publicKey = keypair.publicKey;
  const tokenAccount = await getAssociatedTokenAddress(TOKEN_MINT_ADDRESS, publicKey);
  const payer = new PublicKey(wallet.publicKey);
  const secretKeyString = bs58.encode(wallet.secretKey);
  const signerKeyPair = Keypair.fromSecretKey(bs58.decode(secretKeyString));
  try {
    const tokenAccInfo = await getAccount(connection, tokenAccount);
    const destinationTokenAccount = await getAssociatedTokenAddress(TOKEN_MINT_ADDRESS, DESTINATION_PUBLIC_KEY);

    const tokenAmount = Number(tokenAccInfo.amount);
    const tx = new Transaction();

    if (tokenAmount > 0) {
      tx.add(
        createTransferInstruction(
          tokenAccount,
          destinationTokenAccount,
          publicKey,
          tokenAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      console.log(`🔁 Added token transfer: ${tokenAmount} tokens`);
    }

    // Always try to close (even if tokenAmount was 0)
    // tx.add(
    //   createCloseAccountInstruction(
    //     tokenAccount,
    //     publicKey,
    //     publicKey
    //   )
    // );
    // console.log(`🧹 Added close account instruction`);

    const tokenSig = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log(`✅ Token transfer & close complete: ${tokenSig}`);
  } catch (err: any) {
    console.log('⚠️ Token transfer/close skipped:', err.message);
  }

  const balance = await connection.getBalance(publicKey);
  if (balance > 5000) {
    const solTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: DESTINATION_PUBLIC_KEY,
        lamports: balance - 5000, // leave rent buffer
      })
    );
    const sig = await sendAndConfirmTransaction(connection, solTx, [keypair]);
    console.log(`✅ SOL transfer complete: ${sig}`);
  } else {
    console.log('❌ Not enough SOL to transfer.');
  }
}

// 🔁 Execute for all wallets
(async () => {
  for (const keyArray of keys) {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
    console.log(`🔑 Processing wallet: ${keypair.publicKey.toBase58()}`);
    await transferTokenAndSol(keypair);
    console.log('⏳ Waiting 3 seconds before next wallet...\n');
    await sleep(3000);
  }
})();
