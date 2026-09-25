(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const SKILLS = { Listening: "Nghe", Speaking: "Nói", Vocabulary: "Từ vựng", Grammar: "Ngữ pháp", Writing: "Viết", Reading: "Đọc" };
  const charts = new Map();
  const state = { semester: "", board: null, recs: null };

  function loadChart() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (loadChart.p) return loadChart.p;
    loadChart.p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
      s.onload = () => resolve(window.Chart);
      s.onerror = () => { loadChart.p = null; reject(new Error("Không tải được thư viện biểu đồ.")); };
      document.head.appendChild(s);
    });
    return loadChart.p;
  }

  function profileKey() { const u = me(); return u ? `engoProfileV1_user_${u.id}` : null; }
  function getProfile() { try { return JSON.parse(localStorage.getItem(profileKey()) || "{}") || {}; } catch (e) { return {}; } }
  function saveProfile(p) { const k = profileKey(); if (!k) return; localStorage.setItem(k, JSON.stringify(p)); if (typeof pushCloudData === "function") pushCloudData(); }

  function avatarHtml(s) {
    const av = s.avatar || {};
    if (av.type === "image" && av.value) return `<span class="rb-av"><img src="${esc(av.value)}" alt=""></span>`;
    const ini = String(s.fullName || "?").trim().split(/\s+/).slice(-2).map(x => x[0]).join("").toUpperCase();
    return `<span class="rb-av">${esc(ini)}</span>`;
  }

  function cssVar(name, fallback) { const v = getComputedStyle(document.body).getPropertyValue(name).trim(); return v || fallback; }

  function boardHtml(b, { compact = false, editable = false } = {}) {
    const s = b.student, st = b.stats;
    const semOpts = [["", "Cả năm"], ["1", "Học kỳ 1"], ["2", "Học kỳ 2"]].map(([v, l]) => `<option value="${v}" ${String(b.semester || "") === v ? "selected" : ""}>${l}</option>`).join("");
    return `
      <div class="rb-head card">
        <div class="rb-id">${avatarHtml(s)}<div><h3>${esc(s.fullName)} ${s.displayTitle ? `<span class="rb-title">${esc(s.displayTitle)}</span>` : ""}</h3><span class="rb-mail">${esc(s.email || "")}</span>${s.tagline ? `<em class="rb-tag">“${esc(s.tagline)}”</em>` : ""}</div></div>
        <div class="rb-trophy" title="Điểm xếp hạng Đấu trường · ${b.trophy.pvpWins} thắng / ${b.trophy.pvpMatches} trận"><i class=mi>emoji_events</i><b>${b.trophy.rating}</b><small>Lv.${b.trophy.level} · ${b.trophy.xp} XP</small>${editable ? `<button type="button" class="btn btn-light btn-sm" id="rbCustomize"><i class=mi>tune</i> Tuỳ chỉnh</button>` : ""}</div>
        <div class="rb-notes">
          <p><b class="rb-first">Điểm làm lần đầu:</b> phản ánh chính xác nhất khả năng của học sinh nếu tự làm, không dùng AI hay tra cứu. Điểm này cũng cho thấy sự cẩn thận khi làm và nộp bài.</p>
          <p><b class="rb-best">Điểm cao nhất:</b> phản ánh sự chuyên cần — em đã xem lại câu sai, hiểu bài và làm lại để tiến bộ.</p>
        </div>
      </div>
      <div class="rb-filters">
        <label>Lớp học: <select disabled><option>${esc(s.className || "Chưa phân lớp")}</option></select></label>
        <label>Thời gian: <select class="rb-sem">${semOpts}</select></label>
      </div>
      <div class="rb-stats">
        <div class="rb-stat card"><b class="c-first">${st.firstAvg ?? "--"}</b>${st.rank ? `<span class="c-first">Hạng ${st.rank}/${st.classSize} trong lớp</span>` : `<span class="muted">Chưa xếp hạng</span>`}<small><i class=mi>star</i> Điểm TB kiểm tra (lần đầu)${st.bestAvg !== null ? ` · cao nhất ${st.bestAvg}` : ""}</small></div>
        <div class="rb-stat card"><b class="c-blue">${st.testsDone}</b><small><i class=mi>emoji_events</i> Bài kiểm tra đã làm</small></div>
        <div class="rb-stat card"><b class="c-green">${st.exercisesDone}/${st.exercisesTotal}</b><small><i class=mi>code</i> Bài luyện đã hoàn thành</small></div>
      </div>
      <div class="rb-charts ${compact ? "compact" : ""}">
        <div class="rb-chart card"><h4><i class=mi>show_chart</i> ĐIỂM TB THEO UNIT</h4><div class="rb-canvas"><canvas data-chart="unit"></canvas></div></div>
        <div class="rb-chart card"><h4><i class=mi>bar_chart</i> ĐIỂM KIỂM TRA THEO CHƯƠNG</h4><div class="rb-canvas">${b.testChart.length ? `<canvas data-chart="test"></canvas>` : `<p class="small muted rb-empty">Chưa có bài kiểm tra nào${b.semester ? " trong học kỳ này" : ""}.</p>`}</div></div>
      </div>`;
  }

  async function drawCharts(host, b) {
    let Chart;
    try { Chart = await loadChart(); } catch (e) { host.querySelectorAll(".rb-canvas").forEach(c => { c.innerHTML = `<p class="small muted rb-empty">${esc(e.message)}</p>`; }); return; }
    const ink = cssVar("--muted", "#64748b"), grid = cssVar("--line", "#e2e8f0");
    const first = "#ea7a1f", best = "#2f5fe0";
    const common = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: ink, boxWidth: 14, font: { family: "inherit", size: 12 } } }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y ?? "—"}` } } },
      scales: {
        y: { min: 0, max: 10, ticks: { stepSize: 2, color: ink }, grid: { color: grid } },
        x: { ticks: { color: ink, maxRotation: 28, minRotation: 18, autoSkip: false, font: { size: 11 } }, grid: { color: grid } },
      },
    };
    charts.forEach((c, k) => { if (!document.body.contains(k)) { c.destroy(); charts.delete(k); } });
    host.querySelectorAll("canvas[data-chart]").forEach(cv => {
      const key = cv;
      if (charts.has(key)) { charts.get(key).destroy(); charts.delete(key); }
      let cfg;
      if (cv.dataset.chart === "unit") {
        const labels = b.unitChart.map(u => `${u.label}: ${u.name}`);
        cfg = { type: "line", data: { labels, datasets: [
          { label: "Lần đầu", data: b.unitChart.map(u => u.first), borderColor: first, backgroundColor: first, tension: 0.4, spanGaps: true, pointRadius: 4, borderWidth: 2.5 },
          { label: "Cao nhất", data: b.unitChart.map(u => u.best), borderColor: best, backgroundColor: best, tension: 0.4, spanGaps: true, pointRadius: 4, borderWidth: 2.5 },
        ] }, options: common };
      } else {
        cfg = { type: "bar", data: { labels: b.testChart.map(t => t.label), datasets: [
          { label: "KT lần đầu", data: b.testChart.map(t => t.first), backgroundColor: first, borderRadius: 4, maxBarThickness: 30 },
          { label: "KT cao nhất", data: b.testChart.map(t => t.best), backgroundColor: best, borderRadius: 4, maxBarThickness: 30 },
        ] }, options: common };
      }
      const ch = new Chart(cv.getContext("2d"), cfg);
      charts.set(key, ch);
    });
  }

  function recsHtml(r) {
    if (!r) return "";
    const pct = Math.min(100, Math.round((r.goal.todayMinutes / r.goal.minutes) * 100));
    return `<div class="rb-recs card panel">
      <div class="rb-goal"><div class="rb-ring" style="--p:${pct}"><b>${r.goal.todayMinutes}'</b><small>/${r.goal.minutes}'</small></div><div><h4>Mục tiêu hôm nay</h4><p class="small muted">${pct >= 100 ? "Tuyệt vời! Em đã đạt mục tiêu hôm nay." : `Học thêm ${r.goal.minutes - r.goal.todayMinutes} phút nữa nhé.`} Tuần này: ${r.goal.weekMinutes} phút.</p></div></div>
      <h4 class="rb-recs-title"><i class=mi>auto_awesome</i> Gợi ý dành riêng cho em</h4>
      <div class="rb-rec-list">${r.items.map((it, i) => `<button type="button" class="rb-rec" data-rec="${i}"><i class=mi>${esc(it.icon)}</i><div><b>${esc(it.title)}</b><small>${esc(it.desc)}</small></div><span>${esc(it.cta || "Mở")}</span></button>`).join("")}</div>
    </div>`;
  }

  async function renderStudent() {
    const view = document.getElementById("student-home");
    const u = me();
    if (!view || !u || u.role !== "student") { document.getElementById("resultsBoard")?.remove(); return; }
    let host = document.getElementById("resultsBoard");
    if (!host) {
      host = document.createElement("div");
      host.id = "resultsBoard";
      host.className = "rb section";
      view.querySelector(".page-heading")?.insertAdjacentElement("afterend", host);
    }
    if (!host.innerHTML) host.innerHTML = `<p class="small muted">Đang tải bảng kết quả...</p>`;
    try {
      const [bd, rc] = await Promise.all([
        apiRequest(`/api/progress/students/me/board${state.semester ? `?semester=${state.semester}` : ""}`),
        apiRequest("/api/progress/me/recommendations").catch(() => null),
      ]);
      state.board = bd.board; state.recs = rc;
      host.innerHTML = boardHtml(bd.board, { editable: true }) + recsHtml(rc);
      host.querySelector(".rb-sem").addEventListener("change", e => { state.semester = e.target.value; renderStudent(); });
      host.querySelector("#rbCustomize")?.addEventListener("click", openCustomize);
      host.querySelectorAll("[data-rec]").forEach(b => b.addEventListener("click", () => {
        const it = rc.items[Number(b.dataset.rec)];
        switchView(it.view);
        if (it.unit && it.view === "vocabulary" && window.ENGO_UNITS_UI && typeof window.ENGO_UNITS_UI.openUnit === "function") { try { window.ENGO_UNITS_UI.openUnit(it.unit); } catch (e) {} }
      }));
      drawCharts(host, bd.board);
    } catch (e) {
      host.innerHTML = `<div class="card panel"><p class="small muted">${esc(e.message)}</p></div>`;
    }
  }

  async function openCustomize() {
    const p = getProfile();
    let titles = [];
    try { const d = await apiRequest("/api/student/progress"); titles = (d.progress && d.progress.earnedTitles || []).map(t => t.name); } catch (e) {}
    const m = document.createElement("div");
    m.className = "modal pp-dialog";
    const goals = [10, 15, 20, 30, 45, 60];
    const targets = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
    const focus = new Set(p.focusSkills || []);
    m.innerHTML = `<div class="modal-card"><div class="modal-head"><h3><i class=mi>tune</i> Cá nhân hoá</h3><button class="close-btn" type="button" data-x>×</button></div>
      <form class="auth-form" id="rbForm">
        <div class="field"><label>Danh hiệu hiển thị cạnh tên (bảng kết quả, đấu trường)</label><select name="displayTitle"><option value="">— Không hiển thị —</option>${titles.map(t => `<option ${p.displayTitle === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>${titles.length ? "" : `<small class="muted">Em chưa có danh hiệu nào — hoàn thành thử thách trong mục Thành tích để mở khoá.</small>`}</div>
        <div class="field"><label>Khẩu hiệu của em (tối đa 60 ký tự)</label><input name="tagline" maxlength="60" value="${esc(p.tagline || "")}" placeholder="VD: Mỗi ngày một chút, giỏi tiếng Anh!"></div>
        <div class="form-grid">
          <div class="field"><label>Mục tiêu học mỗi ngày</label><select name="dailyGoalMinutes">${goals.map(g => `<option value="${g}" ${Number(p.dailyGoalMinutes || 15) === g ? "selected" : ""}>${g} phút</option>`).join("")}</select></div>
          <div class="field"><label>Điểm mục tiêu</label><select name="targetScore">${targets.map(t => `<option value="${t}" ${Number(p.targetScore || 8) === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        </div>
        <div class="field"><label>Kỹ năng em muốn ưu tiên (gợi ý sẽ tập trung vào đây)</label><div class="rb-focus">${Object.entries(SKILLS).map(([k, l]) => `<label class="rb-chip ${focus.has(k) ? "on" : ""}"><input type="checkbox" value="${k}" ${focus.has(k) ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
        <button class="btn btn-primary" type="submit" style="width:100%">Lưu</button>
      </form></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-x]")) m.remove(); });
    m.querySelectorAll(".rb-chip input").forEach(i => i.addEventListener("change", () => i.closest(".rb-chip").classList.toggle("on", i.checked)));
    m.querySelector("#rbForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target;
      const next = { ...p, displayTitle: f.displayTitle.value || null, tagline: f.tagline.value.trim().slice(0, 60) || null, dailyGoalMinutes: Number(f.dailyGoalMinutes.value), targetScore: Number(f.targetScore.value), focusSkills: [...m.querySelectorAll(".rb-chip input:checked")].map(i => i.value), updatedAt: new Date().toISOString() };
      saveProfile(next);
      m.remove();
      showToast("Đã lưu tuỳ chỉnh.");
      setTimeout(renderStudent, 600);
    });
  }

  function hookTeacherModal() {
    if (typeof window.openStudentProgress !== "function" || window.__engoRbHooked) return;
    window.__engoRbHooked = true;
    const orig = window.openStudentProgress;
    const wrapped = async function (id) {
      const r = await orig.apply(this, arguments);
      const body = document.getElementById("studentProgressBody");
      if (body) {
        const box = document.createElement("div");
        box.className = "rb rb-modal";
        box.innerHTML = `<p class="small muted">Đang tải bảng kết quả...</p>`;
        body.prepend(box);
        try {
          const d = await apiRequest(`/api/progress/students/${id}/board`);
          box.innerHTML = boardHtml(d.board, { compact: true });
          box.querySelector(".rb-sem").addEventListener("change", async e => {
            const d2 = await apiRequest(`/api/progress/students/${id}/board${e.target.value ? `?semester=${e.target.value}` : ""}`);
            box.innerHTML = boardHtml(d2.board, { compact: true }); drawCharts(box, d2.board);
          });
          drawCharts(box, d.board);
        } catch (e) { box.remove(); }
      }
      return r;
    };
    wrapped.__rb = true;
    Object.keys(orig).forEach(k => { wrapped[k] = orig[k]; });
    window.openStudentProgress = wrapped;
  }

  window.addEventListener("engo:view", e => { if (e.detail === "student-home") renderStudent(); });
  window.addEventListener("engo:user-ready", () => { hookTeacherModal(); const a = document.querySelector(".view.active"); if (a && a.id === "student-home") renderStudent(); });
  window.addEventListener("engo:logout", () => { document.getElementById("resultsBoard")?.remove(); charts.forEach(c => c.destroy()); charts.clear(); });
  document.addEventListener("click", e => { if (e.target.closest("#refreshDashboardBtn")) setTimeout(renderStudent, 100); });
  window.ENGO_RESULTS = { render: renderStudent };
})();
