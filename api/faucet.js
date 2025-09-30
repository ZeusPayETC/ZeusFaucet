const { ethers } = require('ethers');

// ETC Network Settings
const RPC_URL = 'https://www.ethercluster.com/etc'; // ETC RPC endpoint
const CHAIN_ID = 61; // ETC chain ID
const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY; // Faucet wallet private key
const TOKEN_ADDRESS = '0x66e97838A985cf070B9F955c4025f1C7825de44F'; // Replace with actual address

// ABI for ERC-20 token transfer
const TOKEN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.body;
  if (!ethers.utils.isAddress(address)) {
    return res.status(400).json({ message: 'Invalid address' });
  }

  try {
    // Initialize provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

    // Send 50000 ZEUS token (adjust amount as needed)
    const amount = ethers.utils.parseUnits('50000', 18); // Assumes 18 decimals
    const tx = await tokenContract.transfer(address, amount);

    res.status(200).json({ 
      message: `Tokens sent! Transaction: https://blockscout.com/etc/mainnet/tx/${tx.hash}` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
