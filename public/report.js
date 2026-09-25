(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const SKILL_VI = { Listening: "Nghe", Speaking: "Nói", Vocabulary: "Từ vựng", Grammar: "Ngữ pháp", Writing: "Viết", Reading: "Đọc" };
  const minutes = s => Math.round((Number(s) || 0) / 60);
  const fmtMin = s => { const m = minutes(s); return m >= 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m} phút`; };
  const dayLabel = d => ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][new Date(d + "T00:00:00").getDay()];
  const scoreClass = v => (v >= 8 ? "good" : v >= 6.5 ? "ok" : v >= 5 ? "mid" : "low");
  const fmtDate = v => { try { return new Date(v).toLocaleDateString("vi-VN"); } catch (e) { return ""; } };

  async function fetchSummary(studentId) {
    const d = await apiRequest(`/api/progress/students/${studentId}/summary`);
    return d.summary;
  }

  function weekBars(study) {
    const max = Math.max(30 * 60, ...study.last7.map(x => x.seconds));
    return `<div class="rp-week">${study.last7.map(x => `<div class="rp-day"><div class="rp-bar-wrap"><div class="rp-bar" style="height:${Math.max(3, Math.round((x.seconds / max) * 100))}%"></div></div><span class="rp-val">${minutes(x.seconds)}'</span><span class="rp-lbl">${dayLabel(x.date)}</span></div>`).join("")}</div>`;
  }

  function skillBars(skills) {
    return `<div class="rp-skills">${Object.keys(SKILL_VI).map(k => `<div class="rp-skill"><span>${SKILL_VI[k]}</span><div class="rp-track"><div style="width:${Math.max(2, skills[k] || 0)}%"></div></div><b>${skills[k] || 0}</b></div>`).join("")}</div>`;
  }

  function errorsHtml(errors) {
    const chips = [
      ...(errors.grammar || []).map(g => `<span class="rp-chip">${esc(g.label)} <b>×${g.count}</b></span>`),
      ...(errors.sections || []).map(s => `<span class="rp-chip">Phần ${esc(s.section)} <b>×${s.count}</b></span>`),
      ...(errors.words || []).slice(0, 5).map(w => `<span class="rp-chip rp-chip-word">phát âm “${esc(w.word)}” <b>×${w.count}</b></span>`),
    ];
    return chips.length ? `<div class="rp-chips">${chips.join("")}</div>` : `<p class="small muted">Chưa ghi nhận lỗi lặp lại nào.</p>`;
  }

  function scoresList(history) {
    const list = history.slice().reverse().slice(0, 6);
    return list.length ? `<div class="rp-scores">${list.map(h => `<div class="rp-score-row"><span class="rp-score ${scoreClass(h.score)}">${h.status === "pending_manual" ? "…" : Number(h.score).toFixed(1)}</span><div><strong>${esc(h.title)}</strong><small>${fmtDate(h.at)}${h.status === "pending_manual" ? " · chờ GV chấm phần viết" : ""}</small></div></div>`).join("")}</div>` : `<p class="small muted">Chưa làm bài kiểm tra nào.</p>`;
  }

  const LEVEL_ICON = { danger: "notifications_active", warn: "error", info: "schedule", good: "celebration" };
  function remindersHtml(list) {
    return list.length ? `<div class="rp-reminders">${list.map(r => `<div class="rp-reminder ${r.level}"><i class=mi>${esc(r.icon || LEVEL_ICON[r.level] || "info")}</i><span>${esc(r.text)}</span></div>`).join("")}</div>` : "";
  }

  function tiles(s) {
    const done = s.completed.tests + s.completed.vocabSets + s.completed.listeningUnits + s.completed.grammarUnits + s.completed.wordformSessions;
    return `<div class="rp-tiles">
      <div class="rp-tile"><span>Điểm TB kiểm tra</span><strong class="${scoreClass(s.scores.testAvg)}">${s.scores.testCount ? Number(s.scores.testAvg).toFixed(1) : "--"}</strong><small>${s.scores.testCount} bài${s.scores.improvement ? ` · ${s.scores.improvement > 0 ? "▲" : "▼"} ${Math.abs(s.scores.improvement)}` : ""}</small></div>
      <div class="rp-tile"><span>Học tuần này</span><strong>${minutes(s.studyTime.weekSeconds)}<em>phút</em></strong><small>Hôm nay ${minutes(s.studyTime.todaySeconds)} phút</small></div>
      <div class="rp-tile"><span>Bài đã hoàn thành</span><strong>${done}</strong><small>${s.completed.tests} kiểm tra · ${s.completed.vocabSets} bộ từ</small></div>
      <div class="rp-tile"><span>Ngày có học</span><strong>${s.completed.activeDays}</strong><small>Tổng ${fmtMin(s.studyTime.totalSeconds)}</small></div>
    </div>`;
  }

  const Parent = {
    childId: null,
    async render() {
      const host = document.getElementById("parentRoot");
      if (!host) return;
      const u = me();
      if (!u) return;
      if (u.mustChangePassword) { host.innerHTML = `<div class="card panel section"><p>Vui lòng đổi mật khẩu để xem kết quả học tập của con.</p></div>`; return; }
      let children = u.children;
      if (!children) { try { const d = await apiRequest("/api/auth/me"); children = d.user.children || []; u.children = children; } catch (e) { children = []; } }
      if (u.role !== "parent") {
        host.innerHTML = `<div class="card panel section"><p class="small muted">Trang này dành cho phụ huynh.</p></div>`;
        return;
      }
      if (!children.length) {
        host.innerHTML = `<div class="pr-empty card panel"><i class=mi>family_restroom</i><h3>Tài khoản chưa được liên kết với học sinh</h3><p>Vui lòng liên hệ giáo viên chủ nhiệm hoặc nhà trường để liên kết tài khoản của con.</p></div>`;
        return;
      }
      if (!children.some(c => c.id === this.childId)) this.childId = children[0].id;
      host.innerHTML = `
        <div class="pr-head">
          <div><h2>Chào ${esc(u.fullName || "phụ huynh")}</h2><p class="muted">Theo dõi việc học tiếng Anh của con mỗi ngày.</p></div>
          ${children.length > 1 ? `<div class="pr-kids">${children.map(c => `<button type="button" class="pr-kid ${c.id === this.childId ? "on" : ""}" data-kid="${c.id}"><b>${esc(String(c.fullName).split(/\s+/).slice(-1)[0])}</b><small>${esc(c.className || "")}</small></button>`).join("")}</div>` : ""}
        </div>
        <div id="prBody"><p class="small muted">Đang tải kết quả của con...</p></div>`;
      host.querySelectorAll("[data-kid]").forEach(b => b.addEventListener("click", () => { this.childId = Number(b.dataset.kid); this.render(); }));
      const body = host.querySelector("#prBody");
      try {
        const s = await fetchSummary(this.childId);
        this.summary = s;
        body.innerHTML = `
          <div class="card panel pr-child">
            <div class="pr-child-head"><div><h3>${esc(s.student.fullName)}</h3><span class="muted">Lớp ${esc(s.student.className || "—")}</span></div>
              <div class="pr-actions"><button type="button" class="btn btn-primary" id="prShare"><i class=mi>image</i> Tải ảnh báo cáo</button><button type="button" class="btn btn-light" id="prRefresh" title="Làm mới"><i class=mi>refresh</i></button></div></div>
            ${remindersHtml(s.reminders)}
            ${tiles(s)}
          </div>
          <div class="grid two-col pr-grid">
            <div class="card panel"><h4><i class=mi>schedule</i> Thời gian học 7 ngày qua</h4>${weekBars(s.studyTime)}</div>
            <div class="card panel"><h4><i class=mi>fact_check</i> Điểm các bài gần đây</h4>${scoresList(s.scores.history)}</div>
            <div class="card panel"><h4><i class=mi>insights</i> Kỹ năng</h4>${skillBars(s.scores.skills)}</div>
            <div class="card panel"><h4><i class=mi>report</i> Lỗi con hay mắc</h4>${errorsHtml(s.commonErrors)}${s.titles.length ? `<h4 style="margin-top:14px"><i class=mi>military_tech</i> Danh hiệu</h4><div class="rp-chips">${s.titles.map(t => `<span class="rp-chip rp-chip-title">${esc(t.name)}</span>`).join("")}</div>` : ""}</div>
          </div>`;
        body.querySelector("#prShare").addEventListener("click", e => exportSummary(s, e.currentTarget));
        body.querySelector("#prRefresh").addEventListener("click", () => this.render());
      } catch (e) {
        body.innerHTML = `<div class="card panel"><p>${esc(e.message)}</p></div>`;
      }
    },
  };
  window.ENGO_PARENT = Parent;

  function cardHtml(s) {
    const date = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `<div class="rc">
      <div class="rc-top"><div class="rc-brand"><img src="/images/engocircle.png?v=2" alt="" onerror="this.remove()"><div><b>ENGO</b><span>Báo cáo học tập tiếng Anh</span></div></div><div class="rc-date">${date}</div></div>
      <div class="rc-student"><h2>${esc(s.student.fullName)}</h2><span>Lớp ${esc(s.student.className || "—")}</span></div>
      ${tiles(s)}
      <div class="rc-grid">
        <div class="rc-box"><h4>Thời gian học 7 ngày qua</h4>${weekBars(s.studyTime)}</div>
        <div class="rc-box"><h4>Kỹ năng</h4>${skillBars(s.scores.skills)}</div>
        <div class="rc-box"><h4>Điểm các bài gần đây</h4>${scoresList(s.scores.history)}</div>
        <div class="rc-box"><h4>Cần luyện thêm</h4>${errorsHtml(s.commonErrors)}</div>
      </div>
      ${s.titles.length ? `<div class="rc-titles">${s.titles.map(t => `<span class="rp-chip rp-chip-title">${esc(t.name)}</span>`).join("")}</div>` : ""}
      <div class="rc-foot">Tạo từ ENGO Learning Hub · ${esc(location.host)}</div>
    </div>`;
  }

  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error("Không tải được công cụ xuất ảnh, kiểm tra kết nối mạng."));
      document.head.appendChild(s);
    });
  }

  async function exportSummary(summary, btn) {
    const old = btn ? btn.innerHTML : "";
    if (btn) { btn.disabled = true; btn.innerHTML = "Đang tạo ảnh..."; }
    const stage = document.getElementById("reportStage");
    try {
      const h2c = await loadHtml2Canvas();
      stage.innerHTML = cardHtml(summary);
      await (document.fonts ? document.fonts.ready : Promise.resolve());
      const card = stage.querySelector(".rc");
      const canvas = await h2c(card, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const safe = String(summary.student.fullName || "hoc-sinh").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
      const name = `engo-bao-cao-${safe}-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], name, { type: "image/png" });
      const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Báo cáo học tập ENGO", text: `Kết quả học tiếng Anh của ${summary.student.fullName}` }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      showToast("Đã lưu ảnh báo cáo — gửi qua Zalo/Messenger như ảnh bình thường.");
    } catch (e) {
      showToast(e.message || "Không tạo được ảnh.");
    } finally {
      stage.innerHTML = "";
      if (btn) { btn.disabled = false; btn.innerHTML = old; }
    }
  }

  async function exportStudent(studentId, btn) {
    try { await exportSummary(await fetchSummary(studentId), btn); } catch (e) { showToast(e.message); }
  }
  window.ENGO_REPORT = { exportStudent, exportSummary, fetchSummary };

  function studentButton() {
    const u = me();
    const heading = document.querySelector("#student-home .page-heading > div:last-child");
    const exist = document.getElementById("rpStudentExport");
    if (!u || u.role !== "student" || !window.can("reports.export")) { exist?.remove(); return; }
    if (exist || !heading) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "rpStudentExport"; b.className = "btn btn-light"; b.innerHTML = "<i class=mi>image</i> Xuất ảnh kết quả";
    b.addEventListener("click", () => exportStudent("me", b));
    heading.prepend(b);
  }

  function hookTeacherModal() {
    if (typeof window.openStudentProgress !== "function" || window.__engoRpHooked) return;
    window.__engoRpHooked = true;
    const orig = window.openStudentProgress;
    const wrapped = async function (id) {
      const r = await orig.apply(this, arguments);
      const head = document.querySelector("#studentProgressModal .modal-head");
      if (head && window.can("reports.export")) {
        head.querySelector(".rp-modal-export")?.remove();
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn btn-light btn-sm rp-modal-export"; b.innerHTML = "<i class=mi>image</i> Xuất ảnh";
        b.addEventListener("click", () => exportStudent(id, b));
        head.insertBefore(b, head.querySelector(".close-btn"));
      }
      return r;
    };
    wrapped.__rp = true;
    window.openStudentProgress = wrapped;
  }

  const tracker = { seconds: 0, lastActivity: Date.now(), timer: null };
  const LEARNING_VIEWS = new Set(["quiz", "tests", "vocabulary", "errorHealing", "listening-lab", "speaking-lab"]);
  function flushStudy(leaving) {
    const secs = Math.min(180, Math.round(tracker.seconds));
    if (secs < 10) return;
    tracker.seconds = 0;
    fetch("/api/learning-time", { method: "POST", credentials: "same-origin", keepalive: Boolean(leaving), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds: secs }) }).catch(() => {});
  }
  function startTracker() {
    if (tracker.timer) return;
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(ev => window.addEventListener(ev, () => { tracker.lastActivity = Date.now(); }, { passive: true }));
    tracker.timer = setInterval(() => {
      const u = me();
      if (!u || u.role !== "student" || document.visibilityState !== "visible") return;
      const active = document.querySelector(".view.active");
      const idle = Date.now() - tracker.lastActivity > 90000;
      const speakingOrListening = window.speechSynthesis && window.speechSynthesis.speaking;
      if (!active || !LEARNING_VIEWS.has(active.id) || (idle && !speakingOrListening && active.id !== "quiz")) return;
      tracker.seconds += 5;
      if (tracker.seconds >= 60) flushStudy(false);
    }, 5000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushStudy(true); });
    window.addEventListener("pagehide", () => flushStudy(true));
  }

  window.addEventListener("engo:user-ready", () => { studentButton(); hookTeacherModal(); const a = document.querySelector(".view.active"); if (a && a.id === "parent-home") Parent.render(); });
  window.addEventListener("engo:view", e => { if (e.detail === "student-home") studentButton(); });
  window.addEventListener("engo:logout", () => { flushStudy(true); Parent.childId = null; document.getElementById("rpStudentExport")?.remove(); });
  const start = () => { startTracker(); hookTeacherModal(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
