(function () {
  "use strict";
  const state = { by: "xp", scope: "class" };
  const SCOPES = [["class", "Lớp tôi"], ["grade", "Cả khối"], ["school", "Toàn trường"]];
  const BYS = [["xp", "Cấp độ", "military_tech"], ["carrots", "Cà rốt", "eco"]];
  const medal = r => r === 1 ? "gold" : r === 2 ? "silver" : r === 3 ? "bronze" : "";

  function avatarCell(p) {
    const a = p.avatar || {};
    return `<span class="lb-avatar${a.type === "image" ? " has-img" : ""}">${window.avatarHTML ? window.avatarHTML(a, p.name, "student") : ""}</span>`;
  }
  function scoreText(p, by) {
    return by === "carrots"
      ? `<b>${p.carrots}</b> <i class=ico-carrot></i>`
      : `<b>Cấp ${p.level}</b> <span class="small muted">${p.xp} XP</span>`;
  }

  window.renderLeaderboard = async function () {
    const host = document.getElementById("leaderboardMount");
    if (!host) return;
    const esc = window.escapeHTML || (s => String(s));
    host.innerHTML = `
      <div class="card panel lb-panel">
        <div class="lb-controls">
          <div class="seg" data-lb="by">${BYS.map(([v, l, ic]) => `<button type="button" data-val="${v}" class="${state.by === v ? "active" : ""}"><i class=mi>${ic}</i> ${l}</button>`).join("")}</div>
          <div class="seg" data-lb="scope">${SCOPES.map(([v, l]) => `<button type="button" data-val="${v}" class="${state.scope === v ? "active" : ""}">${l}</button>`).join("")}</div>
          <span class="lb-daily" data-daily-carrots></span>
        </div>
        <div id="lbBody"><p class="small muted" style="padding:18px 4px">Đang tải bảng xếp hạng...</p></div>
      </div>`;
    host.querySelectorAll("[data-lb]").forEach(seg => seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      state[seg.dataset.lb] = b.dataset.val;
      window.renderLeaderboard();
    })));
    if (typeof renderDailyCarrots === "function") renderDailyCarrots();
    let data;
    try { data = await apiRequest(`/api/leaderboard?by=${state.by}&scope=${state.scope}&limit=30`); }
    catch (e) { host.querySelector("#lbBody").innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
    const list = data.list || [];
    const scopeLabel = state.scope === "class" ? (data.className ? `lớp ${data.className}` : "lớp của bạn") : state.scope === "grade" ? "cả khối" : "toàn trường";
    const podium = list.slice(0, 3);
    const rest = list.slice(3);
    const meInList = list.some(p => p.isMe);
    host.querySelector("#lbBody").innerHTML = !list.length ? `<p class="small muted" style="padding:18px 4px">Chưa có học sinh nào trong ${esc(scopeLabel)}.</p>` : `
      <p class="small muted lb-sub">${data.total} học sinh ${esc(scopeLabel)} · ${state.by === "carrots" ? "xếp theo tổng cà rốt đã kiếm (tính cả cà rốt đã cho Capybara ăn)" : "xếp theo cấp độ (XP)"}</p>
      <div class="lb-podium">${[podium[1], podium[0], podium[2]].filter(Boolean).map(p => `
        <div class="lb-pod ${medal(p.rank)}${p.isMe ? " me" : ""}">
          <div class="lb-crown">${p.rank === 1 ? "<i class=mi>workspace_premium</i>" : `#${p.rank}`}</div>
          ${avatarCell(p)}
          <div class="lb-name">${esc(p.name)}</div>
          <div class="small muted">${esc(p.className || "")}</div>
          <div class="lb-score">${scoreText(p, state.by)}</div>
        </div>`).join("")}</div>
      <ol class="lb-list">${rest.map(p => `
        <li class="${p.isMe ? "me" : ""}">
          <span class="lb-rank">${p.rank}</span>
          ${avatarCell(p)}
          <span class="lb-who"><b>${esc(p.name)}</b>${state.scope !== "class" && p.className ? ` <span class="small muted">· ${esc(p.className)}</span>` : ""}</span>
          <span class="lb-val">${scoreText(p, state.by)}</span>
        </li>`).join("")}</ol>
      ${!meInList && data.me ? `<div class="lb-me-row">Bạn đang đứng <b>hạng ${data.me.rank}</b> ${esc(scopeLabel)} với ${state.by === "carrots" ? `<b>${data.me.score}</b> cà rốt` : `<b>${data.me.score}</b> XP`}. Cố lên nhé!</div>` : ""}`;
  };
})();
