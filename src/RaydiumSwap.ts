import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction, TransactionMessage } from '@solana/web3.js'
import {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
  LiquidityPoolJsonInfo,
  TokenAccount,
  Token,
  TokenAmount,
  TOKEN_PROGRAM_ID,
  Percent,
  SPL_ACCOUNT_LAYOUT,
} from '@raydium-io/raydium-sdk'
import { Wallet } from '@project-serum/anchor'
import bs58 from 'bs58'
import 'dotenv/config';
import { swapConfig } from './swapConfig'; // Import the configuration
import { FAUNA_API_KEY,wallet } from "./config";
import { query as q, Client } from 'faunadb';
/**
 * Class representing a Raydium Swap operation.
 */
class RaydiumSwap {
  allPoolKeysJson: LiquidityPoolJsonInfo[]
  connection: Connection

    /**
   * Create a RaydiumSwap instance.
   * @param {string} RPC_URL - The RPC URL for connecting to the Solana blockchain.
   * @param {string} WALLET_PRIVATE_KEY - The private key of the wallet in base58 format.
   */
  constructor(RPC_URL: string) {

    this.connection = new Connection(RPC_URL
      , { commitment: 'confirmed' })
  }

   /**
   * Loads all the pool keys available from a JSON configuration file.
   * @async
   * @returns {Promise<void>}
   */
   async loadPoolKeys(liquidityFile: string) {
    const liquidityJsonResp = await fetch(liquidityFile);
    if (!liquidityJsonResp.ok) return
    const liquidityJson = (await liquidityJsonResp.json()) as { official: any; unOfficial: any }
    const allPoolKeysJson = [...(liquidityJson?.official ?? []), ...(liquidityJson?.unOfficial ?? [])]

    this.allPoolKeysJson = allPoolKeysJson
  }

    /**
   * Finds pool information for the given token pair.
   * @param {string} mintA - The mint address of the first token.
   * @param {string} mintB - The mint address of the second token.
   * @returns {LiquidityPoolKeys | null} The liquidity pool keys if found, otherwise null.
   */
  findPoolInfoForTokens(mintA: string, mintB: string) {
    const poolData = this.allPoolKeysJson.find(
      (i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA)
    )

    if (!poolData) return null

    return jsonInfo2PoolKeys(poolData) as LiquidityPoolKeys
  }

    /**
   * Retrieves token accounts owned by the wallet.
   * @async
   * @returns {Promise<TokenAccount[]>} An array of token accounts.
   */








}

export default RaydiumSwap
