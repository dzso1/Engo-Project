(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const SKILLS = { Listening: "Nghe", Speaking: "Nói", Vocabulary: "Từ vựng", Grammar: "Ngữ pháp", Writing: "Viết", Reading: "Đọc" };

  function profileKey() { const u = me(); return u ? `engoProfileV1_user_${u.id}` : null; }
  function getProfile() { try { return JSON.parse(localStorage.getItem(profileKey()) || "{}") || {}; } catch (e) { return {}; } }
  function saveProfile(p) { const k = profileKey(); if (!k) return; localStorage.setItem(k, JSON.stringify(p)); if (typeof pushCloudData === "function") pushCloudData(); }

  function recsHtml(r) {
    const pct = Math.min(100, Math.round((r.goal.todayMinutes / r.goal.minutes) * 100));
    return `<div class="rb-recs card panel">
      <div class="rb-goal"><div class="rb-ring" style="--p:${pct}"><b>${r.goal.todayMinutes}'</b><small>/${r.goal.minutes}'</small></div><div><h4>Mục tiêu hôm nay</h4><p class="small muted">${pct >= 100 ? "Tuyệt vời! Em đã đạt mục tiêu hôm nay." : `Học thêm ${r.goal.minutes - r.goal.todayMinutes} phút nữa nhé.`} Tuần này: ${r.goal.weekMinutes} phút.</p></div><button type="button" class="btn btn-light btn-sm rb-customize" id="rbCustomize"><i class=mi>tune</i> Tuỳ chỉnh</button></div>
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
    try {
      const rc = await apiRequest("/api/progress/me/recommendations");
      host.innerHTML = recsHtml(rc);
      host.querySelector("#rbCustomize").addEventListener("click", openCustomize);
      host.querySelectorAll("[data-rec]").forEach(b => b.addEventListener("click", () => switchView(rc.items[Number(b.dataset.rec)].view)));
    } catch (e) {
      host.remove();
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
        <div class="field"><label>Danh hiệu hiển thị cạnh tên (đấu trường)</label><select name="displayTitle"><option value="">— Không hiển thị —</option>${titles.map(t => `<option ${p.displayTitle === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>${titles.length ? "" : `<small class="muted">Em chưa có danh hiệu nào — hoàn thành thử thách trong mục Thành tích để mở khoá.</small>`}</div>
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
    m.querySelector("#rbForm").addEventListener("submit", e => {
      e.preventDefault();
      const f = e.target;
      const next = { ...p, displayTitle: f.displayTitle.value || null, tagline: f.tagline.value.trim().slice(0, 60) || null, dailyGoalMinutes: Number(f.dailyGoalMinutes.value), targetScore: Number(f.targetScore.value), focusSkills: [...m.querySelectorAll(".rb-chip input:checked")].map(i => i.value), updatedAt: new Date().toISOString() };
      saveProfile(next);
      m.remove();
      showToast("Đã lưu tuỳ chỉnh.");
      setTimeout(renderStudent, 600);
    });
  }

  window.addEventListener("engo:view", e => { if (e.detail === "student-home") renderStudent(); });
  window.addEventListener("engo:user-ready", () => { const a = document.querySelector(".view.active"); if (a && a.id === "student-home") renderStudent(); });
  window.addEventListener("engo:logout", () => { document.getElementById("resultsBoard")?.remove(); });
  document.addEventListener("click", e => { if (e.target.closest("#refreshDashboardBtn")) setTimeout(renderStudent, 100); });
  window.ENGO_RESULTS = { render: renderStudent };
})();
