const { ethers } = require('ethers');
const kv = require('@vercel/kv');

const COOLDOWN_PERIOD = 24 * 60 * 60; // 24 hours in seconds
const RPC_URL = 'https://www.ethercluster.com/etc';
const CHAIN_ID = 61;
const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const TOKEN_ADDRESS = '0x66e97838A985cf070B9F955c4025f1C7825de44F';

const TOKEN_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress;
}

async function checkRateLimit(ip, address) {
  const now = Math.floor(Date.now() / 1000);
  const ipKey = `faucet:ip:${ip}`;
  const addressKey = `faucet:addr:${address.toLowerCase()}`;
  
  // Check IP limit
  const ipLastRequest = await kv.get(ipKey);
  if (ipLastRequest && (now - ipLastRequest) < COOLDOWN_PERIOD) {
    return { allowed: false, reason: 'IP address has already requested tokens recently' };
  }
  
  // Check address limit
  const addrLastRequest = await kv.get(addressKey);
  if (addrLastRequest && (now - addrLastRequest) < COOLDOWN_PERIOD) {
    return { allowed: false, reason: 'Wallet address has already received tokens recently' };
  }
  
  return { allowed: true };
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ message: 'Address is required' });
  }
  
  if (!ethers.utils.isAddress(address)) {
    return res.status(400).json({ message: 'Invalid Ethereum address' });
  }

  try {
    const clientIP = getClientIP(req);
    
    // Check rate limits
    const rateLimitCheck = await checkRateLimit(clientIP, address);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ message: rateLimitCheck.reason });
    }

    // Initialize blockchain connection
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

    // Send tokens
    const amount = ethers.utils.parseUnits('50000', 18);
    const tx = await tokenContract.transfer(address, amount);

    // Update rate limiting in KV store
    const now = Math.floor(Date.now() / 1000);
    await kv.set(`faucet:ip:${clientIP}`, now, { ex: COOLDOWN_PERIOD });
    await kv.set(`faucet:addr:${address.toLowerCase()}`, now, { ex: COOLDOWN_PERIOD });

    res.status(200).json({ 
      message: `Tokens sent! Transaction: https://blockscout.com/etc/mainnet/tx/${tx.hash}`,
      transactionHash: tx.hash
    });
    
  } catch (error) {
    console.error('Faucet error:', error);
    
    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      return res.status(500).json({ message: 'Faucet out of gas funds. Please try again later.' });
    } else if (error.reason?.includes('transfer amount exceeds balance')) {
      return res.status(500).json({ message: 'Faucet out of ZEUS tokens. Please try again later.' });
    } else if (error.message?.includes('Unexpected token')) {
      return res.status(500).json({ message: 'Service temporarily unavailable. Please try again later.' });
    } else {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
  }
};