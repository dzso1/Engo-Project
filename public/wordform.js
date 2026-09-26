(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const POS_VI = { n: "danh từ", v: "động từ", adj: "tính từ", adv: "trạng từ" };
  const POS_CLS = { n: "wf-n", v: "wf-v", adj: "wf-adj", adv: "wf-adv" };
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const norm = s => String(s || "").trim().toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ");
  const sfx = n => { try { window.playSfx && window.playSfx(n); } catch (e) {} };
  const cheer = k => { try { window.cheer ? window.cheer(k) : sfx(k); } catch (e) {} };
  const state = { unit: 1, families: [], cache: {}, mode: "study", game: null };

  async function load(unit) {
    if (state.cache[unit]) return state.cache[unit];
    let list = [];
    try { const d = await apiRequest(`/api/word-families?unit=${unit}`); list = d.families || []; } catch (e) {}
    if (!list.length) list = ((window.ENGO_WORD_FAMILIES || {})[`unit${unit}`] || []).map((f, i) => ({ id: `s${unit}-${i}`, unit, ...f }));
    state.cache[unit] = list;
    return list;
  }

  function unitName(u) {
    const d = (window.ENGO_VOCAB_UNITS || {})[`unit${u}`];
    return d && d.name ? d.name : `Unit ${u}`;
  }

  function mount() {
    const view = document.getElementById("vocabulary");
    if (!view || document.getElementById("wfCard")) return;
    const card = document.createElement("div");
    card.className = "card panel section wf-card";
    card.id = "wfCard";
    const anchor = document.getElementById("unitVocabMount") || view.querySelector(".flashcard-layout") || view.querySelector(".page-heading");
    anchor?.insertAdjacentElement("afterend", card);
  }

  function header() {
    const modes = [["study", "menu_book", "Xem họ từ"], ["gap", "edit_note", "Điền dạng đúng"], ["mc", "checklist", "Trắc nghiệm"], ["drag", "drag_indicator", "Kéo – thả ghép từ"]];
    return `<div class="wf-head">
      <div><h3><i class=mi>account_tree</i> Word Form · Họ từ</h3><p class="small muted">Nhóm các từ cùng gốc (decide – decision – decisive – decisively) và luyện chọn đúng dạng từ.</p></div>
      <select id="wfUnit" aria-label="Chọn Unit">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${state.unit === i + 1 ? "selected" : ""}>${esc(unitName(i + 1))}</option>`).join("")}</select>
    </div>
    <div class="wf-modes">${modes.map(([k, ic, l]) => `<button type="button" class="wf-mode ${state.mode === k ? "on" : ""}" data-wf-mode="${k}"><i class=mi>${ic}</i> ${l}</button>`).join("")}</div>
    <div id="wfStage"></div>`;
  }

  async function render() {
    mount();
    const card = document.getElementById("wfCard");
    if (!card) return;
    const u = me();
    card.classList.toggle("hidden", !u || u.role !== "student");
    if (!u || u.role !== "student") return;
    card.innerHTML = header();
    card.querySelector("#wfUnit").addEventListener("change", async e => { state.unit = Number(e.target.value); state.game = null; await render(); });
    card.querySelectorAll("[data-wf-mode]").forEach(b => b.addEventListener("click", () => { state.mode = b.dataset.wfMode; state.game = null; render(); }));
    state.families = await load(state.unit);
    const stage = card.querySelector("#wfStage");
    if (!state.families.length) { stage.innerHTML = `<p class="small muted">Unit này chưa có họ từ.</p>`; return; }
    if (state.mode === "study") renderStudy(stage);
    else if (state.mode === "gap") startQuiz(stage, "gap");
    else if (state.mode === "mc") startQuiz(stage, "mc");
    else if (state.mode === "drag") startDrag(stage);
  }

  function speak(word) { try { if (typeof speakEnglishText === "function") speakEnglishText(word); } catch (e) {} }

  function renderStudy(stage) {
    stage.innerHTML = `<div class="wf-families">${state.families.map(f => `
      <div class="wf-family">
        <div class="wf-root">${esc(f.root)}</div>
        <div class="wf-members">${f.members.map(m => `<button type="button" class="wf-member ${POS_CLS[m.pos] || ""}" data-say="${esc(m.w)}"><b>${esc(m.w)}</b><span class="wf-pos">${esc(m.pos)}</span><small>${esc(m.vi)}</small></button>`).join("")}</div>
      </div>`).join("")}</div>
      <div class="wf-legend"><span class="wf-n">n · danh từ</span><span class="wf-v">v · động từ</span><span class="wf-adj">adj · tính từ</span><span class="wf-adv">adv · trạng từ</span><span class="small muted">Bấm vào từ để nghe phát âm.</span></div>`;
    stage.querySelectorAll("[data-say]").forEach(b => b.addEventListener("click", () => speak(b.dataset.say)));
  }

  function buildItems(mode) {
    const all = [];
    state.families.forEach(f => (f.items || []).forEach(it => all.push({ fam: f, s: it.s, a: it.a })));
    const picked = shuffle(all).slice(0, 10);
    const pool = state.families.flatMap(f => f.members.map(m => m.w));
    return picked.map(it => {
      const member = it.fam.members.find(m => m.w === it.a) || { pos: "" };
      let options = [];
      if (mode === "mc") {
        const own = it.fam.members.map(m => m.w);
        options = shuffle([it.a, ...shuffle(own.filter(w => w !== it.a)).slice(0, 3)]);
        while (options.length < 4) { const w = pool[Math.floor(Math.random() * pool.length)]; if (!options.includes(w)) options.push(w); }
        options = shuffle(options);
      }
      return { ...it, pos: member.pos, options };
    });
  }

  function startQuiz(stage, mode) {
    const items = buildItems(mode);
    state.game = { mode, items, i: 0, correct: 0, answered: false, wrong: [] };
    drawQuestion(stage);
  }

  function sentenceHtml(s, inner) {
    const parts = esc(s).split("____");
    return `${parts[0]}${inner}${parts.slice(1).join("____")}`;
  }

  function drawQuestion(stage) {
    const g = state.game;
    if (g.i >= g.items.length) return finish(stage);
    const it = g.items[g.i];
    const input = g.mode === "gap"
      ? `<input class="blank-input wf-input" id="wfAnswer" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Điền dạng đúng của từ">`
      : `<span class="blank-line"></span>`;
    stage.innerHTML = `
      <div class="wf-progress"><span>Câu ${g.i + 1}/${g.items.length}</span><div class="progress"><span style="width:${(g.i / g.items.length) * 100}%"></span></div><span>✔ ${g.correct}</span></div>
      <div class="wf-q">
        <p class="small muted">${g.mode === "gap" ? "Viết dạng đúng của từ trong ngoặc vào chỗ trống." : "Chọn dạng từ đúng để hoàn thành câu."}</p>
        <h4 class="has-blank">${sentenceHtml(it.s, input)} <span class="wf-hint">(${esc(it.fam.root)})</span></h4>
        ${g.mode === "mc" ? `<div class="option-list wf-options">${it.options.map((o, k) => `<div class="option" data-opt="${esc(o)}"><span class="option-marker">${String.fromCharCode(65 + k)}</span><span>${esc(o)}</span></div>`).join("")}</div>` : `<button type="button" class="btn btn-primary" id="wfCheck">Kiểm tra</button>`}
        <div class="wf-feedback" id="wfFeedback"></div>
      </div>`;
    const check = value => {
      if (g.answered) return;
      g.answered = true;
      const ok = norm(value) === norm(it.a);
      if (ok) { g.correct++; sfx("correct"); } else { sfx("wrong"); g.wrong.push(it); }
      const fb = stage.querySelector("#wfFeedback");
      const member = it.fam.members.find(m => m.w === it.a);
      fb.className = `wf-feedback ${ok ? "ok" : "bad"}`;
      fb.innerHTML = `${ok ? "<b>Chính xác!</b>" : `<b>Chưa đúng.</b> Đáp án: <b>${esc(it.a)}</b>`} — ${esc(it.a)} là <b>${POS_VI[it.pos] || it.pos}</b>${member && member.vi ? ` (${esc(member.vi)})` : ""}. <span class="small muted">Họ từ: ${it.fam.members.map(m => `${esc(m.w)} <i>${esc(m.pos)}</i>`).join(" · ")}</span>
        <button type="button" class="btn btn-primary btn-sm" id="wfNext">${g.i + 1 >= g.items.length ? "Xem kết quả" : "Câu tiếp →"}</button>`;
      if (g.mode === "mc") stage.querySelectorAll("[data-opt]").forEach(o => { o.classList.add("locked"); if (norm(o.dataset.opt) === norm(it.a)) o.classList.add("correct"); else if (o.dataset.opt === value) o.classList.add("wrong"); });
      else { const inp = stage.querySelector("#wfAnswer"); inp.disabled = true; inp.classList.add(ok ? "wf-right" : "wf-wrong"); }
      const next = stage.querySelector("#wfNext");
      next.addEventListener("click", () => { g.i++; g.answered = false; drawQuestion(stage); });
      next.focus();
    };
    if (g.mode === "mc") stage.querySelectorAll("[data-opt]").forEach(o => o.addEventListener("click", () => check(o.dataset.opt)));
    else {
      const inp = stage.querySelector("#wfAnswer");
      const fit = () => { inp.style.width = `${Math.max(8, Math.min(24, inp.value.length + 2))}ch`; };
      inp.addEventListener("input", fit); fit();
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (inp.value.trim()) check(inp.value); } });
      stage.querySelector("#wfCheck").addEventListener("click", () => { if (inp.value.trim()) check(inp.value); else inp.focus(); });
      setTimeout(() => inp.focus(), 30);
    }
  }

  async function record(score, max, meta) {
    const percent = max ? Math.round((score / max) * 100) : 0;
    try { await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type: "wordform", refId: `unit${state.unit}`, title: `Word form · ${unitName(state.unit)}`, score, maxScore: max, meta: { unit: state.unit, percent, ...meta } }) }); } catch (e) {}
    if (typeof studentProgress !== "undefined") { try { studentProgress = null; } catch (e) {} }
    if (typeof gainRewards === "function" && percent >= 50) gainRewards(Math.round(percent / 5), percent >= 80 ? 3 : 1, "Luyện word form");
    return percent;
  }

  async function finish(stage) {
    const g = state.game;
    const percent = await record(g.correct, g.items.length, { mode: g.mode });
    cheer(percent >= 80 ? "perfect" : "taskDone");
    stage.innerHTML = `<div class="wf-result">
      <div class="wf-score ${percent >= 80 ? "good" : percent >= 50 ? "ok" : "low"}">${g.correct}/${g.items.length}</div>
      <p>${percent >= 80 ? "Xuất sắc! Em nắm rất chắc các dạng từ." : percent >= 50 ? "Khá tốt! Ôn lại các từ sai bên dưới nhé." : "Cần luyện thêm — xem lại họ từ rồi làm lại nhé."}</p>
      ${g.wrong.length ? `<div class="wf-review">${g.wrong.map(it => `<div><span>${sentenceHtml(it.s, `<b class="ans-right">${esc(it.a)}</b>`)}</span> <small class="muted">(${esc(POS_VI[it.pos] || it.pos)})</small></div>`).join("")}</div>` : ""}
      <div class="wf-actions"><button type="button" class="btn btn-primary" id="wfAgain">Làm lượt mới</button><button type="button" class="btn btn-light" id="wfStudy">Xem họ từ</button></div>
    </div>`;
    stage.querySelector("#wfAgain").addEventListener("click", () => startQuiz(stage, g.mode));
    stage.querySelector("#wfStudy").addEventListener("click", () => { state.mode = "study"; render(); });
  }

  function startDrag(stage) {
    const count = window.matchMedia("(max-width: 640px)").matches ? 3 : 4;
    const fams = shuffle(state.families).slice(0, count);
    const chips = shuffle(fams.flatMap((f, fi) => f.members.filter(m => m.w !== f.root).map(m => ({ w: m.w, pos: m.pos, fi }))));
    state.game = { mode: "drag", fams, chips, placed: 0, firstTry: 0, tried: new Set(), selected: null };
    stage.innerHTML = `
      <p class="small muted">Kéo mỗi từ vào đúng <b>từ gốc</b> của nó (hoặc bấm chọn từ rồi bấm vào ô từ gốc).</p>
      <div class="wf-pool" id="wfPool">${chips.map((c, k) => `<button type="button" class="wf-chip" data-chip="${k}">${esc(c.w)}</button>`).join("")}</div>
      <div class="wf-zones">${fams.map((f, fi) => `<div class="wf-zone" data-zone="${fi}"><div class="wf-zone-root">${esc(f.root)} <small>${esc(f.members.find(m => m.w === f.root)?.pos || "")}</small></div><div class="wf-zone-items"></div></div>`).join("")}</div>
      <div class="wf-drag-status" id="wfDragStatus">0/${chips.length} từ đã ghép</div>`;
    const g = state.game;
    const pool = stage.querySelector("#wfPool");
    const status = stage.querySelector("#wfDragStatus");
    const place = (chipEl, zoneEl) => {
      const k = Number(chipEl.dataset.chip);
      const c = g.chips[k];
      const fi = Number(zoneEl.dataset.zone);
      if (c.fi === fi) {
        if (!g.tried.has(k)) g.firstTry++;
        g.placed++;
        chipEl.classList.remove("sel");
        chipEl.classList.add("placed", POS_CLS[c.pos] || "");
        chipEl.innerHTML = `${esc(c.w)} <small>${esc(c.pos)}</small>`;
        chipEl.disabled = true;
        zoneEl.querySelector(".wf-zone-items").appendChild(chipEl);
        zoneEl.classList.add("hit"); setTimeout(() => zoneEl.classList.remove("hit"), 400);
        sfx("correct");
        status.textContent = `${g.placed}/${g.chips.length} từ đã ghép`;
        if (g.placed === g.chips.length) setTimeout(() => finishDrag(stage), 500);
      } else {
        g.tried.add(k);
        chipEl.classList.add("shake"); zoneEl.classList.add("miss");
        setTimeout(() => { chipEl.classList.remove("shake"); zoneEl.classList.remove("miss"); }, 450);
        sfx("wrong");
      }
      g.selected = null;
      stage.querySelectorAll(".wf-chip.sel").forEach(x => x.classList.remove("sel"));
    };
    pool.querySelectorAll(".wf-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (chip.disabled || chip.dataset.dragged) { delete chip.dataset.dragged; return; }
        stage.querySelectorAll(".wf-chip.sel").forEach(x => x !== chip && x.classList.remove("sel"));
        chip.classList.toggle("sel");
        g.selected = chip.classList.contains("sel") ? chip : null;
      });
      chip.addEventListener("pointerdown", e => {
        if (chip.disabled || e.button > 0) return;
        const startX = e.clientX, startY = e.clientY;
        let ghost = null;
        const move = ev => {
          if (!ghost && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
          if (!ghost) {
            ghost = chip.cloneNode(true); ghost.classList.add("wf-ghost"); document.body.appendChild(ghost);
            chip.classList.add("dragging");
          }
          ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`;
          stage.querySelectorAll(".wf-zone").forEach(z => z.classList.remove("over"));
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          under?.closest?.(".wf-zone")?.classList.add("over");
          ev.preventDefault();
        };
        const up = ev => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          stage.querySelectorAll(".wf-zone").forEach(z => z.classList.remove("over"));
          chip.classList.remove("dragging");
          if (!ghost) return;
          ghost.remove();
          chip.dataset.dragged = "1";
          const zone = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(".wf-zone");
          if (zone) place(chip, zone);
        };
        window.addEventListener("pointermove", move, { passive: false });
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
      });
    });
    stage.querySelectorAll(".wf-zone").forEach(z => z.addEventListener("click", () => { if (g.selected) place(g.selected, z); }));
  }

  async function finishDrag(stage) {
    const g = state.game;
    const percent = await record(g.firstTry, g.chips.length, { mode: "drag" });
    cheer(percent >= 80 ? "perfect" : "taskDone");
    stage.insertAdjacentHTML("beforeend", `<div class="wf-result"><div class="wf-score ${percent >= 80 ? "good" : percent >= 50 ? "ok" : "low"}">${g.firstTry}/${g.chips.length}</div><p>Ghép đúng ngay lần đầu ${g.firstTry}/${g.chips.length} từ.</p><div class="wf-actions"><button type="button" class="btn btn-primary" id="wfAgain">Ván mới</button></div></div>`);
    stage.querySelector("#wfAgain").addEventListener("click", () => startDrag(stage));
  }

  function teacherTools() {
    const home = document.getElementById("teacher-home");
    if (!home || document.getElementById("wfTeacherCard")) return;
    if (!window.can || !window.can("wordforms.manage")) return;
    const card = document.createElement("div");
    card.className = "card panel section";
    card.id = "wfTeacherCard";
    card.innerHTML = `<div class="section-head"><div><h3><i class=mi>account_tree</i> Họ từ (Word Form)</h3><p class="small muted">Xem, thêm, sửa các họ từ và câu luyện dạng từ cho học sinh.</p></div><button type="button" class="btn btn-soft btn-sm" id="wfOpenEditor">Quản lý họ từ</button></div>`;
    home.querySelector(".page-heading")?.insertAdjacentElement("afterend", card);
    card.querySelector("#wfOpenEditor").addEventListener("click", openEditor);
  }

  async function openEditor() {
    const m = document.createElement("div");
    m.className = "modal pp-dialog";
    m.innerHTML = `<div class="modal-card modal-lg"><div class="modal-head"><h3>Quản lý họ từ</h3><button class="close-btn" type="button" data-x>×</button></div><div class="wf-editor"></div></div>`;
    document.body.appendChild(m);
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-x]")) m.remove(); });
    const box = m.querySelector(".wf-editor");
    let unit = state.unit;
    const draw = async () => {
      delete state.cache[unit];
      let list = [];
      try { list = (await apiRequest(`/api/word-families?unit=${unit}`)).families || []; } catch (e) { box.innerHTML = esc(e.message); return; }
      box.innerHTML = `
        <div class="pp-toolbar"><select id="wfEdUnit">${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${unit === i + 1 ? "selected" : ""}>${esc(unitName(i + 1))}</option>`).join("")}</select><button type="button" class="btn btn-primary btn-sm" id="wfNew"><i class=mi>add</i> Thêm họ từ</button></div>
        <div class="wf-ed-list">${list.map(f => `<div class="wf-ed-row"><div><b>${esc(f.root)}</b>: ${f.members.map(x => `${esc(x.w)} <i>${esc(x.pos)}</i>`).join(", ")}<br><small class="muted">${(f.items || []).length} câu luyện${f.source === "teacher" ? " · GV đã sửa" : ""}</small></div><div class="pp-actions"><button type="button" class="btn btn-light btn-sm" data-ed="${f.id}"><i class=mi>edit</i></button><button type="button" class="btn btn-light btn-sm pp-danger" data-rm="${f.id}"><i class=mi>delete</i></button></div></div>`).join("") || `<p class="small muted">Chưa có họ từ.</p>`}</div>
        <form class="wf-ed-form hidden" id="wfForm">
          <input type="hidden" name="id">
          <div class="field"><label>Từ gốc</label><input name="root" required placeholder="decide"></div>
          <div class="field"><label>Các từ trong họ — mỗi dòng: từ | loại (n/v/adj/adv) | nghĩa</label><textarea name="members" rows="5" placeholder="decide | v | quyết định&#10;decision | n | sự quyết định&#10;decisive | adj | quyết đoán"></textarea></div>
          <div class="field"><label>Câu luyện — mỗi dòng: câu có ____ | đáp án</label><textarea name="items" rows="4" placeholder="She made an important ____ about her future. | decision"></textarea></div>
          <div class="auth-error" id="wfFormErr"></div>
          <button type="submit" class="btn btn-primary">Lưu họ từ</button>
        </form>`;
      box.querySelector("#wfEdUnit").addEventListener("change", e => { unit = Number(e.target.value); draw(); });
      const form = box.querySelector("#wfForm");
      const fill = f => {
        form.classList.remove("hidden");
        form.id.value = f ? f.id : "";
        form.root.value = f ? f.root : "";
        form.members.value = f ? f.members.map(x => `${x.w} | ${x.pos} | ${x.vi || ""}`).join("\n") : "";
        form.items.value = f ? (f.items || []).map(x => `${x.s} | ${x.a}`).join("\n") : "";
        form.root.focus();
      };
      box.querySelector("#wfNew").addEventListener("click", () => fill(null));
      box.querySelectorAll("[data-ed]").forEach(b => b.addEventListener("click", () => fill(list.find(f => String(f.id) === b.dataset.ed))));
      box.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", async () => {
        if (!confirm("Xoá họ từ này?")) return;
        try { await apiRequest(`/api/word-families/${b.dataset.rm}`, { method: "DELETE" }); draw(); } catch (e) { showToast(e.message); }
      }));
      form.addEventListener("submit", async e => {
        e.preventDefault();
        const members = form.members.value.split("\n").map(l => l.split("|").map(x => x.trim())).filter(p => p[0]).map(([w, pos, vi]) => ({ w, pos: (pos || "n").toLowerCase(), vi: vi || "" }));
        const items = form.items.value.split("\n").map(l => l.split("|").map(x => x.trim())).filter(p => p[0] && p[1]).map(([s, a]) => ({ s, a }));
        const payload = { unit, root: form.root.value.trim(), members, items };
        try {
          const d = form.id.value
            ? await apiRequest(`/api/word-families/${form.id.value}`, { method: "PUT", body: JSON.stringify(payload) })
            : await apiRequest("/api/word-families", { method: "POST", body: JSON.stringify(payload) });
          showToast(d.message);
          draw();
        } catch (ex) { setAuthError(box.querySelector("#wfFormErr"), ex.message); }
      });
    };
    draw();
  }

  window.addEventListener("engo:view", e => { if (e.detail === "vocabulary") render(); if (e.detail === "teacher-home") teacherTools(); });
  window.addEventListener("engo:user-ready", () => {
    const a = document.querySelector(".view.active");
    if (a && a.id === "vocabulary") render();
    if (a && a.id === "teacher-home") teacherTools();
  });
  window.ENGO_WORDFORM = { render, openEditor };
})();
