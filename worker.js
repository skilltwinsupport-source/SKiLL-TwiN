// SkillTwin server: protects the Gemini key and checks the user is logged in.
const SUPABASE_URL = "https://dezusavxdpzaneddries.supabase.co";
const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-flash-latest", "gemini-3-flash-preview", "gemini-2.5-flash"];

const SYSTEM = `You are SkillTwin, a warm, encouraging AI career counsellor for students, graduates and career changers (many in India).
Goal: discover which careers fit the user by talking with them.
Rules:
- Ask exactly ONE short question per message. Never list several questions.
- Use simple English. Keep replies under 90 words until you give suggestions.
- First learn: what they enjoy, school subjects or degree, strengths, things they dislike, how they like to work (people, data, creating, building), what matters to them (money, stability, impact, freedom), and any limits (location, budget, family).
- React briefly to each answer so it feels like a real conversation.
- After about 8 to 10 answers, suggest 3 careers. For each: why it fits them, 2 skills they likely already have, 2 skills to build, and one first step. Then ask which one they want a roadmap for.
- If asked for a roadmap, give clear steps for 0-3, 3-6 and 6-12 months.
- Be honest that these are suggestions, not guarantees. Never invent salaries or statistics.`;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function chat(req, env) {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!env.GEMINI_API_KEY) return json({ error: "Server is missing GEMINI_API_KEY." }, 500);

  const auth = req.headers.get("Authorization") || "";
  const check = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: auth, apikey: req.headers.get("apikey") || "" },
  });
  if (!check.ok) return json({ error: "Please log in again." }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-30);
  if (!msgs.length) return json({ error: "No messages." }, 400);
  const contents = msgs.map(m => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text || "").slice(0, 2000) }],
  }));

  const list = [env.GEMINI_MODEL, ...MODELS].filter(Boolean);
  let lastErr = "AI is unavailable right now.";
  for (const model of list) {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500 },
        }),
      }
    );
    
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const parts = (data.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought);
      const reply = parts.map(p => p.text).join("").trim();
      if (reply) return json({ reply, model });
      lastErr = "The AI returned an empty answer. Try again.";
      continue;
    }
    lastErr = data.error?.message || lastErr;
    
  }
  return json({ error: lastErr }, 502);
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === "/api/chat") return chat(req, env);
    return env.ASSETS.fetch(req);
  },
};
