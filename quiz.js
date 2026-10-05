// SkillTest: AI-made multiple-choice tests, saved to the Skill Passport. Loaded after chat.js.
(function () {
  const css = `
  #quiz{max-height:68vh;overflow-y:auto}
  #quiz .qtitle{font-size:18px;font-weight:700;margin:2px 0 6px;line-height:1.35}
  #quiz .chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
  #quiz .chip{border:1.5px solid var(--teal);background:#fff;color:var(--teal);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  #quiz .opt{display:block;width:100%;text-align:left;margin-top:8px;padding:12px;border:1.5px solid var(--line);border-radius:10px;background:#fff;font:inherit;font-size:15px;color:var(--ink);cursor:pointer}
  #quiz .opt.ok{border-color:var(--ok);background:#e6f4ec}
  #quiz .opt.bad{border-color:var(--err);background:#fde8e6}
  #quiz .why{margin-top:10px;font-size:14px;line-height:1.5}
  #quiz .score{font-size:34px;font-weight:700;margin:8px 0}
  #quiz .past{font-size:14px;line-height:1.7;margin-top:6px}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const $$ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  let user = null, qs = [], i = 0, score = 0, skill = "", locked = false;

  async function api(body) {
    const { data } = await sb.auth.getSession();
    const r = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token, apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong.");
    return j;
  }
  async function loadTests() {
    const { data } = await sb.from("assessments").select("skill,score,total,taken_at").eq("user_id", user.id).order("taken_at", { ascending: false });
    return data || [];
  }
  const line = t => "<li>" + esc(cap(t.skill)) + ": <b>" + t.score + "/" + t.total + "</b> (" + Math.round(100 * t.score / t.total) + "%)</li>";

  function show() { $$("chatbox").style.display = "none"; $$("passport").style.display = "none"; $$("quiz").style.display = "block"; }
  function back() { $$("quiz").style.display = "none"; $$("chatbox").style.display = "flex"; }

  async function home() {
    show();
    const q = $$("quiz");
    q.innerHTML = "<div class='row' style='margin:0 0 8px'><button type='button' class='link' id='qback'>Back to chat</button></div>" +
      "<div class='qtitle'>Skill Test</div><p class='sub'>Pick a skill and take a 5-question test. Your score is saved on your Skill Passport.</p>" +
      "<input id='qskill' maxlength='60' placeholder='e.g. Python basics, Communication, Excel'>" +
      "<div class='chips' id='qchips'></div><div id='qpast'></div><button class='btn' id='qgo' type='button'>Start test</button><div class='msg err' id='qmsg' role='alert'></div>";
    $$("qback").onclick = back;
    $$("qgo").onclick = () => start($$("qskill").value);
    try {
      const { data } = await sb.from("passports").select("data").eq("user_id", user.id).maybeSingle();
      const d = (data && data.data) || {};
      const sug = [...(d.skill_gaps || []).slice(0, 4), ...(d.skills_have || []).slice(0, 2)];
      $$("qchips").innerHTML = sug.map(s => "<button type='button' class='chip'>" + esc(s) + "</button>").join("");
      $$("qchips").querySelectorAll(".chip").forEach(c => c.onclick = () => { $$("qskill").value = c.textContent; });
      const past = await loadTests();
      if (past.length) $$("qpast").innerHTML = "<div class='past'><b>Your results</b><ul style='margin:4px 0;padding-left:18px'>" + past.map(line).join("") + "</ul></div>";
    } catch (e) {}
  }

  async function start(s) {
    skill = String(s || "").trim().toLowerCase();
    const msg = $$("qmsg");
    if (skill.length < 2) { msg.textContent = "Type or pick a skill first."; return; }
    msg.textContent = ""; $$("qgo").disabled = true; $$("qgo").textContent = "Building your test...";
    try {
      const j = await api({ messages: [{ role: "user", text: "Skill: " + skill }] });
      qs = j.quiz.questions; i = 0; score = 0; ask();
    } catch (e) { msg.textContent = e.message; $$("qgo").disabled = false; $$("qgo").textContent = "Start test"; }
  }

  function ask() {
    locked = false;
    const q = qs[i];
    $$("quiz").innerHTML = "<div class='meta' style='font-size:12px;color:#46605f'>" + esc(cap(skill)) + " &middot; Question " + (i + 1) + " of " + qs.length + "</div>" +
      "<div class='qtitle'>" + esc(q.q) + "</div>" +
      q.options.map((o, k) => "<button type='button' class='opt' data-k='" + k + "'>" + esc(o) + "</button>").join("") +
      "<div id='qfb'></div>";
    $$("quiz").querySelectorAll(".opt").forEach(b => b.onclick = () => pick(+b.dataset.k));
  }
  function pick(k) {
    if (locked) return; locked = true;
    const q = qs[i], btns = $$("quiz").querySelectorAll(".opt");
    btns[q.answer].classList.add("ok");
    if (k === q.answer) score++; else btns[k].classList.add("bad");
    $$("qfb").innerHTML = "<div class='why'><b>" + (k === q.answer ? "Correct." : "Not quite.") + "</b> " + esc(q.why || "") + "</div>" +
      "<button class='btn' id='qnext' type='button'>" + (i + 1 < qs.length ? "Next question" : "See my score") + "</button>";
    $$("qnext").onclick = () => { i++; i < qs.length ? ask() : finish(); };
  }
  async function finish() {
    const pct = Math.round(100 * score / qs.length);
    const label = pct >= 80 ? "Strong" : pct >= 50 ? "Developing" : "Just starting";
    $$("quiz").innerHTML = "<div class='qtitle'>" + esc(cap(skill)) + "</div><div class='score'>" + score + " / " + qs.length + "</div>" +
      "<p class='sub'>Level: <b>" + label + "</b>. <span id='qsave'>Saving to your Skill Passport...</span></p>" +
      "<button class='btn' id='qagain' type='button'>Test another skill</button>" +
      "<div class='row'><button type='button' class='link' id='qpass'>View Skill Passport</button><button type='button' class='link' id='qback2'>Back to chat</button></div>";
    $$("qagain").onclick = home; $$("qback2").onclick = back;
    $$("qpass").onclick = () => { $$("quiz").style.display = "none"; $$("viewpass").click(); };
    const { error } = await sb.from("assessments").upsert({ user_id: user.id, skill, score, total: qs.length, taken_at: new Date().toISOString() });
    $$("qsave").textContent = error ? "Could not save: " + error.message : "Saved.";
  }

  // Add "Assessed skills" to the passport whenever it is shown
  let busy = false;
  function watch() {
    const p = $$("passport");
    new MutationObserver(async () => {
      if (busy || !p.children.length || p.querySelector("#testsec")) return;
      busy = true;
      try {
        const t = await loadTests();
        if (!p.querySelector("#testsec") && p.children.length) {
          const d = document.createElement("div"); d.id = "testsec";
          d.innerHTML = "<h3>Assessed skills</h3>" + (t.length ? "<ul>" + t.map(line).join("") + "</ul>" : "<p class='meta'>No tests yet. Take a Skill Test from the chat screen.</p>");
          p.appendChild(d);
        }
      } catch (e) {}
      busy = false;
    }).observe(p, { childList: true });
  }

  const orig = window.startChat;
  window.startChat = function (u) {
    orig(u); user = u;
    if ($$("quiz")) return;
    const q = document.createElement("div"); q.id = "quiz"; q.style.display = "none";
    $$("s-home").insertBefore(q, $$("logout"));
    const b = document.createElement("button"); b.type = "button"; b.className = "link"; b.id = "qlink"; b.textContent = "Skill Test";
    b.onclick = home; document.querySelector("#chatbox .tools").prepend(b);
    watch();
  };
})();
