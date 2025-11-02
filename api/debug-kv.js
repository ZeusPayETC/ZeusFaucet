const { getClient } = require("./redisClient");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const redis = await getClient();

    // ✅ Write a quick test key/value
    await redis.set("debug:test", "Redis connection successful!", { EX: 60 });

    // ✅ Retrieve it back
    const value = await redis.get("debug:test");

    res.status(200).json({
      status: "ok",
      message: "Redis KV connection successful!",
      testKeyValue: value,
      info: {
        redisUrl: process.env.REDIS_URL ? "✅ Found" : "❌ Missing",
        time: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Debug KV Error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
      stack: error.stack,
    });
  }
};
