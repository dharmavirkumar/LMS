const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { GoogleGenAI } = require("@google/genai");

// ================= RATE LIMIT =================
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per user
  message: {
    success: false,
    error: "Too many requests. Please slow down.",
  },
});

// ================= GEMINI INIT =================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ================= PAGE =================
router.get("/", (req, res) => {
  res.render("chat");
});

// ================= CHAT API =================
router.post("/chat", aiLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // ================= GEMINI CALL =================
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
    });

    return res.json({
      success: true,
      reply: response.text,
      provider: "Gemini",
    });

  } catch (error) {
    console.error("❌ Gemini Error:", error);

    // ================= QUOTA ERROR HANDLING =================
    if (error?.status === 429) {
      return res.json({
        success: false,
        reply:
          "⚠️ AI quota limit reached. Please try again later or upgrade your plan.",
        provider: "Quota Limit",
      });
    }

    // ================= GENERAL FALLBACK =================
    return res.json({
      success: false,
      reply:
        "⚠️ AI service temporarily unavailable. Please try again in a few minutes.",
      provider: "Fallback System",
    });
  }
});

module.exports = router;