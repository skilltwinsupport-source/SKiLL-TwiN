// UI shell: hero on login, dark sidebar dashboard + Profile page after login. Loaded last.
(function () {
  if (window.__stUI) return; window.__stUI = true;
  ["theme.css", "dashboard.css"].forEach(h => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = h; document.head.appendChild(l); });
  const $$ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mark = '<svg width="34" height="22" viewBox="0 0 34 22"><circle cx="12" cy="11" r="9" fill="none" stroke="#e9a23b" stroke-width="2.5"/><circle cx="22" cy="11" r="9" fill="none" stroke="#fff" stroke-width="2.5"/></svg>';
  const ic = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const TABS = [
    ["chat", "Chat", '<path d="M4 5h16v11H9l-5 4V5z"/>'],
    ["test", "Tests", '<path d="M5 12l4 4 10-10"/>'],
    ["pass", "Passport", '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>'],
    ["road", "Roadmap", '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 000-6h-4a3 3 0 010-6h6"/>'],
    ["plans", "Plans", '<path d="M3 12l9-9h8v8l-9 9-8-8z"/><circle cx="16" cy="8" r="1.2"/>'],
    ["prof", "Profile", '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'],
  ];
  const VIEW = { chat: "chatbox", test: "quiz", pass: "passport", road: "roadmap", plans: "plans", prof: "profile" };
  const CLICK = { test: "qlink", road: "rmlink", plans: "pllink" };
  const me = { name: "", email: "" };

  // Hero for the login screens
  const hero = document.createElement("div"); hero.id = "hero";
  hero.innerHTML = '<div class="mark">' + mark + '<b>SkillTwin</b></div><div class="eyebrow">AI career intelligence</div>' +
    '<h1>Find the career that fits you, then <em>grow into it.</em></h1>' +
    '<p>Talk to your AI career twin. Get a Skill Passport, a 12-month roadmap and a test for every skill you want to build.</p>' +
    '<div class="chips"><span>AI career chat</span><span>Skill Passport</span><span>12-month roadmap</span><span>Skill tests</span></div>' +
    '<svg class="viz" viewBox="0 0 460 120" fill="none"><path d="M10 95C80 95 90 30 160 40S250 100 310 60 400 20 450 30" stroke="#e9a23b" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>' +
    '<circle cx="10" cy="95" r="7" fill="#fff"/><circle cx="160" cy="40" r="7" fill="#fff"/><circle cx="310" cy="60" r="7" fill="#fff"/><circle cx="450" cy="30" r="9" fill="#e9a23b"/>' +
    '<g fill="#c7dde2" font-size="12" font-family="Sora,sans-serif"><text x="0" y="116">Explore</text><text x="140" y="68">Learn</text><text x="292" y="88">Build</text><text x="410" y="58">Grow</text></g></svg>';
  document.querySelector(".wrap").insertBefore(hero, document.querySelector(".wrap").firstChild);

  // Sidebar
  const side = document.createElement("aside"); side.id = "side";
  side.innerHTML = '<div class="top"><div class="mark">' + mark + '<b>SkillTwin</b></div><button type="button" id="coll" aria-label="Collapse menu">' + ic('<path d="M15 6l-6 6 6 6"/>') + '</button></div>' +
    '<nav id="snav"></nav><div class="foot"><div class="me" id="me" title="Profile"><span class="av" id="av"></span><span class="nm" id="nm"></span></div>' +
    '<button type="button" class="out" id="out2">' + ic('<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>') + '<span>Log out</span></button></div>';
  document.body.appendChild(side);
  const nav = $$("snav");
  TABS.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.dataset.t = t[0]; b.innerHTML = ic(t[2]) + "<span>" + t[1] + "</span>"; b.onclick = () => go(t[0]); nav.appendChild(b); });
  $$("out2").onclick = () => $$("logout").click();
  $$("me").onclick = () => go("prof");
  try { document.body.classList.toggle("collapsed", localStorage.getItem("st_coll") === "1"); } catch (e) {}
  $$("coll").onclick = () => { const v = document.body.classList.toggle("collapsed"); try { localStorage.setItem("st_coll", v ? "1" : "0"); } catch (e) {} };

  // Profile view lives next to the other views
  const pv = document.createElement("div"); pv.id = "profile"; pv.style.display = "none";
  $$("s-home").insertBefore(pv, $$("logout"));

  function paintMe() {
    const n = me.name || (me.email || "").split("@")[0] || "You";
    $$("nm").textContent = n; $$("av").textContent = n.charAt(0).toUpperCase();
  }
  async function loadMe() {
    if (typeof sb === "undefined" || !sb) return;
    const { data } = await sb.auth.getSession(); const u = data.session && data.session.user; if (!u) return;
    me.email = u.email; me.name = (u.user_metadata && u.user_metadata.name) || ""; paintMe();
  }

  async function renderProfile() {
    pv.innerHTML = "<p class='sub'>Loading...</p>";
    const { data } = await sb.auth.getSession(); const u = data.session.user;
    me.email = u.email; me.name = (u.user_metadata && u.user_metadata.name) || ""; paintMe();
    let pass = null, tests = 0, rm = null;
    try {
      const [a, b, c] = await Promise.all([
        sb.from("passports").select("updated_at").eq("user_id", u.id).maybeSingle(),
        sb.from("assessments").select("skill", { count: "exact", head: true }).eq("user_id", u.id),
        sb.from("roadmaps").select("data").eq("user_id", u.id).maybeSingle(),
      ]);
      pass = a.data; tests = b.count || 0; rm = c.data && c.data.data;
    } catch (e) {}
    let pct = null;
    if (rm && rm.phases) { const all = rm.phases.flatMap(p => p.steps); pct = all.length ? Math.round(100 * all.filter(s => s.done).length / all.length) : 0; }
    const n = me.name || u.email.split("@")[0];
    pv.innerHTML = "<div class='qtitle'>Profile</div>" +
      "<div class='pcard'><span class='av big'>" + esc(n.charAt(0).toUpperCase()) + "</span><div><b>" + esc(me.name || "Add your name") + "</b>" +
      "<div class='meta'>" + esc(u.email) + "</div><div class='meta'>Member since " + esc(new Date(u.created_at).toLocaleDateString()) + "</div></div></div>" +
      "<form id='pf'><label for='pn'>Name</label><input id='pn' maxlength='60' autocomplete='name' value='" + esc(me.name) + "'>" +
      "<button class='btn' type='submit'>Save name</button><div class='msg' id='pmsg' role='alert'></div></form>" +
      "<h3>Your progress</h3><div class='stats'>" +
      "<div class='stat'><b>" + (pass ? "Saved" : "Not yet") + "</b><span>Skill Passport</span></div>" +
      "<div class='stat'><b>" + tests + "</b><span>Skill tests taken</span></div>" +
      "<div class='stat'><b>" + (pct === null ? "None" : pct + "%") + "</b><span>Roadmap progress</span></div></div>" +
      "<button class='btn ghost' id='pout' type='button'>Log out</button>";
    $$("pout").onclick = () => $$("logout").click();
    $$("pf").onsubmit = async e => {
      e.preventDefault();
      const msg = $$("pmsg"), btn = e.target.querySelector(".btn"), name = $$("pn").value.trim();
      if (!name) { msg.textContent = "Enter a name first."; msg.className = "msg err"; return; }
      btn.disabled = true;
      const { error } = await sb.auth.updateUser({ data: { name } });
      btn.disabled = false;
      if (error) { msg.textContent = "Could not save: " + error.message; msg.className = "msg err"; return; }
      me.name = name; paintMe(); msg.textContent = "Name saved."; msg.className = "msg ok";
      pv.querySelector(".pcard b").textContent = name; pv.querySelector(".av.big").textContent = name.charAt(0).toUpperCase();
    };
  }

  function go(t) {
    Object.values(VIEW).forEach(id => { const e = $$(id); if (e) e.style.display = "none"; });
    if (t === "prof") { pv.style.display = "block"; renderProfile(); }
    else {
      if ($$("chatbox") && (t === "chat" || t === "pass")) $$("chatbox").style.display = "flex";
      const id = t === "pass" ? "viewpass" : CLICK[t];
      if (id && $$(id)) $$(id).click();
    }
    setTimeout(sync, 60);
  }
  function sync() {
    let on = "chat";
    for (const k in VIEW) { const e = $$(VIEW[k]); if (e && e.offsetParent !== null) { on = k; break; } }
    nav.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.t === on));
    const h = $$("h-email"); if (h && !me.email) { me.email = h.textContent; paintMe(); }
  }
  function addHead() {
    const cb = $$("chatbox");
    if (!cb || cb.querySelector(".chathead")) return;
    const d = document.createElement("div"); d.className = "chathead";
    d.innerHTML = '<div class="t">Your Career Twin</div><div class="s">Answer one question at a time. Save your Skill Passport when you are ready.</div>';
    cb.insertBefore(d, cb.firstChild);
  }
  const home = $$("s-home");
  const refresh = () => {
    const app = !home.classList.contains("hide");
    document.body.classList.toggle("app", app); document.body.classList.toggle("dash", app);
    if (app) loadMe(); else { me.name = ""; me.email = ""; pv.style.display = "none"; }
    addHead(); sync();
  };
  new MutationObserver(refresh).observe(home, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(() => { addHead(); sync(); }).observe(home, { subtree: true, attributes: true, attributeFilter: ["style"] });
  new MutationObserver(addHead).observe(home, { childList: true });
  refresh();
})();
