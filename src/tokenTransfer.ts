import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createTransferInstruction,
} from "@solana/spl-token";
import axios from "axios";
import secret from "../guideSecret.json"; // Adjust the path as necessary

interface RpcResponse {
  data: {
    baseMint: string;
    fromWallet: string;
    toWallet: string;
  };
}

// Fetch RPC data
const fetchRpcData = async (): Promise<RpcResponse["data"]> => {
  try {
    const response = await axios.get<RpcResponse>(
      "http://192.168.1.154:5000/response_bot"
    );
    return response.data.data;
  } catch (err) {
    console.error("Error fetching RPC data:", err);
    throw new Error("Failed to fetch RPC data");
  }
};

const main = async (tokenAmount: number) => {
  // Connect to Solana mainnet using Helius RPC
  const connection = new Connection(
    "https://mainnet.helius-rpc.com/?api-key=4696a3b3-efab-47dd-a3e2-b3c79921eaed"
  );

  // Replace with your private key
  const fromWallet = Keypair.fromSecretKey(Uint8Array.from(secret));

  try {
    const rpcData = await fetchRpcData();

    // Use baseMint and toWallet from RPC data
    const mint = new PublicKey(rpcData.baseMint);
    const toWalletPubKey = new PublicKey(rpcData.toWallet);

    console.log("Mint Address:", mint.toBase58());
    console.log("Recipient Wallet Address:", toWalletPubKey.toBase58());

    // Create or retrieve the token account for the sender
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromWallet,
      mint,
      fromWallet.publicKey
    );

    console.log(
      "Sender Token Account Address:",
      fromTokenAccount.address.toBase58()
    );

    // Convert token amount to lamports (6 decimals)
    const amountToMint = tokenAmount * Math.pow(10, 6);

    // Mint tokens to the sender's token account
    await mintTo(
      connection,
      fromWallet,
      mint,
      fromTokenAccount.address,
      fromWallet.publicKey,
      amountToMint
    );

    console.log(`Successfully minted ${tokenAmount} tokens`);

    // Create or retrieve the token account for the recipient
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      fromWallet,
      mint,
      toWalletPubKey
    );

    console.log(
      "Recipient Token Account Address:",
      toTokenAccount.address.toBase58()
    );

    // Transfer tokens to the recipient's token account
    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        amountToMint // Amount to transfer (in lamports)
      )
    );

    // Sign, send, and confirm the transaction
    await sendAndConfirmTransaction(connection, transaction, [fromWallet]);

    console.log(
      `Successfully transferred ${tokenAmount} tokens to ${toWalletPubKey.toBase58()}`
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

// Execute the script with a specified token amount
main(1.15).catch((err) => console.error(err));
