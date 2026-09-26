(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const sfx = n => { try { window.playSfx && window.playSfx(n); } catch (e) {} };
  const cheer = k => { try { window.cheer ? window.cheer(k) : sfx(k); } catch (e) {} };
  const DIFF = { easy: { label: "Dễ", seconds: 15, carrots: 5, cls: "easy", icon: "sentiment_satisfied" }, normal: { label: "Thường", seconds: 10, carrots: 10, cls: "normal", icon: "bolt" }, hard: { label: "Khó", seconds: 5, carrots: 15, cls: "hard", icon: "local_fire_department" } };
  const S = { es: null, stats: null, online: [], screen: "lobby", match: null, q: null, answered: null, timer: null, searchStart: 0, searchTimer: null, room: null, lastBot: null, unit: "", pendingInvites: new Map(), lb: [] };
  const root = () => document.getElementById("pvpRoot");
  const isStudent = () => { const u = me(); return Boolean(u && u.role === "student" && (!window.can || window.can("pvp.play"))); };

  function avatarHtml(p, cls = "") {
    if (!p) return "";
    if (p.bot) return `<span class="pv-av pv-bot ${cls}"><i class=mi>smart_toy</i></span>`;
    if (p.avatar && p.avatar.type === "image" && p.avatar.value) return `<span class="pv-av ${cls}"><img src="${esc(p.avatar.value)}" alt=""></span>`;
    const ini = String(p.name || "?").trim().split(/\s+/).slice(-2).map(x => x[0]).join("").toUpperCase();
    return `<span class="pv-av ${cls}">${esc(ini)}</span>`;
  }

  function connect() {
    if (S.es || !isStudent()) return;
    const es = new EventSource("/api/pvp/stream");
    S.es = es;
    const on = (ev, fn) => es.addEventListener(ev, e => { try { fn(JSON.parse(e.data)); } catch (x) { console.warn(x); } });
    on("hello", d => { if (S.stats) S.stats.online = d.online; });
    on("queued", () => {});
    on("match-start", d => onMatchStart(d));
    on("resume", d => onResume(d));
    on("question", d => onQuestion(d));
    on("opponent-answered", d => { if (S.match && d.qi === (S.q && S.q.qi)) { const el = document.getElementById("pvOppState"); if (el) { el.textContent = "Đối thủ đã trả lời"; el.classList.add("on"); } } });
    on("opponent-away", () => showToast("Đối thủ mất kết nối — nếu không quay lại trong 12 giây, bạn thắng."));
    on("reveal", d => onReveal(d));
    on("end", d => onEnd(d));
    on("invite", d => onInvite(d));
    on("invite-cancel", d => closeInvite(d.inviteId));
    on("invite-declined", () => { showToast("Lời mời đã bị từ chối."); });
    on("invite-expired", () => { showToast("Lời mời đã hết hạn."); });
    ["friend-request", "friend-accepted", "friend-removed", "chat-message", "chat-sent", "chat-read"].forEach(type => on(type, data => window.dispatchEvent(new CustomEvent("engo:social", { detail: { type, data } }))));
    es.onopen = () => window.dispatchEvent(new CustomEvent("engo:social", { detail: { type: "connected", data: {} } }));
    es.onerror = () => {};
  }
  function disconnect() { if (S.es) { S.es.close(); S.es = null; } }

  async function api(method, url, body) {
    return apiRequest(url, { method, body: body ? JSON.stringify(body) : undefined });
  }

  async function loadStats() {
    try { S.stats = await api("GET", "/api/pvp/me"); } catch (e) { S.stats = null; }
    try { S.online = (await api("GET", "/api/pvp/online")).players || []; } catch (e) { S.online = []; }
    try { S.lb = (await api("GET", "/api/pvp/leaderboard?scope=class")).players || []; } catch (e) { S.lb = []; }
  }

  function renderLobby() {
    const host = root();
    if (!host) return;
    S.screen = "lobby";
    const st = S.stats || { rating: 1000, wins: 0, losses: 0, draws: 0, matches: 0, streak: 0, recent: [], dailyLeft: 30, dailyCap: 30, botWins: {} };
    const units = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${String(S.unit) === String(i + 1) ? "selected" : ""}>Unit ${i + 1}</option>`).join("");
    host.innerHTML = `
      <div class="pv-hero card">
        <div class="pv-hero-main">${avatarHtml({ name: me()?.fullName, avatar: me()?.avatar }, "lg")}<div><h2>Đấu trường ENGO</h2><p>Trả lời nhanh và chính xác để thắng — càng nhanh càng nhiều điểm!</p></div></div>
        <div class="pv-hero-stats">
          <div><i class=mi>emoji_events</i><b>${st.rating}</b><span>Điểm xếp hạng${st.rank ? ` · hạng ${st.rank}` : ""}</span></div>
          <div><b>${st.wins}<small>T</small> ${st.losses}<small>B</small> ${st.draws}<small>H</small></b><span>${st.matches} trận</span></div>
          <div><b>${st.streak}</b><span>Chuỗi thắng (cao nhất ${st.bestStreak || 0})</span></div>
          <div><b>${st.dailyLeft}<i class=ico-carrot></i></b><span>Cà rốt còn nhận hôm nay</span></div>
        </div>
      </div>
      <div class="pv-modes">
        <div class="card panel pv-mode">
          <h3><i class=mi>smart_toy</i> Đấu với bot</h3>
          <p class="small muted">Thời gian trả lời mỗi câu tuỳ mức độ. Thắng để nhận cà rốt.</p>
          <label class="pv-unit">Chủ đề <select id="pvUnit"><option value="">Tất cả Unit</option>${units}</select></label>
          <div class="pv-diffs">${Object.entries(DIFF).map(([k, d]) => `<button type="button" class="pv-diff ${d.cls}" data-bot="${k}"><i class=mi>${d.icon}</i><b>${d.label}</b><span>${d.seconds} giây/câu</span><em>Thắng +${d.carrots} <i class=ico-carrot></i></em><small>Đã thắng ${(st.botWins || {})[k] || 0}</small></button>`).join("")}</div>
        </div>
        <div class="card panel pv-mode">
          <h3><i class=mi>group</i> Đấu với người</h3>
          <p class="small muted">10 giây/câu. Thắng +10 <i class=ico-carrot></i> và điểm xếp hạng.</p>
          <button type="button" class="btn btn-primary pv-big" id="pvQueue"><i class=mi>travel_explore</i> Ghép trận ngẫu nhiên</button>
          <div class="pv-room">
            <button type="button" class="btn btn-light" id="pvRoom"><i class=mi>meeting_room</i> Tạo phòng</button>
            <input id="pvCode" maxlength="5" placeholder="Mã phòng" autocomplete="off">
            <button type="button" class="btn btn-light" id="pvJoin">Vào</button>
          </div>
          <div class="pv-roomcode hidden" id="pvRoomBox"></div>
          <h4 class="pv-sub">Bạn đang online <span class="small muted">(${S.online.length})</span></h4>
          <div class="pv-online">${S.online.length ? S.online.slice(0, 30).map(p => `<div class="pv-friend">${avatarHtml(p)}<div><b>${esc(p.name)}</b><small>${esc(p.className || "")} · ${p.rating}${p.sameClass ? " · cùng lớp" : ""}</small></div>${p.status === "idle" ? `<button type="button" class="btn btn-soft btn-sm" data-invite="${p.id}">Mời</button>` : `<span class="badge">${p.status === "playing" ? "Đang đấu" : "Đang tìm trận"}</span>`}</div>`).join("") : `<p class="small muted">Chưa có bạn nào online. Hãy tạo phòng và gửi mã cho bạn bè, hoặc đấu với bot.</p>`}</div>
        </div>
      </div>
      <div class="grid two-col pv-bottom">
        <div class="card panel"><h4><i class=mi>history</i> Trận gần đây</h4>${(st.recent || []).length ? `<div class="pv-recent">${st.recent.map(r => `<div class="pv-rec ${r.outcome}"><span class="pv-out">${r.outcome === "win" ? "Thắng" : r.outcome === "draw" ? "Hoà" : "Thua"}</span><div><b>${esc(r.opponent || "")}</b><small>${r.mode === "bot" ? `Bot ${DIFF[r.difficulty]?.label || ""}` : "Người"}${r.forfeit ? " · bỏ cuộc" : ""}</small></div><span class="pv-sc">${r.myScore} – ${r.opScore}</span></div>`).join("")}</div>` : `<p class="small muted">Chưa có trận nào.</p>`}</div>
        <div class="card panel"><h4><i class=mi>leaderboard</i> Xếp hạng đấu trường trong lớp</h4>${S.lb.length ? `<div class="pv-lb">${S.lb.slice(0, 10).map(p => `<div class="pv-lb-row ${p.id === me()?.id ? "me" : ""}"><span>${p.rank}</span><b>${esc(p.name)}</b><em>${p.rating}</em></div>`).join("")}</div>` : `<p class="small muted">Chưa có ai trong lớp thi đấu.</p>`}</div>
      </div>`;
    host.querySelector("#pvUnit").addEventListener("change", e => { S.unit = e.target.value; });
    host.querySelectorAll("[data-bot]").forEach(b => b.addEventListener("click", () => startBot(b.dataset.bot)));
    host.querySelector("#pvQueue").addEventListener("click", startQueue);
    host.querySelector("#pvRoom").addEventListener("click", createRoom);
    host.querySelector("#pvJoin").addEventListener("click", () => joinRoom(host.querySelector("#pvCode").value));
    host.querySelector("#pvCode").addEventListener("keydown", e => { if (e.key === "Enter") joinRoom(e.target.value); });
    host.querySelectorAll("[data-invite]").forEach(b => b.addEventListener("click", async () => {
      try { await api("POST", "/api/pvp/invite", { userId: Number(b.dataset.invite) }); b.disabled = true; b.textContent = "Đã mời"; showToast("Đã gửi lời mời, chờ bạn ấy chấp nhận (30 giây)."); } catch (e) { showToast(e.message); }
    }));
    if (S.room) showRoom(S.room);
  }

  async function startBot(difficulty) {
    connect();
    S.lastBot = { difficulty, unit: S.unit };
    try { await api("POST", "/api/pvp/bot", { difficulty, unit: S.unit || null }); renderWaiting("Đang chuẩn bị trận đấu..."); } catch (e) { showToast(e.message); }
  }

  function renderWaiting(text, { search = false } = {}) {
    const host = root();
    if (!host) return;
    S.screen = "waiting";
    host.innerHTML = `<div class="card panel pv-wait"><div class="pv-radar"><span></span><span></span><i class=mi>${search ? "travel_explore" : "hourglass_top"}</i></div><h3>${esc(text)}</h3>${search ? `<p class="small muted" id="pvSearchTime">0 giây</p><div class="pv-wait-actions"><button type="button" class="btn btn-light" id="pvCancel">Huỷ</button><button type="button" class="btn btn-soft hidden" id="pvToBot"><i class=mi>smart_toy</i> Chưa có ai? Đấu với bot Thường</button></div>` : ""}</div>`;
    if (search) {
      host.querySelector("#pvCancel").addEventListener("click", cancelQueue);
      host.querySelector("#pvToBot").addEventListener("click", async () => { await cancelQueue(true); startBot("normal"); });
    }
  }

  async function startQueue() {
    connect();
    await new Promise(r => setTimeout(r, S.es && S.es.readyState === 1 ? 0 : 700));
    try {
      const r = await api("POST", "/api/pvp/queue");
      if (r.matched) { renderWaiting("Đã tìm thấy đối thủ!"); return; }
      renderWaiting("Đang tìm đối thủ...", { search: true });
      S.searchStart = Date.now();
      clearInterval(S.searchTimer);
      S.searchTimer = setInterval(() => {
        const s = Math.round((Date.now() - S.searchStart) / 1000);
        const el = document.getElementById("pvSearchTime"); if (el) el.textContent = `${s} giây`;
        if (s >= 15) document.getElementById("pvToBot")?.classList.remove("hidden");
      }, 1000);
    } catch (e) { showToast(e.message); }
  }
  async function cancelQueue(silent) {
    clearInterval(S.searchTimer);
    try { await api("DELETE", "/api/pvp/queue"); } catch (e) {}
    if (!silent) show();
  }

  async function createRoom() {
    connect();
    try { const r = await api("POST", "/api/pvp/room"); S.room = r.code; showRoom(r.code); } catch (e) { showToast(e.message); }
  }
  function showRoom(code) {
    const box = document.getElementById("pvRoomBox");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `<span>Mã phòng của bạn</span><b>${esc(code)}</b><small>Gửi mã này cho bạn bè. Trận bắt đầu ngay khi bạn ấy vào phòng.</small><button type="button" class="btn btn-light btn-sm" id="pvCloseRoom">Đóng phòng</button>`;
    box.querySelector("#pvCloseRoom").addEventListener("click", async () => { try { await api("DELETE", "/api/pvp/room"); } catch (e) {} S.room = null; box.classList.add("hidden"); });
  }
  async function joinRoom(code) {
    if (!String(code || "").trim()) { showToast("Nhập mã phòng."); return; }
    connect();
    await new Promise(r => setTimeout(r, S.es && S.es.readyState === 1 ? 0 : 700));
    try { await api("POST", "/api/pvp/room/join", { code }); renderWaiting("Đang vào phòng..."); } catch (e) { showToast(e.message); }
  }

  function onInvite(d) {
    S.pendingInvites.set(d.inviteId, d);
    const box = document.createElement("div");
    box.className = "pv-invite";
    box.dataset.invite = d.inviteId;
    box.innerHTML = `${avatarHtml(d.from)}<div><b>${esc(d.from.name)}</b><span>${esc(d.from.className || "")} · ${d.from.rating} điểm</span><small>mời bạn đấu tiếng Anh!</small></div><div class="pv-invite-actions"><button type="button" class="btn btn-primary btn-sm" data-act="accept">Chấp nhận</button><button type="button" class="btn btn-light btn-sm" data-act="decline">Từ chối</button></div><i class="pv-invite-bar"></i>`;
    document.body.appendChild(box);
    sfx("streak");
    box.querySelector("[data-act=accept]").addEventListener("click", async () => {
      closeInvite(d.inviteId);
      try { await api("POST", `/api/pvp/invite/${d.inviteId}/accept`); if (document.querySelector(".view.active")?.id !== "pvp") switchView("pvp"); renderWaiting("Đang vào trận..."); } catch (e) { showToast(e.message); }
    });
    box.querySelector("[data-act=decline]").addEventListener("click", async () => { closeInvite(d.inviteId); try { await api("POST", `/api/pvp/invite/${d.inviteId}/decline`); } catch (e) {} });
    setTimeout(() => closeInvite(d.inviteId), d.expiresMs || 30000);
  }
  function closeInvite(id) { S.pendingInvites.delete(id); document.querySelector(`.pv-invite[data-invite="${id}"]`)?.remove(); }

  function onMatchStart(d) {
    clearInterval(S.searchTimer);
    S.room = null;
    S.match = { ...d, scores: { you: 0, opponent: 0 }, results: [] };
    if (document.querySelector(".view.active")?.id !== "pvp") switchView("pvp");
    renderArena();
    const host = root();
    const cd = document.createElement("div");
    cd.className = "pv-countdown";
    host.querySelector(".pv-arena").appendChild(cd);
    let n = Math.round((d.countdownMs || 3000) / 1000);
    const tick = () => { if (n <= 0) { cd.remove(); return; } cd.textContent = n; sfx("countdown"); n--; setTimeout(tick, 1000); };
    tick();
  }

  function onResume(d) {
    S.match = { ...d, results: [], countdownMs: 0 };
    if (document.querySelector(".view.active")?.id !== "pvp") switchView("pvp");
    renderArena();
    if (d.question) onQuestion({ ...d.question, matchId: d.matchId, total: d.total, seconds: d.seconds }, d.question.answered);
  }

  function renderArena() {
    const host = root();
    const m = S.match;
    if (!host || !m) return;
    S.screen = "arena";
    const dots = Array.from({ length: m.total }, (_, i) => `<span class="pv-dot" data-dot="${i}"></span>`).join("");
    host.innerHTML = `
      <div class="pv-arena card">
        <div class="pv-top">
          <div class="pv-side you">${avatarHtml(m.you)}<div><b>${esc(m.you.name)}</b><small>${m.you.rating} điểm</small></div><strong id="pvScoreYou">${m.scores.you}</strong></div>
          <div class="pv-mid"><span class="pv-mode-tag">${m.mode === "bot" ? `Bot ${esc(DIFF[m.difficulty]?.label || "")} · ${m.seconds}s` : `Đấu người · ${m.seconds}s`}</span><div class="pv-dots">${dots}</div></div>
          <div class="pv-side opp"><strong id="pvScoreOpp">${m.scores.opponent}</strong><div><b>${esc(m.opponent.name)}</b><small>${m.opponent.bot ? esc(m.opponent.title || "") : `${m.opponent.rating} điểm`}</small></div>${avatarHtml(m.opponent)}</div>
        </div>
        <div class="pv-timer"><span id="pvTimerBar"></span></div>
        <div class="pv-stage" id="pvStage"><div class="pv-ready">Chuẩn bị...</div></div>
        <div class="pv-foot"><span id="pvOppState" class="pv-opp-state">Đối thủ đang suy nghĩ...</span><button type="button" class="btn btn-light btn-sm" id="pvQuit"><i class=mi>logout</i> Bỏ cuộc</button></div>
      </div>`;
    host.querySelector("#pvQuit").addEventListener("click", async () => {
      if (!confirm("Bỏ cuộc sẽ bị tính là thua. Bạn chắc chứ?")) return;
      try { await api("POST", "/api/pvp/leave", { matchId: m.matchId }); } catch (e) {}
    });
    (m.results || []).forEach((r, i) => markDot(i, r));
  }

  function markDot(i, r) { const d = document.querySelector(`[data-dot="${i}"]`); if (d) d.className = `pv-dot ${r ? (r.correct ? "ok" : "bad") : ""}`; }

  function onQuestion(d, alreadyAnswered) {
    if (!S.match || S.match.matchId !== d.matchId) return;
    if (S.screen !== "arena") renderArena();
    S.q = d;
    S.answered = alreadyAnswered ? -1 : null;
    const stage = document.getElementById("pvStage");
    document.querySelectorAll(".pv-dot").forEach((x, i) => x.classList.toggle("cur", i === d.qi));
    const opp = document.getElementById("pvOppState"); if (opp) { opp.textContent = "Đối thủ đang suy nghĩ..."; opp.classList.remove("on"); }
    stage.innerHTML = `
      <div class="pv-q"><span class="pv-qn">Câu ${d.qi + 1}/${d.total}</span><p class="pv-hint">${esc(d.hint || "")}</p><h3 class="pv-prompt">${d.kind === "form" ? esc(d.prompt).replace("____", '<span class="blank-line"></span>') : esc(d.prompt)}</h3></div>
      <div class="pv-opts">${d.options.map((o, i) => `<button type="button" class="pv-opt" data-opt="${i}"><kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`).join("")}</div>`;
    stage.querySelectorAll("[data-opt]").forEach(b => b.addEventListener("click", () => choose(Number(b.dataset.opt))));
    if (alreadyAnswered) stage.querySelectorAll(".pv-opt").forEach(b => b.disabled = true);
    const bar = document.getElementById("pvTimerBar");
    const total = d.seconds * 1000;
    const endAt = performance.now() + (d.remainingMs ?? total);
    cancelAnimationFrame(S.timer);
    let warned = false;
    const frame = () => {
      const left = Math.max(0, endAt - performance.now());
      if (bar) { bar.style.width = `${(left / total) * 100}%`; bar.classList.toggle("low", left < Math.min(3000, total * 0.3)); }
      if (!warned && left < 3000 && left > 0 && S.answered === null) { warned = true; }
      if (left > 0 && S.q === d) S.timer = requestAnimationFrame(frame);
    };
    frame();
  }

  async function choose(i) {
    if (S.answered !== null || !S.q || !S.match) return;
    S.answered = i;
    const q = S.q;
    document.querySelectorAll(".pv-opt").forEach(b => { b.disabled = true; if (Number(b.dataset.opt) === i) b.classList.add("picked"); });
    try {
      const r = await api("POST", "/api/pvp/answer", { matchId: S.match.matchId, qi: q.qi, choice: i });
      const picked = document.querySelector(`.pv-opt[data-opt="${i}"]`);
      if (picked && r.correct) { picked.insertAdjacentHTML("beforeend", `<em class="pv-gain">+${r.points}</em>`); sfx("correct"); }
      else sfx("wrong");
    } catch (e) { showToast(e.message); }
  }

  function onReveal(d) {
    if (!S.match || S.match.matchId !== d.matchId) return;
    cancelAnimationFrame(S.timer);
    S.match.scores = d.scores;
    S.match.results[d.qi] = d.you;
    markDot(d.qi, d.you);
    const opts = document.querySelectorAll(".pv-opt");
    opts.forEach(b => {
      const i = Number(b.dataset.opt);
      b.disabled = true;
      if (i === d.answer) b.classList.add("right");
      else if (i === d.you.choice) b.classList.add("wrong");
      if (i === d.opponent.choice) b.insertAdjacentHTML("beforeend", `<i class="pv-opp-pick" title="Đối thủ chọn">${S.match.opponent.bot ? "🤖" : "👤"}</i>`);
    });
    if (d.you.choice === null) sfx("wrong");
    const sy = document.getElementById("pvScoreYou"), so = document.getElementById("pvScoreOpp");
    if (sy) { sy.textContent = d.scores.you; sy.classList.add("bump"); setTimeout(() => sy.classList.remove("bump"), 400); }
    if (so) so.textContent = d.scores.opponent;
    const opp = document.getElementById("pvOppState");
    if (opp) { opp.classList.add("on"); opp.textContent = d.opponent.choice === null ? "Đối thủ không kịp trả lời" : d.opponent.correct ? `Đối thủ đúng (+${d.opponent.points})` : "Đối thủ trả lời sai"; }
  }

  function onEnd(d) {
    cancelAnimationFrame(S.timer);
    const m = S.match;
    S.match = null; S.q = null;
    const host = root();
    if (!host) return;
    S.screen = "end";
    const title = d.draw ? "Hoà!" : d.youWin ? "Chiến thắng!" : "Thất bại";
    const r = d.result || {};
    if (d.youWin) cheer("perfect"); else if (d.draw) sfx("taskDone"); else sfx("wrong");
    if (d.youWin && window.celebrate) { try { window.celebrate(60); } catch (e) {} }
    host.innerHTML = `
      <div class="card panel pv-end ${d.youWin ? "win" : d.draw ? "draw" : "loss"}">
        <div class="pv-end-head"><i class=mi>${d.youWin ? "emoji_events" : d.draw ? "handshake" : "sentiment_dissatisfied"}</i><h2>${title}</h2>${d.forfeit ? `<p class="small muted">${d.forfeitByYou ? "Bạn đã bỏ cuộc." : "Đối thủ đã rời trận."}</p>` : ""}</div>
        <div class="pv-end-score"><div>${avatarHtml(m ? m.you : { name: me()?.fullName })}<b>${d.scores.you}</b><small>${d.correct.you}/${d.total} đúng</small></div><span>–</span><div>${avatarHtml(d.opponent)}<b>${d.scores.opponent}</b><small>${d.correct.opponent}/${d.total} đúng</small></div></div>
        <div class="pv-rewards">
          ${r.carrots ? `<span class="pv-rw carrot">+${r.carrots} <i class=ico-carrot></i></span>` : ""}
          ${r.xp ? `<span class="pv-rw">+${r.xp} XP</span>` : ""}
          ${d.mode === "human" && r.ratingDelta !== undefined ? `<span class="pv-rw ${r.ratingDelta >= 0 ? "up" : "down"}">${r.ratingDelta >= 0 ? "+" : ""}${r.ratingDelta} điểm xếp hạng → ${r.rating}</span>` : ""}
          ${r.capped ? `<span class="pv-rw muted">Đã đạt giới hạn cà rốt hôm nay (${r.capped} chưa cộng)</span>` : ""}
        </div>
        <details class="pv-review"><summary>Xem lại ${d.total} câu</summary>${d.review.map((x, i) => `<div class="pv-rv ${x.correct ? "ok" : "bad"}"><span>${i + 1}.</span><div><b>${esc(x.prompt)}</b><small>Đáp án: ${esc(x.answer)}${x.correct ? "" : ` · Em chọn: ${esc(x.yours || "(không trả lời)")}`}</small></div></div>`).join("")}</details>
        <div class="pv-end-actions">${d.mode === "bot" ? `<button type="button" class="btn btn-primary" id="pvAgain"><i class=mi>replay</i> Đấu lại</button>` : `<button type="button" class="btn btn-primary" id="pvAgainQ"><i class=mi>travel_explore</i> Tìm trận mới</button>`}<button type="button" class="btn btn-light" id="pvLobby">Về sảnh</button></div>
      </div>`;
    host.querySelector("#pvAgain")?.addEventListener("click", () => { S.unit = S.lastBot?.unit || S.unit; startBot(d.difficulty || S.lastBot?.difficulty || "normal"); });
    host.querySelector("#pvAgainQ")?.addEventListener("click", startQueue);
    host.querySelector("#pvLobby").addEventListener("click", show);
    if (typeof syncRewardsFromServer === "function") { try { syncRewardsFromServer(); } catch (e) {} }
  }

  document.addEventListener("keydown", e => {
    if (S.screen !== "arena" || !S.q || S.answered !== null) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    const k = e.key.toLowerCase();
    const idx = ["1", "2", "3", "4"].indexOf(k) >= 0 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
    if (idx >= 0 && idx < (S.q.options || []).length) { e.preventDefault(); choose(idx); }
  });

  async function show() {
    const host = root();
    if (!host) return;
    if (!isStudent()) { host.innerHTML = `<div class="card panel"><p class="small muted">Đấu trường dành cho học sinh.</p></div>`; return; }
    connect();
    if (S.match) { renderArena(); if (S.q) onQuestion(S.q); return; }
    if (S.screen === "waiting") return;
    host.innerHTML = `<p class="small muted">Đang tải đấu trường...</p>`;
    await loadStats();
    if (S.stats && S.stats.inMatch && !S.match) { renderWaiting("Đang nối lại trận đấu..."); return; }
    renderLobby();
  }
  window.ENGO_PVP = { show };

  window.addEventListener("engo:view", e => { if (e.detail === "pvp") show(); else if (S.screen === "waiting" && !S.match) { cancelQueue(true); S.screen = "lobby"; } });
  window.addEventListener("engo:user-ready", () => { if (isStudent()) connect(); const a = document.querySelector(".view.active"); if (a && a.id === "pvp") show(); });
  window.addEventListener("engo:logout", () => { disconnect(); S.match = null; S.q = null; S.stats = null; S.screen = "lobby"; document.querySelectorAll(".pv-invite").forEach(x => x.remove()); });
})();
