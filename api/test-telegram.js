const fetch = require("node-fetch");

module.exports = async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // --- CORS headers for browser testing ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!token || !chatId) {
    return res.status(400).json({
      status: "error",
      message:
        "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables.",
    });
  }

  try {
    const testMessage = `🧪 *ZEUS Faucet Bot Test*\n\n✅ Telegram connection working!\n\nTime: ${new Date().toLocaleString()}`;

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Telegram API error: ${data.description || "Unknown error"}`
      );
    }

    res.status(200).json({
      status: "ok",
      message: "Test message sent successfully!",
      telegramResponse: data,
    });
  } catch (error) {
    console.error("Telegram test error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
