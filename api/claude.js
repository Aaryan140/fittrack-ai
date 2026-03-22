// api/gemini.js → kept as claude.js so no frontend changes needed
// Uses Google Gemini 1.5 Flash — free tier, no credit card needed
// Free tier: 15 RPM, 1M tokens/day

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
    // Convert Anthropic message format to Gemini format
    const geminiContents = messages.map(msg => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        };
      }
      // Handle array content (text + images)
      const parts = msg.content.map(part => {
        if (part.type === "text") {
          return { text: part.text };
        }
        if (part.type === "image") {
          return {
            inline_data: {
              mime_type: part.source.media_type,
              data: part.source.data
            }
          };
        }
        return { text: "" };
      });
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts
      };
    });

    // Add system prompt as first user message if provided
    if (system) {
      geminiContents.unshift({
        role: "user",
        parts: [{ text: `SYSTEM INSTRUCTIONS: ${system}` }]
      });
      geminiContents.splice(1, 0, {
        role: "model",
        parts: [{ text: "Understood. I will follow these instructions." }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: max_tokens,
            temperature: 0.7,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data));
      return res.status(response.status).json({ error: data });
    }

    // Convert Gemini response to Anthropic format so frontend works unchanged
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({
      content: [{ type: "text", text }]
    });

  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}