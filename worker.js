// SkillTwin server: protects the Gemini key and checks the user is logged in.
const SUPABASE_URL = "https://dezusavxdpzaneddries.supabase.co";
const MODELS = ["gemini-3.1-flash-lite-preview", "gemini-flash-latest", "gemini-3-flash-preview", "gemini-2.5-flash"];

const CHAT_SYSTEM = `You are SkillTwin, a warm, encouraging AI career counsellor for students, graduates and career changers (many in India).
Goal: discover which careers fit the user by talking with them.
Rules:
- Ask exactly ONE short question per message. Never list several questions.
- Use simple English. Keep replies under 90 words until you give suggestions.
- First learn: what they enjoy, school subjects or degree, strengths, things they dislike, how they like to work (people, data, creating, building), what matters to them (money, stability, impact, freedom), and any limits (location, budget, family).
- React briefly to each answer so it feels like a real conversation.
- After about 8 to 10 answers, suggest 3 careers. For each: why it fits them, 2 skills they likely already have, 2 skills to build, and one first step. Then ask which one they want a roadmap for.
- If asked for a roadmap, give clear steps for 0-3, 3-6 and 6-12 months.
- SkillTwin serves ALL fields: Commerce (accounting, finance, banking, taxation, CA/CMA/CFA, business), Arts and Humanities (law, teaching, journalism, design, civil services, psychology), Science (medicine, nursing, research, biotech, pharma), Engineering/IT, and vocational careers. Never assume the user wants a tech career.
- Your FIRST question must ask their stream or field of study (for example Commerce, Arts, Science, Engineering/IT, Medical, Law, or other). Tailor every later question and all career suggestions to that field.
- Suggest tech careers only if the user's answers point to them.
- Be honest that these are suggestions, not guarantees. Never invent salaries or statistics.`;

const PASSPORT_SYSTEM = `Build a career profile from the conversation. Reply with ONLY valid JSON, no markdown, with these keys:
headline (string, max 14 words), interests (array of short strings), strengths (array), skills_have (array), skill_gaps (array),
top_careers (array of up to 3 objects {"title": string, "why": string under 25 words}), next_steps (array of up to 4 short strings).
Use only what the user said or clear inferences from it.`;

const QUIZ_SYSTEM = `Create a 5-question multiple choice test on the skill the user names, for a beginner to intermediate learner.
Reply with ONLY valid JSON, no markdown: {"questions":[{"q": string, "options": [4 short strings], "answer": integer 0-3 (index of the single correct option), "why": string under 25 words}]}.
Make questions practical and clear. The skill can be from ANY field, for example GST and taxation, financial accounting, Tally, economics, business law, English communication, biology, teaching methods or programming. Vary which position holds the correct answer. If the input is not a real skill, reply {"questions":[]}.`;

const ROADMAP_SYSTEM = `Create a practical career roadmap for the career the user names. Use their skills if they are given.
Reply with ONLY valid JSON, no markdown: {"career": string, "phases":[{"title":"0-3 months","goal": string under 15 words,"steps":[3 to 4 strings]},{"title":"3-6 months","goal":...,"steps":[...]},{"title":"6-12 months","goal":...,"steps":[...]}]}.
Exactly 3 phases. Each step is one concrete action under 18 words: a topic to learn, a project to build, or something to practise. Order steps from easiest to hardest. The career can be from any field, such as Chartered Accountant, Bank PO, Financial Analyst, Lawyer, Teacher, Nurse, Journalist or Designer. Include relevant exams, certifications or degrees where they apply, but never invent dates or fees.`;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

async function gemini(env, contents, system, extra = {}) {
  const list = [env.GEMINI_MODEL, ...MODELS].filter(Boolean);
  let last = "AI is unavailable right now.";
  for (const model of list) {
    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 1500, ...extra },
        }),
      }
    );
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const parts = (data.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought);
      const reply = parts.map(p => p.text).join("").trim();
      if (reply) return { reply, model };
      last = "The AI returned an empty answer. Try again.";
      continue;
    }
    last = data.error?.message || last;
  }
  return { error: last };
}

