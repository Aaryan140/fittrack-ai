// api/claude.js — Vercel Serverless Function
// Uses Google Gemini — free tier, no credit card needed

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens = 1000 } = req.body;

  if (!messages) {
    return res.status(400).json({ error: "messages is required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  try {
    // Convert Anthropic format → Gemini format
    const geminiContents = [];

    // Add system prompt as first exchange
    if (system) {
      geminiContents.push({ role: "user", parts: [{ text: `INSTRUCTIONS: ${system}` }] });
      geminiContents.push({ role: "model", parts: [{ text: "Understood." }] });
    }

    // Add messages
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        });
      } else {
        // Array content (text + images)
        const parts = msg.content.map(part => {
          if (part.type === "text") return { text: part.text };
          if (part.type === "image") return {
            inline_data: { mime_type: part.source.media_type, data: part.source.data }
          };
          return { text: "" };
        });
        geminiContents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts
        });
      }
    }

    // Try models in order until one works
    const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let lastError = null;

    for (const model of models) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 }
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // Return in Anthropic format so frontend works unchanged
        return res.status(200).json({ content: [{ type: "text", text }] });
      }

      lastError = data;
      // If rate limited or not found, try next model
      if (data.error?.code === 429 || data.error?.code === 404) continue;
      // Other errors — return immediately
      break;
    }

    console.error("All Gemini models failed:", JSON.stringify(lastError));
    return res.status(500).json({ error: "AI service temporarily unavailable. Please try again in a moment." });

  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}