const { createClient } = require("redis");

let client;

async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis connection error:", err));
    await client.connect();
  }
  return client;
}

module.exports = { getClient };
