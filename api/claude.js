// api/claude.js — Vercel Serverless Function
// Uses Google Gemini free tier

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, system, max_tokens = 1000 } = req.body;

  if (!messages) return res.status(400).json({ error: "messages is required" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  // Convert Anthropic format to Gemini format
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
        return { text: "" };
      });
      geminiContents.push({ role, parts });
    }
  }

  // Try models with retry on rate limit
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: { maxOutputTokens: max_tokens, temperature: 0.4 },
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

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = data.candidates[0].content.parts[0].text;
          return res.status(200).json({ content: [{ type: "text", text }] });
        }

        // Rate limited — wait and retry
        if (data.error?.code === 429) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        // Model not found — try next
        if (data.error?.code === 404) break;

        console.error(`Gemini ${model} attempt ${attempt} error:`, JSON.stringify(data));
        break;

      } catch (err) {
        console.error(`Gemini ${model} attempt ${attempt} exception:`, err.message);
      }
    }
  }

  return res.status(503).json({ error: "AI service temporarily unavailable. Please try again in a moment." });
}