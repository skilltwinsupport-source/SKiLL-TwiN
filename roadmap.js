// Career Roadmap with progress tracking. Loaded after plans.js.
(function () {
  const css = `
  #roadmap{max-height:68vh;overflow-y:auto}
  #roadmap .qtitle{font-size:18px;font-weight:700;margin:2px 0 6px;line-height:1.35}
  #roadmap .chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
  #roadmap .chip{border:1.5px solid var(--teal);background:#fff;color:var(--teal);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
  #roadmap .bar{height:10px;background:#dfe7e5;border-radius:99px;overflow:hidden;margin:6px 0 2px}
  #roadmap .bar i{display:block;height:100%;background:var(--ok);width:0;transition:width .3s}
  #roadmap .ph{background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;margin-top:10px}
  #roadmap .ph b{color:var(--teal)}
  #roadmap .goal{font-size:13px;color:#46605f;margin:2px 0 6px}
  #roadmap label{display:flex;gap:10px;align-items:flex-start;margin:8px 0 0;font-size:15px;font-weight:400;line-height:1.45;cursor:pointer}
  #roadmap input[type=checkbox]{width:20px;height:20px;padding:0;margin:2px 0 0;flex:none;accent-color:var(--teal)}
  #roadmap label.done span{text-decoration:line-through;color:#6b7f7d}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const $$ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  let user = null, rm = null;

  async function api(body) {
    const { data } = await sb.auth.getSession();
    const r = await fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token, apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong.");
    return j;
  }
  const pct = d => { const all = d.phases.flatMap(p => p.steps); return all.length ? Math.round(100 * all.filter(s => s.done).length / all.length) : 0; };
  const saveRm = () => sb.from("roadmaps").upsert({ user_id: user.id, data: rm, updated_at: new Date().toISOString() });
  const back = () => { $$("roadmap").style.display = "none"; $$("chatbox").style.display = "flex"; };

  async function open() {
    ["chatbox", "passport", "quiz", "plans"].forEach(id => { if ($$(id)) $$(id).style.display = "none"; });
    $$("roadmap").style.display = "block"; $$("roadmap").innerHTML = "<p class='sub'>Loading...</p>";
    const { data } = await sb.from("roadmaps").select("data").eq("user_id", user.id).maybeSingle();
    if (data && data.data && data.data.phases) { rm = data.data; view(); } else setup();
  }

  async function setup() {
    $$("roadmap").innerHTML = "<div class='row' style='margin:0 0 8px'><button type='button' class='link' id='rback'>Back to chat</button></div>" +
      "<div class='qtitle'>Career Roadmap</div><p class='sub'>Choose the career you want. The AI builds a 12-month plan you can tick off step by step.</p>" +
      "<input id='rcareer' maxlength='60' placeholder='e.g. Chartered Accountant, Bank PO, Lawyer, Teacher, Data Analyst'><div class='chips' id='rchips'></div>" +
      "<button class='btn' id='rgo' type='button'>Build my roadmap</button><div class='msg err' id='rmsg' role='alert'></div>";
    $$("rback").onclick = back;
    $$("rgo").onclick = () => build($$("rcareer").value);
    try {
      const { data } = await sb.from("passports").select("data").eq("user_id", user.id).maybeSingle();
      const t = ((data && data.data && data.data.top_careers) || []).map(c => c.title).filter(Boolean);
      $$("rchips").innerHTML = t.map(x => "<button type='button' class='chip'>" + esc(x) + "</button>").join("");
      $$("rchips").querySelectorAll(".chip").forEach(c => c.onclick = () => { $$("rcareer").value = c.textContent; });
    } catch (e) {}
  }

  async function build(career) {
    career = String(career || "").trim();
    if (career.length < 2) { $$("rmsg").textContent = "Type or pick a career first."; return; }
    $$("rmsg").textContent = ""; $$("rgo").disabled = true; $$("rgo").textContent = "Building your roadmap...";
    try {
      let ctx = "";
      const { data } = await sb.from("passports").select("data").eq("user_id", user.id).maybeSingle();
      const d = (data && data.data) || {};
      if (d.skills_have || d.skill_gaps) ctx = ". Skills I have: " + (d.skills_have || []).join(", ") + ". Skills to build: " + (d.skill_gaps || []).join(", ");
      const j = await api({ messages: [{ role: "user", text: ("Career: " + career + ctx).slice(0, 1800) }] });
      rm = j.roadmap; const { error } = await saveRm();
      if (error) throw new Error("Could not save: " + error.message);
      view();
    } catch (e) { $$("rmsg").textContent = e.message; $$("rgo").disabled = false; $$("rgo").textContent = "Build my roadmap"; }
  }

  function view() {
    $$("roadmap").innerHTML = "<div class='row' style='margin:0 0 8px'><button type='button' class='link' id='rback'>Back to chat</button><button type='button' class='link' id='rnew'>New roadmap</button></div>" +
      "<div class='qtitle'>" + esc(rm.career) + " roadmap</div><div class='meta' style='font-size:13px'>Progress: <b id='rpct'></b></div><div class='bar'><i id='rbar'></i></div>" +
      rm.phases.map((p, a) => "<div class='ph'><b>" + esc(p.title) + "</b><div class='goal'>" + esc(p.goal) + "</div>" +
        p.steps.map((s, b) => "<label class='" + (s.done ? "done" : "") + "'><input type='checkbox' data-a='" + a + "' data-b='" + b + "'" + (s.done ? " checked" : "") + "><span>" + esc(s.t) + "</span></label>").join("") + "</div>").join("");
    const upd = () => { const v = pct(rm); $$("rpct").textContent = v + "%"; $$("rbar").style.width = v + "%"; };
    upd();
    $$("rback").onclick = back;
    $$("rnew").onclick = () => { if (confirm("Replace your current roadmap and progress with a new one?")) setup(); };
    $$("roadmap").querySelectorAll("input[type=checkbox]").forEach(c => c.onchange = async () => {
      rm.phases[+c.dataset.a].steps[+c.dataset.b].done = c.checked;
      c.parentElement.classList.toggle("done", c.checked); upd(); await saveRm();
    });
  }

  // Show roadmap progress on the Skill Passport
  let busy = false;
  function watch() {
    const p = $$("passport");
    new MutationObserver(async () => {
      if (busy || !p.children.length || p.querySelector("#rmsec")) return;
      busy = true;
      try {
        const { data } = await sb.from("roadmaps").select("data").eq("user_id", user.id).maybeSingle();
        if (!p.querySelector("#rmsec") && p.children.length) {
          const d = document.createElement("div"); d.id = "rmsec";
          d.innerHTML = "<h3>Roadmap progress</h3>" + (data && data.data && data.data.phases
            ? "<p style='margin:0;font-size:15px'>" + esc(data.data.career) + ": <b>" + pct(data.data) + "%</b> complete</p>"
            : "<p class='meta'>No roadmap yet. Build one from the chat screen.</p>");
          p.appendChild(d);
        }
      } catch (e) {}
      busy = false;
    }).observe(p, { childList: true });
  }

  const orig = window.startChat;
  window.startChat = function (u) {
    orig(u); user = u;
    if ($$("roadmap")) return;
    const d = document.createElement("div"); d.id = "roadmap"; d.style.display = "none";
    $$("s-home").insertBefore(d, $$("logout"));
    const b = document.createElement("button"); b.type = "button"; b.className = "link"; b.id = "rmlink"; b.textContent = "Roadmap";
    b.onclick = open; document.querySelector("#chatbox .tools").appendChild(b);
    watch();
  };
})();
