// UI shell: hero on login, header + tab navigation after login. Loaded last.
(function () {
  if (window.__stUI) return; window.__stUI = true;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "theme.css"; document.head.appendChild(l);
  const $$ = id => document.getElementById(id);
  const mark = '<svg width="34" height="22" viewBox="0 0 34 22"><circle cx="12" cy="11" r="9" fill="none" stroke="#e9a23b" stroke-width="2.5"/><circle cx="22" cy="11" r="9" fill="none" stroke="#fff" stroke-width="2.5"/></svg>';
  const ic = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const TABS = [
    ["chat", "Chat", '<path d="M4 5h16v11H9l-5 4V5z"/>'],
    ["test", "Tests", '<path d="M5 12l4 4 10-10"/>'],
    ["pass", "Passport", '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17h8"/>'],
    ["road", "Roadmap", '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 000-6h-4a3 3 0 010-6h6"/>'],
    ["plans", "Plans", '<path d="M3 12l9-9h8v8l-9 9-8-8z"/><circle cx="16" cy="8" r="1.2"/>'],
  ];
  const VIEW = { chat: "chatbox", test: "quiz", pass: "passport", road: "roadmap", plans: "plans" };
  const CLICK = { test: "qlink", road: "rmlink", plans: "pllink" };

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

  // Header + nav
  const bar = document.createElement("header"); bar.id = "appbar";
  bar.innerHTML = '<div class="in"><div class="mark">' + mark + '<b>SkillTwin</b></div><nav id="appnav"></nav><div class="sp"></div><span class="who2" id="who2"></span><button type="button" class="out" id="out2">Log out</button></div>';
  document.body.appendChild(bar);
  const nav = $$("appnav");
  TABS.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.dataset.t = t[0]; b.innerHTML = ic(t[2]) + "<span>" + t[1] + "</span>"; b.onclick = () => go(t[0]); nav.appendChild(b); });
  $$("out2").onclick = () => $$("logout").click();

  function go(t) {
    Object.values(VIEW).forEach(id => { const e = $$(id); if (e) e.style.display = "none"; });
    if ($$("chatbox") && (t === "chat" || t === "pass")) $$("chatbox").style.display = "flex";
    const id = t === "pass" ? "viewpass" : CLICK[t];
    if (id && $$(id)) $$(id).click();
    setTimeout(sync, 60);
  }
  function sync() {
    let on = "chat";
    for (const k in VIEW) { const e = $$(VIEW[k]); if (e && e.offsetParent !== null) { on = k; break; } }
    nav.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.t === on));
    const h = $$("h-email"); if (h) $$("who2").textContent = h.textContent;
  }
  function addHead() {
    const cb = $$("chatbox");
    if (!cb || cb.querySelector(".chathead")) return;
    const d = document.createElement("div"); d.className = "chathead";
    d.innerHTML = '<div class="t">Your Career Twin</div><div class="s">Answer one question at a time. Save your Skill Passport when you are ready.</div>';
    cb.insertBefore(d, cb.firstChild);
  }
  const home = $$("s-home");
  const refresh = () => { document.body.classList.toggle("app", !home.classList.contains("hide")); addHead(); sync(); };
  new MutationObserver(refresh).observe(home, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(() => { addHead(); sync(); }).observe(home, { subtree: true, attributes: true, attributeFilter: ["style"] });
  new MutationObserver(addHead).observe(home, { childList: true });
  refresh();
})();
