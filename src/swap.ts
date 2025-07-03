import RaydiumSwap from './RaydiumSwap';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import 'dotenv/config';
import { swapConfig } from './swapConfig'; // Import the configuration
import { RPC_URL,wallet } from './config';

/**
 * Performs a token swap on the Raydium protocol.
 * Depending on the configuration, it can execute the swap or simulate it.
 */
export const swapie = async () => {
  /**
   * The RaydiumSwap instance for handling swaps.
   */
  const raydiumSwap = new RaydiumSwap("https://mainnet.helius-rpc.com/?api-key=768e272c-f127-448e-bf68-dd1ba7b86e7b");
  console.log(`Raydium swap initialized`);
  console.log(`Swapping ${swapConfig.tokenAAmount} of ${swapConfig.tokenAAddress} for ${swapConfig.tokenBAddress}...`)

  /**
   * Load pool keys from the Raydium API to enable finding pool information.
   */
  raydiumSwap.loadPoolKeys(swapConfig.liquidityFile);
  console.log(`Loaded pool keys`);

  /**
   * Find pool information for the given token pair.
   */
  const poolInfo = raydiumSwap.findPoolInfoForTokens(swapConfig.tokenAAddress, swapConfig.tokenBAddress);
  console.log(poolInfo)
  if (!poolInfo) {
    console.error('Pool info not found');
    return 'Pool info not found';
  } else {
    console.log('Found pool info');
    console.log(poolInfo.marketBids)
  }

  /**
   * Prepare the swap transaction with the given parameters.
   */
  
};

// swap();