// api/claude.js — Vercel Serverless Function
// Uses Google Gemini free tier (gemini-2.5-flash + gemini-2.5-flash-lite)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens = 1000 } = req.body;

  if (!messages) return res.status(400).json({ error: "messages is required" });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  }

  // Convert to Gemini format
  const geminiContents = [];

  if (system) {
    geminiContents.push({ role: "user",  parts: [{ text: `INSTRUCTIONS (follow exactly): ${system}` }] });
    geminiContents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions exactly and return only valid JSON." }] });
  }

  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";
    if (typeof msg.content === "string") {
      geminiContents.push({ role, parts: [{ text: msg.content }] });
    } else {
      const parts = (msg.content || []).map(part => {
        if (part.type === "text")  return { text: part.text };
        if (part.type === "image") return { inline_data: { mime_type: part.source.media_type, data: part.source.data } };
        return null;
      }).filter(Boolean);
      geminiContents.push({ role, parts });
    }
  }

  // Both are free tier as of April 2026
  // gemini-2.5-flash-lite has highest RPD (1000/day) — best for free tier
  // gemini-2.5-flash is fallback (250/day)
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
  let lastError = "AI service temporarily unavailable. Please try again in a moment.";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Trying ${model}, attempt ${attempt + 1}`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: {
                maxOutputTokens: max_tokens,
                temperature: 0.3,
                responseMimeType: "application/json",
              },
              safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              ],
            })
          }
        );

        const data = await response.json();

        // Success
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          console.log(`${model} success, length: ${text.length}`);
          return res.status(200).json({ content: [{ type: "text", text }] });
        }

        // Blocked or empty response
        if (response.ok) {
          const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || "unknown";
          console.warn(`${model} no text, reason: ${reason}`);
          lastError = `${model}: no response text returned (${reason})`;
          break; // try next model
        }

        const errCode = data.error?.code;
        const errMsg  = data.error?.message || "Unknown error";
        console.error(`${model} error ${errCode}: ${errMsg}`);
        lastError = `${model}: ${errMsg}`;

        if (errCode === 429) {
          // Rate limited — wait then retry
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        // Any other error — try next model
        break;

      } catch (err) {
        console.error(`${model} attempt ${attempt + 1} exception:`, err.message);
        lastError = `${model}: ${err.message}`;
        if (attempt === 0) continue;
      }
    }
  }

  return res.status(503).json({ error: lastError });
}
