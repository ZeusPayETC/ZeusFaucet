const { ethers } = require("ethers");
const { getClient } = require("./redisClient");
const fetch = require("node-fetch");

const COOLDOWN_PERIOD = 24 * 60 * 60; // 24 hours
const RPC_URL = "https://etc.rivet.link";
const CHAIN_ID = 61;
const PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY;
const TOKEN_ADDRESS = "0x66e97838A985cf070B9F955c4025f1C7825de44F";

const TOKEN_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ✅ Telegram alert helper
async function sendTelegramMessage(text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return; // skip silently if not configured

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("Telegram alert failed:", err);
  }
}

// ✅ Extract client IP
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress
  );
}

// ✅ Add CORS headers
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

// ✅ Check rate limit
async function checkRateLimit(redis, ip, address) {
  const now = Math.floor(Date.now() / 1000);
  const ipKey = `faucet:ip:${ip}`;
  const addrKey = `faucet:addr:${address.toLowerCase()}`;

  const ipLast = await redis.get(ipKey);
  if (ipLast && now - ipLast < COOLDOWN_PERIOD) {
    return { allowed: false, reason: "IP address has already requested tokens recently" };
  }

  const addrLast = await redis.get(addrKey);
  if (addrLast && now - addrLast < COOLDOWN_PERIOD) {
    return { allowed: false, reason: "Wallet address has already received tokens recently" };
  }

  return { allowed: true };
}

module.exports = async (req, res) => {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { address } = req.body;
  if (!address) return res.status(400).json({ message: "Address is required" });
  if (!ethers.utils.isAddress(address)) return res.status(400).json({ message: "Invalid address" });

  try {
    const redis = await getClient();
    const clientIP = getClientIP(req);

    // ✅ Rate limit enforcement
    const check = await checkRateLimit(redis, clientIP, address);
    if (!check.allowed) {
      return res.status(429).json({ message: check.reason });
    }

    // ✅ Connect to blockchain
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet);

    const amount = ethers.utils.parseUnits("50000", 18);
    const tx = await token.transfer(address, amount);

    // ✅ Save timestamps
    const now = Math.floor(Date.now() / 1000);
    await redis.set(`faucet:ip:${clientIP}`, now, { EX: COOLDOWN_PERIOD });
    await redis.set(`faucet:addr:${address.toLowerCase()}`, now, { EX: COOLDOWN_PERIOD });

    // ✅ Update counters
    await redis.incr("faucet:totalClaims");
    await redis.incr("faucet:dailyClaims");

    const lastReset = await redis.get("faucet:lastReset");
    if (!lastReset || now - lastReset > COOLDOWN_PERIOD) {
      await redis.set("faucet:lastReset", now);
      await redis.set("faucet:dailyClaims", 0);
    }

    // ✅ Remaining balance
    const decimals = await token.decimals();
    const balance = await token.balanceOf(await wallet.getAddress());
    const remaining = parseFloat(ethers.utils.formatUnits(balance, decimals)).toFixed(2);

    // ✅ Truncate user address for privacy
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

    // ✅ Send Telegram alert
    await sendTelegramMessage(
      `💧 *50,000 ZEUS Claimed!*\n\n` +
      `👤 *User:* \`${truncated}\`\n` +
      `🔗 [View Transaction](https://blockscout.com/etc/mainnet/tx/${tx.hash})\n\n` +
      `🏦 *Remaining Faucet Balance:* ${remaining} ZEUS`
    );

    // ✅ Respond success
    res.status(200).json({
      message: "Tokens sent successfully!",
      transactionHash: tx.hash,
    });
  } catch (error) {
    console.error("Faucet error:", error);

    if (error.code === "INSUFFICIENT_FUNDS") {
      res.status(500).json({ message: "Faucet is out of gas funds. Please try again later." });
    } else if (error.reason?.includes("transfer amount exceeds balance")) {
      res.status(500).json({ message: "Faucet is out of ZEUS tokens. Please try again later." });
    } else {
      res.status(500).json({ message: "Internal server error. Please try again later." });
    }
  }
};
