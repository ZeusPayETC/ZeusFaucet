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

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const startTime = Date.now();

  try {
    const redis = await getClient();

    // --- Check Redis KV ---
    const redisTestKey = `health:test:${Date.now()}`;
    await redis.set(redisTestKey, "ok", { EX: 30 });
    const redisValue = await redis.get(redisTestKey);
    const redisOk = redisValue === "ok";

    // --- Check Ethereum Classic RPC ---
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const latestBlock = await provider.getBlockNumber();
    const rpcOk = Number.isInteger(latestBlock);

    // --- Check faucet wallet + ZEUS token ---
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    const etcBalance = parseFloat(ethers.utils.formatEther(await provider.getBalance(walletAddress)));
    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
    const decimals = await token.decimals();
    const tokenBalance = parseFloat(ethers.utils.formatUnits(await token.balanceOf(walletAddress), decimals));

    const etcOk = etcBalance > 0.001;
    const tokenOk = tokenBalance > 50000;

    const healthy = rpcOk && redisOk && etcOk && tokenOk;

    res.status(200).json({
      status: healthy ? "✅ Healthy" : "⚠️ Degraded",
      uptimeSeconds: Math.floor(process.uptime()),
      latencyMs: Date.now() - startTime,
      components: {
        redis: redisOk ? "ok" : "error",
        rpc: rpcOk ? "ok" : "error",
        wallet: walletAddress,
        etcBalance: `${etcBalance.toFixed(6)} ETC`,
        zeusBalance: `${tokenBalance.toFixed(2)} ZEUS`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "❌ Unhealthy",
      message: error.message,
      stack: error.stack,
      latencyMs: Date.now() - startTime,
    });
  }
};
