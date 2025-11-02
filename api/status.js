const { ethers } = require("ethers");
const { getClient } = require("./redisClient");

const RPC_URL = "https://etc.rivet.link";
const CHAIN_ID = 61;
const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const TOKEN_ADDRESS = "0x66e97838A985cf070B9F955c4025f1C7825de44F";

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// format helpers (ZEUS fixed 2dp with commas, ETC auto-trim)
function formatNumberFixed2(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatETC(n) {
  let s = Number(n).toFixed(6);
  s = s.replace(/\.?0+$/, ""); // trim trailing zeros
  return s;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const redis = await getClient();
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    // Balances
    const etcWei = await provider.getBalance(walletAddress);
    const etcRaw = parseFloat(ethers.utils.formatEther(etcWei));
    const etcFormatted = formatETC(etcRaw);

    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const decimals = await token.decimals();
    const zeusUnits = await token.balanceOf(walletAddress);
    const zeusRaw = parseFloat(ethers.utils.formatUnits(zeusUnits, decimals));
    const zeusFormatted = formatNumberFixed2(zeusRaw);

    // Counters
    const totalClaims = Number((await redis.get("faucet:totalClaims")) || 0);
    const dailyClaims = Number((await redis.get("faucet:dailyClaims")) || 0);
    const dailyLimit = 500;
    const remainingDaily = Math.max(dailyLimit - dailyClaims, 0);

    res.status(200).json({
      status: "online",
      network: "Ethereum Classic (ETC)",
      walletAddress,
      balances: {
        zeusRaw,
        etcRaw,
        zeusFormatted,   // e.g., "845,000.00"
        etcFormatted,    // e.g., "0.0312"
      },
      faucetStats: {
        totalClaims,
        dailyClaims,
        dailyLimit,
        remainingDaily,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status endpoint error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Internal server error",
    });
  }
};
