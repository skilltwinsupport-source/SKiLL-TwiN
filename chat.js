// SkillTwin AI career chat + Skill Passport. Loaded by index.html after login.
(function () {
  const css = `
  #chatbox{display:flex;flex-direction:column;height:62vh;min-height:320px}
  #chatlog{flex:1;overflow-y:auto;padding:4px 2px;display:flex;flex-direction:column;gap:10px}
  .bub{max-width:88%;padding:10px 13px;border-radius:14px;font-size:15px;line-height:1.5;word-wrap:break-word}
  .bub.ai{background:#fff;border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
  .bub.me{background:var(--teal);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .bub.err{background:#fde8e6;color:var(--err);border:1px solid #f3b9b4;align-self:flex-start}
  #chatform{display:flex;gap:8px;margin-top:10px}
  #chatform input{flex:1}
  #chatform button{width:auto;margin:0;padding:0 18px}
  .tools{display:flex;gap:6px 16px;flex-wrap:wrap;margin-top:10px}
  #logout{margin-top:10px;background:#46605f}
  #passport{max-height:66vh;overflow-y:auto}
  #passport h3{margin:16px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--teal)}
  #passport ul{margin:0;padding-left:18px;line-height:1.55;font-size:15px}
  #passport .head{font-size:18px;font-weight:700;line-height:1.35;margin:4px 0}
  #passport .car{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:15px}
  #passport .meta{font-size:12px;color:#46605f}
  @media print{body *{visibility:hidden}#passport,#passport *{visibility:visible}#passport{position:absolute;left:0;top:0;width:100%;max-height:none;overflow:visible}.ptools{display:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  let user = null, history = [], busy = false;
  const key = () => "skilltwin_chat_" + user.id;
  const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const $$ = id => document.getElementById(id);

  function build() {
    const home = $$("s-home");
    if ($$("chatbox")) return;
    home.querySelector("h2").textContent = "Your Career Twin";
    home.querySelector(".hello").style.display = "none";
    const box = document.createElement("div"); box.id = "chatbox";
    box.innerHTML = '<div id="chatlog" aria-live="polite"></div>' +
      '<form id="chatform"><input id="chatin" placeholder="Type your answer" autocomplete="off" maxlength="500"><button class="btn" type="submit">Send</button></form>' +
      '<div class="tools"><button type="button" class="link" id="savepass">Save to Skill Passport</button><button type="button" class="link" id="viewpass">My Skill Passport</button><button type="button" class="link" id="restart">Start over</button></div>';
    const pp = document.createElement("div"); pp.id = "passport"; pp.style.display = "none";
    home.insertBefore(box, $$("logout")); home.insertBefore(pp, $$("logout"));
    $$("chatform").addEventListener("submit", e => {
      e.preventDefault(); const i = $$("chatin"); const t = i.value.trim();
      if (t) { i.value = ""; send(t); }
    });
    $$("restart").addEventListener("click", () => {
      if (busy) return; history = []; localStorage.removeItem(key()); $$("chatlog").innerHTML = ""; begin();
    });
    $$("savepass").addEventListener("click", savePassport);
    $$("viewpass").addEventListener("click", openPassport);
  }
  function add(cls, html) {
    const d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = html;
    const log = $$("chatlog"); log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function save() { try { localStorage.setItem(key(), JSON.stringify(history)); } catch (e) {} }
  async function token() { const { data } = await sb.auth.getSession(); return data.session.access_token; }
  async function api(path, body) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + await token(), apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong.");
    return j;
  }

  async function ask() {
    busy = true; const wait = add("ai", "Thinking...");
    try {
      const j = await api("/api/chat", { messages: history });
      wait.remove();
      history.push({ role: "model", text: j.reply }); save(); add("ai", fmt(j.reply));
    } catch (e) {
      wait.remove(); add("err", esc(e.message) + " Send your message again to retry.");
      if (history.length && history[history.length - 1].role === "user") history.pop();
    }
    busy = false;
  }
  function send(text) { if (busy) return; history.push({ role: "user", text }); add("me", esc(text)); ask(); }
  function begin() { history = [{ role: "user", text: "Hi, I want help finding the right career." }]; ask(); }

  // ---------- Skill Passport ----------
  const list = a => Array.isArray(a) && a.length ? "<ul>" + a.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "<p class='meta'>Nothing yet.</p>";
  function showPassport(p, when) {
    const careers = (p.top_careers || []).map(c => "<div class='car'><b>" + esc(c.title) + "</b><br>" + esc(c.why) + "</div>").join("") || "<p class='meta'>Nothing yet.</p>";
    $$("passport").innerHTML =
      "<div class='ptools row' style='margin:0 0 8px'><button type='button' class='link' id='pback'>Back to chat</button><button type='button' class='link' id='pprint'>Print / Save as PDF</button></div>" +
      "<div class='meta'>SKILL PASSPORT &middot; " + esc(user.email) + (when ? " &middot; Updated " + esc(new Date(when).toLocaleDateString()) : "") + "</div>" +
      "<div class='head'>" + esc(p.headline || "Your career profile") + "</div>" +
      "<h3>Top careers for you</h3>" + careers +
      "<h3>Strengths</h3>" + list(p.strengths) + "<h3>Interests</h3>" + list(p.interests) +
      "<h3>Skills you have</h3>" + list(p.skills_have) + "<h3>Skills to build</h3>" + list(p.skill_gaps) +
      "<h3>Next steps</h3>" + list(p.next_steps);
    $$("chatbox").style.display = "none"; $$("passport").style.display = "block";
    $$("pback").onclick = () => { $$("passport").style.display = "none"; $$("chatbox").style.display = "flex"; };
    $$("pprint").onclick = () => window.print();
  }
  async function savePassport() {
    if (busy) return;
    if (history.filter(m => m.role === "user").length < 5) { add("err", "Answer at least 4 or 5 questions first, then save your passport."); return; }
    busy = true; const wait = add("ai", "Building your Skill Passport...");
    try {
      const j = await api("/api/passport", { messages: history });
      const when = new Date().toISOString();
      const { error } = await sb.from("passports").upsert({ user_id: user.id, data: j.passport, updated_at: when });
      wait.remove();
      if (error) throw new Error("Could not save: " + error.message);
      showPassport(j.passport, when);
    } catch (e) { wait.remove(); add("err", esc(e.message)); }
    busy = false;
  }
  async function openPassport() {
    if (busy) return;
    const { data, error } = await sb.from("passports").select("data,updated_at").eq("user_id", user.id).maybeSingle();
    if (error) { add("err", "Could not load your passport: " + esc(error.message)); return; }
    if (!data) { add("err", "No Skill Passport yet. Chat a little, then tap Save to Skill Passport."); return; }
    showPassport(data.data, data.updated_at);
  }

  window.startChat = function (u) {
    user = u; build();
    $$("passport").style.display = "none"; $$("chatbox").style.display = "flex";
    $$("chatlog").innerHTML = "";
    try { history = JSON.parse(localStorage.getItem(key()) || "[]"); } catch (e) { history = []; }
    if (!history.length) return begin();
    history.forEach((m, i) => { if (i === 0 && m.role === "user") return; add(m.role === "model" ? "ai" : "me", m.role === "model" ? fmt(m.text) : esc(m.text)); });
  };
})();
