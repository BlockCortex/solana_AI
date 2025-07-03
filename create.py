# from solders.keypair import Keypair

# # from solders import
# kp = Keypair()
# assert kp == Keypair.from_bytes(bytes(kp))
# print(kp
# )
import solana 
print(solana)
from solana.rpc.api import Client
from solana.publickey import PublicKey
from solana.transaction import Transaction
from solana.system_program import transfer_checked
from solana.token_program import TokenProgram, transfer, approve
from solders.swap import Swap

rpc_url = 'https://api.mainnet-beta.solana.com'
client = Client(rpc_url)

# Initialize account and token addresses
sender_account = PublicKey("YOUR_SENDER_ACCOUNT_ADDRESS")
token_program_id = PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")

# Initialize Raydium's token address
raydium_token_address = PublicKey("RAYDIUM_TOKEN_ADDRESS")

# Initialize amount to swap and destination account
amount_to_swap = 1_000_000_000  # Example: 1 Solana
destination_account = PublicKey("DESTINATION_ACCOUNT_ADDRESS")

# Approve token transfer from sender account to Raydium
approve_instruction = approve(
    sender_account,
    client.get_recent_blockhash()["blockhash"],
    10,  # Maximum number of tokens to approve
    raydium_token_address,
    PublicKey("RAYDIUM_SWAP_PROGRAM_ADDRESS")
)

# Construct transaction
tx = Transaction().add(approve_instruction)

# Sign transaction
tx.sign(sender_account)

# Send transaction
tx_sig = client.send_transaction(tx)

print(f"Transaction sent: {tx_sig}")