async function prepare(req, env) {
  if (req.method !== "POST") return { res: json({ error: "Use POST." }, 405) };
  if (!env.GEMINI_API_KEY) return { res: json({ error: "Server is missing GEMINI_API_KEY." }, 500) };
  const check = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: req.headers.get("Authorization") || "", apikey: req.headers.get("apikey") || "" },
  });
  if (!check.ok) return { res: json({ error: "Please log in again." }, 401) };
  let body;
  try { body = await req.json(); } catch { return { res: json({ error: "Bad request." }, 400) }; }
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-30);
  if (!msgs.length) return { res: json({ error: "No messages." }, 400) };
  const contents = msgs.map(m => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: String(m.text || "").slice(0, 2000) }],
  }));
  return { contents };
}

async function chat(req, env) {
  const p = await prepare(req, env); if (p.res) return p.res;
  const out = await gemini(env, p.contents, CHAT_SYSTEM);
  return out.error ? json({ error: out.error }, 502) : json({ reply: out.reply, model: out.model });
}

async function passport(req, env) {
  const p = await prepare(req, env); if (p.res) return p.res;
  p.contents.push({ role: "user", parts: [{ text: "Now output the JSON career profile." }] });
  const out = await gemini(env, p.contents, PASSPORT_SYSTEM, { temperature: 0.2, responseMimeType: "application/json" });
  if (out.error) return json({ error: out.error }, 502);
  try {
    const obj = JSON.parse(out.reply.replace(/^```(?:json)?|```$/gm, "").trim());
    return json({ passport: obj });
  } catch { return json({ error: "Could not build the passport. Please try again." }, 502); }
}

async function quiz(req, env) {
  const p = await prepare(req, env); if (p.res) return p.res;
  const out = await gemini(env, p.contents, QUIZ_SYSTEM, { temperature: 0.6, responseMimeType: "application/json" });
  if (out.error) return json({ error: out.error }, 502);
  try {
    const obj = JSON.parse(out.reply.replace(/^```(?:json)?|```$/gm, "").trim());
    const qs = (obj.questions || []).filter(q => q && q.q && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3);
    if (qs.length < 3) return json({ error: "Could not build a test for that. Try a more specific skill, like 'Python basics'." }, 422);
    return json({ quiz: { questions: qs.slice(0, 6) } });
  } catch { return json({ error: "Could not build the test. Please try again." }, 502); }
}

async function roadmap(req, env) {
  const p = await prepare(req, env); if (p.res) return p.res;
  const out = await gemini(env, p.contents, ROADMAP_SYSTEM, { temperature: 0.5, maxOutputTokens: 2000, responseMimeType: "application/json" });
  if (out.error) return json({ error: out.error }, 502);
  try {
    const obj = JSON.parse(out.reply.replace(/^```(?:json)?|```$/gm, "").trim());
    const phases = (obj.phases || []).slice(0, 3).map(ph => ({
      title: String(ph.title || "").slice(0, 40), goal: String(ph.goal || "").slice(0, 120),
      steps: (Array.isArray(ph.steps) ? ph.steps : []).slice(0, 5).map(t => ({ t: String(t).slice(0, 200), done: false })),
    })).filter(ph => ph.steps.length);
    if (phases.length < 2) return json({ error: "Could not build a roadmap for that. Try a clearer career name." }, 422);
    return json({ roadmap: { career: String(obj.career || "Your career").slice(0, 80), phases } });
  } catch { return json({ error: "Could not build the roadmap. Please try again." }, 502); }
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    if (pathname === "/api/chat") return chat(req, env);
    if (pathname === "/api/passport") return passport(req, env);
    if (pathname === "/api/quiz") return quiz(req, env);
    if (pathname === "/api/roadmap") return roadmap(req, env);
    return env.ASSETS.fetch(req);
  },
};
