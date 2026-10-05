// Plans page: Free vs Premium and revenue calculator (display only). Loaded after quiz.js.
(function () {
  const css = `
  #plans{max-height:68vh;overflow-y:auto}
  #plans .qtitle{font-size:18px;font-weight:700;margin:2px 0 6px}
  #plans .pc{background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:14px;margin-top:10px}
  #plans .pc.pro{border-color:var(--teal)}
  #plans .price{font-size:26px;font-weight:700}
  #plans .price small{font-size:13px;font-weight:400;color:#46605f}
  #plans ul{margin:8px 0 0;padding:0;list-style:none;font-size:15px;line-height:1.7}
  #plans li:before{content:"\\2713  ";color:var(--ok);font-weight:700}
  #plans h3{margin:18px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--teal)}
  #plans .calc{background:var(--teal);color:#fff;border-radius:12px;padding:14px;margin-top:10px}
  #plans .calc input[type=range]{width:100%;padding:0;border:0;accent-color:var(--gold)}
  #plans .big{font-size:26px;font-weight:700}
  #plans .note{font-size:12px;color:#46605f;margin-top:8px;line-height:1.5}
  #plans .calc .note{color:#c7dde2}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const $$ = id => document.getElementById(id);
  const inr = n => "\u20B9" + Math.round(n).toLocaleString("en-IN");
  const PRICE = 199, INVEST = 1150000;

  function render() {
    $$("plans").innerHTML =
      "<div class='row' style='margin:0 0 8px'><button type='button' class='link' id='plback'>Back to chat</button></div>" +
      "<div class='qtitle'>Plans</div><p class='sub'>SkillTwin uses a freemium model. Everything is unlocked in this demo.</p>" +
      "<div class='pc'><b>Free</b><div class='price'>\u20B90</div><ul><li>Basic career profile</li><li>Career exploration</li><li>Limited AI guidance</li></ul></div>" +
      "<div class='pc pro'><b>Premium</b><div class='price'>" + inr(PRICE) + " <small>/ month</small></div><ul>" +
      "<li>Advanced Career Twin</li><li>Skill-gap analysis</li><li>Career roadmap</li><li>Skill assessments</li><li>Real-world projects</li></ul>" +
      "<button class='btn' id='plup' type='button'>Upgrade (demo only)</button><div class='msg ok' id='plmsg'></div></div>" +
      "<h3>Other revenue sources</h3><ul><li>College and corporate subscriptions</li><li>Skill verification</li><li>Premium assessments</li><li>Recruitment partnerships</li></ul>" +
      "<h3>Revenue estimator</h3><div class='calc'>Premium users: <b id='plu'></b>" +
      "<input id='plr' type='range' min='100' max='10000' step='100' value='5000' aria-label='Premium users'>" +
      "<div>Monthly revenue</div><div class='big' id='plm'></div><div>Yearly revenue: <b id='ply'></b></div>" +
      "<div>Startup cost " + inr(INVEST) + " is matched by about <b id='plp'></b> months of revenue</div>" +
      "<div class='note'>Revenue only, before running costs and taxes. Based on " + inr(PRICE) + " per user per month.</div></div>";
    $$("plback").onclick = () => { $$("plans").style.display = "none"; $$("chatbox").style.display = "flex"; };
    $$("plup").onclick = () => { $$("plmsg").textContent = "Payments are not part of this demo. Premium would cost " + inr(PRICE) + " per month."; };
    const upd = () => {
      const n = +$$("plr").value, m = n * PRICE;
      $$("plu").textContent = n.toLocaleString("en-IN"); $$("plm").textContent = inr(m);
      $$("ply").textContent = inr(m * 12); $$("plp").textContent = (INVEST / m).toFixed(1);
    };
    $$("plr").oninput = upd; upd();
  }
  function open() {
    ["chatbox", "passport", "quiz"].forEach(id => { if ($$(id)) $$(id).style.display = "none"; });
    render(); $$("plans").style.display = "block";
  }

  const orig = window.startChat;
  window.startChat = function (u) {
    orig(u);
    if ($$("plans")) return;
    const d = document.createElement("div"); d.id = "plans"; d.style.display = "none";
    $$("s-home").insertBefore(d, $$("logout"));
    const b = document.createElement("button"); b.type = "button"; b.className = "link"; b.id = "pllink"; b.textContent = "Plans";
    b.onclick = open; document.querySelector("#chatbox .tools").appendChild(b);
  };
})();
