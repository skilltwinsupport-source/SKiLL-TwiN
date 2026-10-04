// SkillTwin AI career chat. Loaded by index.html after login.
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
  .tools{display:flex;justify-content:space-between;margin-top:10px}
  #logout{margin-top:10px;background:#46605f}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  let user = null, history = [], busy = false;
  const key = () => "skilltwin_chat_" + user.id;
  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

  function build() {
    const home = document.getElementById("s-home");
    if (document.getElementById("chatbox")) return;
    home.querySelector("h2").textContent = "Your Career Twin";
    home.querySelector(".hello").style.display = "none";
    const box = document.createElement("div"); box.id = "chatbox";
    box.innerHTML = '<div id="chatlog" aria-live="polite"></div>' +
      '<form id="chatform"><input id="chatin" placeholder="Type your answer" autocomplete="off" maxlength="500"><button class="btn" type="submit">Send</button></form>' +
      '<div class="tools"><button type="button" class="link" id="restart">Start over</button></div>';
    home.insertBefore(box, document.getElementById("logout"));
    document.getElementById("chatform").addEventListener("submit", e => {
      e.preventDefault(); const i = document.getElementById("chatin"); const t = i.value.trim();
      if (t) { i.value = ""; send(t); }
    });
    document.getElementById("restart").addEventListener("click", () => {
      if (busy) return; history = []; localStorage.removeItem(key()); document.getElementById("chatlog").innerHTML = ""; begin();
    });
  }
  function add(cls, html) {
    const d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = html;
    const log = document.getElementById("chatlog"); log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function save() { try { localStorage.setItem(key(), JSON.stringify(history)); } catch (e) {} }

  async function ask() {
    busy = true; const wait = add("ai", "Thinking...");
    try {
      const { data } = await sb.auth.getSession();
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token, apikey: SUPABASE_KEY },
        body: JSON.stringify({ messages: history }),
      });
      const j = await r.json().catch(() => ({}));
      wait.remove();
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      history.push({ role: "model", text: j.reply }); save(); add("ai", fmt(j.reply));
    } catch (e) {
      wait.remove(); add("err", esc(e.message) + " Send your message again to retry.");
      if (history.length && history[history.length - 1].role === "user") history.pop();
    }
    busy = false;
  }
  function send(text) { if (busy) return; history.push({ role: "user", text }); add("me", esc(text)); ask(); }
  function begin() { history = [{ role: "user", text: "Hi, I want help finding the right career." }]; ask(); }

  window.startChat = function (u) {
    user = u; build();
    document.getElementById("chatlog").innerHTML = "";
    try { history = JSON.parse(localStorage.getItem(key()) || "[]"); } catch (e) { history = []; }
    if (!history.length) return begin();
    history.forEach((m, i) => { if (i === 0 && m.role === "user") return; add(m.role === "model" ? "ai" : "me", m.role === "model" ? fmt(m.text) : esc(m.text)); });
  };
})();
