/* ============================================================================
 * ENGO Learning Hub — Lớp giao diện "học theo Unit 1–12"
 * ----------------------------------------------------------------------------
 * Gắn thêm vào các màn hình sẵn có mà không sửa script.js:
 *   #vocabulary    → Từ vựng & Ngữ pháp theo Unit (data/vocab-units.js, grammar-units.js)
 *   #speaking-lab  → Luyện nói theo Unit, 3 cấp độ dễ → khó (data/speaking-units.js)
 *   #listening-lab → Luyện nghe theo Unit, 3 cấp độ + bài tập (data/listening-units.js)
 *   #tests         → Khung KTTX / KTGK / KTCK cho HK1 và HK2 (data/exam-bank.js)
 *   #overview      → Gộp Tiến độ học tập và Đánh giá kết quả thành một phần cuối
 * Dùng lại speakEnglishText(), gainRewards(), showToast() của script.js khi có.
 * ==========================================================================*/
(function () {
  "use strict";

  const VOCAB = () => window.ENGO_VOCAB_UNITS || {};
  const GRAM = () => window.ENGO_GRAMMAR_UNITS || {};
  const SPEAK = () => window.ENGO_SPEAKING_UNITS || {};
  const LISTEN = () => window.ENGO_LISTENING_UNITS || {};
  const EXAM = () => window.ENGO_EXAM_BANK || null;
  const UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const esc = s => String(s ?? "").replace(/[&<>'"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[m]));
  const toast = m => (window.showToast ? window.showToast(m) : null);
  const say = (t, rate, onDone) => (window.speakEnglishText ? window.speakEnglishText(t, { rate: rate || 0.85, onDone }) : onDone && onDone());
  const reward = (xp, carrots, why) => { try { window.gainRewards && window.gainRewards(xp, carrots, why || ""); } catch (_) {} };
  const $ = (sel, root) => (root || document).querySelector(sel);
  // script.js khai báo bằng let/const nên không nằm trên window -> đọc qua tên toàn cục
  const CU = () => { try { return typeof currentUser !== "undefined" ? currentUser : null; } catch (_) { return null; } };
  const TESTS = () => { try { if (typeof testsCache !== "undefined" && Array.isArray(testsCache) && testsCache.length) return testsCache; } catch (_) {} try { if (typeof teacherTestsCache !== "undefined" && Array.isArray(teacherTestsCache)) return teacherTestsCache; } catch (_) {} return []; };
  // Ghi nhận kết quả lên server (tiến độ, danh hiệu) — bỏ qua nếu chưa đăng nhập
  async function logEvent(type, refId, title, score, maxScore, meta) {
    try {
      const cu = CU();
      if (typeof apiRequest !== "function" || !cu || cu.role !== "student") return;
      await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type, refId, title, score, maxScore, meta }) });
      if (typeof invalidateProgress === "function") invalidateProgress();
    } catch (_) {}
  }
  // Câu ví dụ do AI sinh sẵn (data/vocab-decks.js) tra theo từ
  function exampleFor(unit, word) {
    const deck = (window.ENGO_VOCAB_DECKS || {})["unit" + unit];
    if (!deck) return null;
    const key = String(word).toLowerCase().replace(/s*(.*?)s*/g, " ").trim();
    const c = deck.cards.find(x => x.word.toLowerCase() === key) || deck.cards.find(x => key.startsWith(x.word.toLowerCase()) || x.word.toLowerCase().startsWith(key));
    return c && c.examples && c.examples[0] ? { en: c.examples[0], vi: c.exampleVi || "" } : null;
  }
  // Gộp bài nghe do AI sinh (data/listening-sets.js) vào bộ nghe theo unit (cùng định dạng tasks)
  function listeningTasks(u) {
    const base = (LISTEN()["unit" + u] || {}).tasks || [];
    const ai = ((window.ENGO_LISTENING_SETS || {})["unit" + u] || {}).levels || [];
    const LV = { easy: 1, medium: 2, hard: 3 };
    const extra = ai.map(l => ({
      level: LV[l.level] || 2, rate: l.level === "easy" ? 0.82 : l.level === "medium" ? 0.9 : 0.95, ai: true,
      title: l.title + " (AI)", intro: l.intro || "",
      script: (l.script || []).join(" "),
      qs: (l.questions || []).map(q => ({ type: "mcq", q: q.prompt, opts: (q.options || []).map(o => String(o).replace(/^[A-D]\.\s*/, "")), a: Number(q.answer) || 0, why: q.explanation || "" }))
    })).filter(t => t.qs.length && t.script);
    return [...base, ...extra].sort((a, b) => a.level - b.level);
  }

  /* ---------------------------- lưu tiến độ ---------------------------- */
  function storeKey() {
    try { if (window.getUserStorageKey) return window.getUserStorageKey("engoUnitsProgressV1"); } catch (_) {}
    return "engoUnitsProgressV1_guest";
  }
  function loadProg() {
    try { return JSON.parse(localStorage.getItem(storeKey()) || "") || {}; } catch (_) { return {}; }
  }
  function saveProg(p) {
    try { localStorage.setItem(storeKey(), JSON.stringify(p)); } catch (_) {}
  }
  function markDone(bucket, id) {
    const p = loadProg();
    p[bucket] = p[bucket] || {};
    if (p[bucket][id]) return false;
    p[bucket][id] = new Date().toISOString();
    saveProg(p);
    return true;
  }
  const countDone = bucket => Object.keys(loadProg()[bucket] || {}).length;

  /* ------------------------- bộ chọn Unit dùng chung ------------------------- */
  const state = { vocabUnit: 1, vocabTab: "words", speakUnit: 1, listenUnit: 1, examTerm: 1 };

  function unitChips(current, attr) {
    return '<div class="unit-chip-row">' + UNITS.map(u =>
      `<button type="button" class="unit-chip${u === current ? " active" : ""}" ${attr}="${u}">U${u}</button>`
    ).join("") + "</div>";
  }

  /* ============================== 1. TỪ VỰNG ============================== */
  function vocabPanelHTML() {
    const u = state.vocabUnit;
    const deck = VOCAB()["unit" + u];
    const gram = GRAM()["unit" + u];
    if (!deck) return '<div class="card panel"><p class="small muted">Chưa nạp được dữ liệu từ vựng.</p></div>';

    const SECN = { GS: "Getting Started", CL1: "A Closer Look 1", CL2: "A Closer Look 2", COM: "Communication", SK1: "Skills 1", SK2: "Skills 2", LB: "Looking Back", PRJ: "Project" };
    const groups = {};
    deck.cards.forEach(c => { (groups[c.sec] = groups[c.sec] || []).push(c); });

    const words = Object.keys(groups).map(sec => `
      <div class="unit-sec">
        <h4 class="unit-sec-title">${esc(SECN[sec] || sec)} <span class="small muted">· ${groups[sec].length} từ</span></h4>
        <div class="unit-word-grid">
          ${groups[sec].map(c => `
            <div class="unit-word">
              <button type="button" class="unit-say" data-say="${esc(c.w)}" title="Nghe phát âm">🔊</button>
              <div>
                <b>${esc(c.w)}</b> ${c.pos ? `<span class="unit-pos">${esc(c.pos)}</span>` : ""}
                <div class="small muted">${esc(c.ipa)}</div>
                <div class="unit-vi">${esc(c.vi)}</div>
                ${(ex => ex ? `<div class="unit-ex"><button type="button" class="unit-say mini" data-say="${esc(ex.en)}" title="Nghe câu ví dụ">🔊</button><em>${esc(ex.en)}</em>${ex.vi ? `<div class="small muted">${esc(ex.vi)}</div>` : ""}</div>` : "")(exampleFor(u, c.w))}
              </div>
            </div>`).join("")}
        </div>
      </div>`).join("");

    const grammar = !gram ? '<p class="small muted">Chưa có dữ liệu ngữ pháp cho unit này.</p>' : Array.isArray(gram.exercises) ? grammarAiHTML(u, gram) : `
      <p class="unit-focus"><b>Trọng tâm:</b> ${esc(gram.focus)}</p>
      ${gram.points.map(pt => `
        <div class="unit-rule">
          <h4>${esc(pt.title)}</h4>
          <p>${esc(pt.rule)}</p>
          <div class="unit-form">${esc(pt.form)}</div>
          <div class="unit-ok">✔ ${esc(pt.ok)}</div>
          <div class="unit-no">✘ ${esc(pt.no)}</div>
          <p class="small muted">${esc(pt.note)}</p>
        </div>`).join("")}
      <div class="unit-codes">
        <b class="small">Mã lỗi Phòng Chữa Lỗi nhận ra ở unit này:</b>
        ${gram.codes.map(c => `<span class="unit-code" title="${esc(c.hint)}">${esc(c.id)} · ${esc(c.label)}</span>`).join("")}
      </div>
      <div class="unit-quiz" id="unitGrammarQuiz">
        <h4>Luyện tập nhanh</h4>
        ${gram.quiz.map((q, i) => {
          const opts = [q.a].concat(q.b).map((o, k) => ({ o, k })).sort(() => Math.random() - 0.5);
          return `<div class="unit-q" data-answer="${esc(q.a)}" data-code="${esc(q.code)}">
            <p><b>${i + 1}.</b> ${esc(q.q)}</p>
            <div class="unit-opts">${opts.map(x => `<button type="button" class="unit-opt" data-val="${esc(x.o)}">${esc(x.o)}</button>`).join("")}</div>
          </div>`;
        }).join("")}
        <button class="btn btn-primary btn-sm" id="unitGrammarCheck" type="button">Kiểm tra đáp án</button>
        <span class="small muted" id="unitGrammarScore"></span>
      </div>`;

    return `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Học theo Unit · ${esc(deck.name)}</h3>
            <p class="small muted">${deck.cards.length} từ vựng và ${gram ? gram.points.length : 0} điểm ngữ pháp bám sát sách Global Success 9.</p></div>
          <span class="badge" style="background:#eef2ff;color:#4338ca;font-weight:700">700 từ · 12 unit</span>
        </div>
        ${unitChips(u, "data-vunit")}
        <div class="healing-tabs" style="margin-top:12px">
          <button class="healing-tab${state.vocabTab === "words" ? " active" : ""}" data-vtab="words">📘 Từ vựng</button>
          <button class="healing-tab${state.vocabTab === "grammar" ? " active" : ""}" data-vtab="grammar">✍️ Ngữ pháp</button>
        </div>
        <div class="unit-body">${state.vocabTab === "words" ? words : grammar}</div>
      </div>`;
  }

  // Ngữ pháp định dạng AI (scripts/generate-unit-content.js): points / exercises / rewrite
  const LVN = { easy: "Dễ", medium: "Vừa", hard: "Khó" };
  function grammarAiHTML(u, gram) {
    const theory = (gram.points || []).map(pt => `
      <div class="unit-rule">
        <h4>${esc(pt.name)}</h4>
        <p>${esc(pt.explanation)}</p>
        ${pt.formula ? `<div class="unit-form">${esc(pt.formula)}</div>` : ""}
        ${(pt.examples || []).map(e => `<div class="unit-ok"><button type="button" class="unit-say mini" data-say="${esc(e.en)}">🔊</button> ${esc(e.en)} <span class="small muted">— ${esc(e.vi)}</span></div>`).join("")}
        ${(pt.notes || []).map(nt => `<p class="small muted">• ${esc(nt)}</p>`).join("")}
      </div>`).join("");
    const mc = (gram.exercises || []).map((q, i) => `
      <div class="unit-q" data-mc="${i}" data-answer="${Number(q.answer)}" data-level="${esc(q.level)}">
        <p><span class="unit-lv lv${q.level === "easy" ? 1 : q.level === "medium" ? 2 : 3}">${LVN[q.level] || "Vừa"}</span> <b>${i + 1}.</b> ${esc(q.prompt)}</p>
        <div class="unit-opts">${(q.options || []).map((o, k) => `<button type="button" class="unit-opt" data-val="${k}">${esc(o)}</button>`).join("")}</div>
        <div class="unit-why hidden">${esc(q.explanation || "")}</div>
      </div>`).join("");
    const rw = (gram.rewrite || []).map((q, i) => `
      <div class="unit-q" data-rw="${i}">
        <p><span class="unit-lv lv3">Viết lại</span> <b>${i + 1}.</b> ${esc(q.prompt)}</p>
        <input class="unit-gap wide" type="text" placeholder="Viết câu trả lời...">
        <div class="unit-why hidden"><b>Đáp án:</b> ${esc(q.answer)} <span class="small muted">— ${esc(q.explanation || "")}</span></div>
      </div>`).join("");
    return `
      <div class="unit-theory">${theory}</div>
      <div class="unit-quiz" id="unitGrammarQuiz">
        <h4>Bài tập vận dụng (dễ → khó)</h4>
        ${mc}
        ${rw ? `<h4 style="margin-top:14px">Viết lại câu</h4>${rw}` : ""}
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
          <button class="btn btn-primary btn-sm" id="unitGrammarCheck" type="button">Kiểm tra đáp án</button>
          <span class="small muted" id="unitGrammarScore"></span>
        </div>
      </div>`;
  }
  function normalizeAns(v) { return String(v || "").toLowerCase().replace(/[.,!?;:"']/g, "").replace(/\s+/g, " ").trim(); }
  function checkAiGrammar(host, u, gram) {
    let right = 0, total = 0;
    const wrongList = [];
    host.querySelectorAll("[data-mc]").forEach(q => {
      total++;
      const ex = gram.exercises[Number(q.dataset.mc)];
      const picked = q.querySelector(".unit-opt.picked");
      const ok = picked && Number(picked.dataset.val) === Number(q.dataset.answer);
      if (ok) right++; else wrongList.push({ prompt: ex.prompt, selected: picked ? ex.options[Number(picked.dataset.val)] : "—", correct: ex.options[Number(ex.answer)], explanation: ex.explanation });
      q.querySelectorAll(".unit-opt").forEach(o => { o.classList.toggle("right", Number(o.dataset.val) === Number(q.dataset.answer)); o.classList.toggle("wrong", o === picked && !ok); });
      q.querySelector(".unit-why").classList.remove("hidden");
    });
    host.querySelectorAll("[data-rw]").forEach(q => {
      total++;
      const ex = gram.rewrite[Number(q.dataset.rw)];
      const input = q.querySelector("input");
      const val = normalizeAns(input.value);
      const ok = Boolean(val) && [ex.answer, ...(ex.accepted || [])].map(normalizeAns).includes(val);
      if (ok) right++; else wrongList.push({ prompt: ex.prompt, selected: input.value || "—", correct: ex.answer, explanation: ex.explanation });
      input.classList.toggle("right", ok); input.classList.toggle("wrong", !ok);
      q.querySelector(".unit-why").classList.remove("hidden");
    });
    const pct = total ? Math.round((right / total) * 100) : 0;
    $("#unitGrammarScore").textContent = `Đúng ${right}/${total} (${pct}%)`;
    if (wrongList.length && typeof recordUnitGrammarErrors === "function") recordUnitGrammarErrors(u, gram.title || `Unit ${u}`, wrongList);
    wrongList.forEach(() => api.pushError("U" + u));
    logEvent("grammar", "unit" + u, `Ngữ pháp Unit ${u}: ${gram.title || ""}`, right, total, { unit: u, percent: pct });
    if (pct >= 80 && markDone("grammar", "u" + u)) { reward(30, 3, `Ngữ pháp Unit ${u}`); toast(`Hoàn thành ngữ pháp Unit ${u}: +30 XP, +3 🥕`); }
    else if (pct < 80) toast(`Đúng ${right}/${total}. Xem giải thích và làm lại để đạt ≥ 80% nhé!`);
  }

  function mountVocab() {
    const view = document.getElementById("vocabulary");
    if (!view) return;
    let host = document.getElementById("unitVocabMount");
    if (!host) {
      host = document.createElement("div");
      host.id = "unitVocabMount";
      view.insertBefore(host, view.children[1] || null);
    }
    host.innerHTML = vocabPanelHTML();

    host.querySelectorAll("[data-vunit]").forEach(b => b.addEventListener("click", () => {
      state.vocabUnit = Number(b.dataset.vunit); mountVocab();
    }));
    host.querySelectorAll("[data-vtab]").forEach(b => b.addEventListener("click", () => {
      state.vocabTab = b.dataset.vtab; mountVocab();
    }));
    host.querySelectorAll("[data-say]").forEach(b => b.addEventListener("click", () => say(b.dataset.say, 0.8)));

    host.querySelectorAll(".unit-q").forEach(q => q.querySelectorAll(".unit-opt").forEach(o => o.addEventListener("click", () => {
      q.querySelectorAll(".unit-opt").forEach(x => x.classList.remove("picked"));
      o.classList.add("picked");
    })));
    const check = document.getElementById("unitGrammarCheck");
    const gramData = GRAM()["unit" + state.vocabUnit];
    if (check && gramData && Array.isArray(gramData.exercises)) check.addEventListener("click", () => checkAiGrammar(host, state.vocabUnit, gramData));
    else if (check) check.addEventListener("click", () => {
      const qs = [...host.querySelectorAll(".unit-q")];
      let right = 0;
      qs.forEach(q => {
        const picked = q.querySelector(".unit-opt.picked");
        const ok = picked && picked.dataset.val === q.dataset.answer;
        if (ok) right++;
        q.querySelectorAll(".unit-opt").forEach(o => {
          o.classList.toggle("right", o.dataset.val === q.dataset.answer);
          o.classList.toggle("wrong", o === picked && !ok);
        });
        if (!ok && window.ENGO_UNITS_UI) window.ENGO_UNITS_UI.pushError(q.dataset.code);
      });
      $("#unitGrammarScore").textContent = `Đúng ${right}/${qs.length}`;
      if (right === qs.length && markDone("grammar", "u" + state.vocabUnit)) {
        reward(30, 3, `Ngữ pháp Unit ${state.vocabUnit}`);
        toast(`Hoàn thành ngữ pháp Unit ${state.vocabUnit}: +30 XP, +3 🥕`);
      }
    });
  }

  /* ============================== 2. LUYỆN NÓI ============================== */
  function mountSpeaking() {
    const view = document.getElementById("speaking-lab");
    if (!view) return;
    let host = document.getElementById("unitSpeakMount");
    if (!host) {
      host = document.createElement("div");
      host.id = "unitSpeakMount";
      view.insertBefore(host, view.children[1] || null);
    }
    const u = state.speakUnit;
    const set = SPEAK()["unit" + u];
    host.innerHTML = !set ? "" : `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Luyện nói theo Unit · ${esc(set.name)}</h3>
            <p class="small muted">Ba cấp độ tăng dần. Nghe câu mẫu, bấm micro ở bảng dưới để đọc theo; điểm phát âm chấm theo cách đọc nên giọng miền nào cũng công bằng.</p></div>
          <span class="badge" style="background:#ecfdf5;color:#047857;font-weight:700">96 câu · 12 unit</span>
        </div>
        ${unitChips(u, "data-sunit")}
        <div class="unit-body">
          ${set.levels.map(l => `
            <div class="unit-sec">
              <h4 class="unit-sec-title"><span class="unit-lv lv${l.level}">Cấp ${l.level}</span> ${esc(l.label)}</h4>
              ${l.items.map(it => `
                <div class="unit-line">
                  <button type="button" class="unit-say" data-say="${esc(it.text)}" title="Nghe câu mẫu">🔊</button>
                  <div>
                    <b>${esc(it.text)}</b>
                    <div class="unit-vi">${esc(it.vi)}</div>
                    <div class="small muted">Chú ý: ${esc(it.focus)}</div>
                  </div>
                </div>`).join("")}
            </div>`).join("")}
        </div>
      </div>`;
    host.querySelectorAll("[data-sunit]").forEach(b => b.addEventListener("click", () => { state.speakUnit = Number(b.dataset.sunit); mountSpeaking(); }));
    host.querySelectorAll("[data-say]").forEach(b => b.addEventListener("click", () => say(b.dataset.say, 0.8)));
  }

  /* ============================== 3. LUYỆN NGHE ============================== */
  function mountListening() {
    const host = document.getElementById("listeningMount");
    if (!host) return;
    const u = state.listenUnit;
    const base = LISTEN()["unit" + u];
    const set = base ? { ...base, tasks: listeningTasks(u) } : null;
    const badge = document.getElementById("listenProgressBadge");
    const totalTasks = UNITS.reduce((a, x) => a + listeningTasks(x).length, 0);
    if (badge) badge.textContent = `${countDone("listen")} / ${totalTasks} đoạn`;
    if (!set) { host.innerHTML = '<div class="card panel"><p class="small muted">Chưa nạp được dữ liệu luyện nghe.</p></div>'; return; }

    host.innerHTML = `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>${esc(set.name)}</h3>
            <p class="small muted">Nghe tối đa 3 lần mỗi đoạn, sau đó làm bài tập. Xem lời thoại chỉ nên bấm sau khi đã trả lời.</p></div>
        </div>
        ${unitChips(u, "data-lunit")}
      </div>
      ${set.tasks.map((t, ti) => `
        <div class="card panel unit-panel" data-task="${ti}">
          <div class="section-head">
            <div><h3><span class="unit-lv lv${t.level}">Cấp ${t.level}</span> ${esc(t.title)}</h3>
              <p class="small muted">${t.intro ? esc(t.intro) + " · " : ""}${t.script.split(/\s+/).length} từ · tốc độ ${t.rate}× ${loadProg().listen && loadProg().listen["u" + u + "t" + ti] ? "· ✅ đã hoàn thành" : ""}</p></div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-primary btn-sm" data-play="${ti}" type="button">▶ Nghe</button>
              <span class="small muted" data-plays="${ti}">Còn 3 lượt</span>
            </div>
          </div>
          <div class="unit-body">
            ${t.qs.map((q, qi) => renderQ(q, ti, qi)).join("")}
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
              <button class="btn btn-primary btn-sm" data-check="${ti}" type="button">Kiểm tra</button>
              <button class="btn btn-light btn-sm" data-script="${ti}" type="button">Xem lời thoại</button>
              <span class="small muted" data-score="${ti}"></span>
            </div>
            <div class="unit-script hidden" data-scripttext="${ti}">${esc(t.script)}</div>
          </div>
        </div>`).join("")}`;

    host.querySelectorAll("[data-lunit]").forEach(b => b.addEventListener("click", () => { state.listenUnit = Number(b.dataset.lunit); mountListening(); }));

    const plays = {};
    set.tasks.forEach((t, ti) => {
      plays[ti] = 3;
      const playBtn = host.querySelector(`[data-play="${ti}"]`);
      const label = host.querySelector(`[data-plays="${ti}"]`);
      playBtn.addEventListener("click", () => {
        if (plays[ti] <= 0) { toast("Đã hết lượt nghe cho đoạn này."); return; }
        plays[ti]--;
        label.textContent = `Còn ${plays[ti]} lượt`;
        playBtn.disabled = true;
        say(t.script, t.rate, () => { playBtn.disabled = false; });
      });
      host.querySelector(`[data-script="${ti}"]`).addEventListener("click", () => {
        host.querySelector(`[data-scripttext="${ti}"]`).classList.toggle("hidden");
      });
      host.querySelectorAll(`[data-task="${ti}"] .unit-opt`).forEach(o => o.addEventListener("click", () => {
        o.parentElement.querySelectorAll(".unit-opt").forEach(x => x.classList.remove("picked"));
        o.classList.add("picked");
      }));
      host.querySelector(`[data-check="${ti}"]`).addEventListener("click", () => {
        let right = 0;
        t.qs.forEach((q, qi) => {
          const box = host.querySelector(`[data-task="${ti}"] [data-q="${qi}"]`);
          let ok = false;
          if (q.type === "gap") {
            const val = (box.querySelector("input").value || "").trim().toLowerCase();
            ok = val === String(q.a).toLowerCase();
            box.querySelector("input").classList.toggle("wrong", !ok);
            box.querySelector("input").classList.toggle("right", ok);
          } else {
            const picked = box.querySelector(".unit-opt.picked");
            const want = q.type === "tf" ? (q.a ? "Đúng" : "Sai") : q.opts[q.a];
            ok = picked && picked.dataset.val === want;
            box.querySelectorAll(".unit-opt").forEach(o => {
              o.classList.toggle("right", o.dataset.val === want);
              o.classList.toggle("wrong", o === picked && !ok);
            });
          }
          if (ok) right++;
        });
        host.querySelector(`[data-score="${ti}"]`).textContent = `Đúng ${right}/${t.qs.length}`;
        host.querySelectorAll(`[data-task="${ti}"] .unit-why`).forEach(w => w.classList.remove("hidden"));
        logEvent("listening", "u" + u + "t" + ti, `Nghe Unit ${u} · ${t.title}`, right, t.qs.length, { unit: u, level: t.level, ai: Boolean(t.ai) });
        if (right >= Math.ceil(t.qs.length * 0.8) && markDone("listen", "u" + u + "t" + ti)) {
          reward(30, 3, `Nghe Unit ${u} cấp ${t.level}`);
          toast(`Hoàn thành đoạn nghe: +30 XP, +3 🥕`);
          if (badge) badge.textContent = `${countDone("listen")} / ${totalTasks} đoạn`;
        }
      });
    });
  }

  function renderQ(q, ti, qi) {
    const head = `<p><b>${qi + 1}.</b> ${esc(q.q)}</p>`;
    if (q.type === "gap") return `<div class="unit-q" data-q="${qi}">${head}<input class="unit-gap" type="text" placeholder="Điền từ nghe được"></div>`;
    const opts = q.type === "tf" ? ["Đúng", "Sai"] : q.opts;
    return `<div class="unit-q" data-q="${qi}">${head}<div class="unit-opts">${opts.map(o => `<button type="button" class="unit-opt" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>${q.why ? `<div class="unit-why hidden">${esc(q.why)}</div>` : ""}</div>`;
  }

  /* ============================== 4. NGÂN HÀNG ĐỀ ============================== */
  function mountExams() {
    const view = document.getElementById("tests");
    const B = EXAM();
    if (!view || !B) return;
    let host = document.getElementById("unitExamMount");
    if (!host) {
      host = document.createElement("div");
      host.id = "unitExamMount";
      view.insertBefore(host, view.children[1] || null);
    }
    const term = state.examTerm;
    const specs = B.byTerm(term);
    const TYPEN = { KTTX: "Thường xuyên", KTGK: "Giữa kì", KTCK: "Cuối kì" };
    const cu = CU();
    const isTeacher = cu && (cu.role === "teacher" || cu.role === "admin");
    const tests = TESTS();
    const forSpec = s => tests.filter(t => String(t.testType || "kttx").toUpperCase() === s.type && Number(t.semester || 1) === s.term && (s.type !== "KTTX" || !t.unitNo || (s.units || []).includes(Number(t.unitNo))));
    const bankCell = s => {
      const list = forSpec(s);
      const rows = list.slice(0, 4).map(t => {
        const sub = t.submission;
        const btn = isTeacher ? "" : sub ? `<span class="badge green">${sub.scoreOnTen}/10</span>` : `<button type="button" class="btn btn-primary btn-sm" data-take="${t.id}">Làm bài</button>`;
        return `<div class="unit-bank-row"><span>${esc(t.title)}${t.className ? ` <span class="small muted">(${esc(t.className)})</span>` : ""}</span>${btn}</div>`;
      }).join("");
      const upload = isTeacher ? `<button type="button" class="btn btn-soft btn-sm" data-upload-spec="${esc(s.id)}">＋ Nạp đề Word</button>` : "";
      return (rows || '<span class="small muted">Chưa có đề — giáo viên nạp từ ngân hàng của tổ.</span>') + (upload ? `<div style="margin-top:6px">${upload}</div>` : "");
    };

    host.innerHTML = `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Ba loại kiểm tra theo Thông tư 22</h3>
            <p class="small muted">Mỗi học kì có 4 đầu điểm thường xuyên, 1 bài giữa kì và 1 bài cuối kì. Khung dưới đây là mặc định; ma trận thật của trường sẽ ghi đè khi giáo viên tải lên.</p></div>
          <span class="badge" style="background:#fff7ed;color:#b45309;font-weight:700">12 khung đề</span>
        </div>
        <div class="healing-tabs">
          <button class="healing-tab${term === 1 ? " active" : ""}" data-term="1">Học kì I · Unit 1–6</button>
          <button class="healing-tab${term === 2 ? " active" : ""}" data-term="2">Học kì II · Unit 7–12</button>
        </div>
        <div class="table-wrap" style="margin-top:12px">
          <table>
            <thead><tr><th>Bài kiểm tra</th><th>Loại</th><th>Phạm vi</th><th>Thời gian</th><th>Cấu trúc</th><th>Ma trận NB–TH–VD–VDC</th><th>Ngân hàng đề</th></tr></thead>
            <tbody>
              ${specs.map(s => `
                <tr>
                  <td><b>${esc(s.name)}</b><div class="small muted">${esc(s.form)}</div></td>
                  <td><span class="unit-code">${esc(TYPEN[s.type])}</span></td>
                  <td>Unit ${s.units.join(", ")}</td>
                  <td>${s.minutes} phút</td>
                  <td class="small">${s.sections.map(x => `${esc(x.skill)} <b>${x.n}</b> câu · ${x.pts} đ`).join("<br>")}</td>
                  <td class="small">${s.matrix.NB}% – ${s.matrix.TH}% – ${s.matrix.VD}% – ${s.matrix.VDC}%</td>
                  <td>${bankCell(s)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    host.querySelectorAll("[data-term]").forEach(b => b.addEventListener("click", () => { state.examTerm = Number(b.dataset.term); mountExams(); }));
    host.querySelectorAll("[data-take]").forEach(b => b.addEventListener("click", () => typeof startImportedTest === "function" && startImportedTest(b.dataset.take)));
    host.querySelectorAll("[data-upload-spec]").forEach(b => b.addEventListener("click", () => {
      const spec = specs.find(x => x.id === b.dataset.uploadSpec);
      if (typeof openCreateTestForSpec === "function") openCreateTestForSpec(spec);
    }));
  }

  /* ============================== 5. TỔNG KẾT ============================== */
  function bindOverview() {
    const tabs = document.querySelectorAll("[data-ov-tab]");
    if (!tabs.length || tabs[0].dataset.bound) return;
    const show = name => {
      tabs.forEach(t => t.classList.toggle("active", t.dataset.ovTab === name));
      ["progress", "results"].forEach(n => {
        const el = document.getElementById("overviewPanel-" + n);
        if (el) el.classList.toggle("active", n === name);
      });
    };
    tabs.forEach(t => { t.dataset.bound = "1"; t.addEventListener("click", () => show(t.dataset.ovTab)); });
    document.querySelectorAll("[data-ov-jump]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); show(a.dataset.ovJump); }));
    const r = document.getElementById("refreshOverviewBtn");
    if (r) r.addEventListener("click", () => {
      try { window.renderStudentDashboard && window.renderStudentDashboard(true); } catch (_) {}
      try { window.renderStudentResults && window.renderStudentResults(); } catch (_) {}
      toast("Đã làm mới phần tổng kết.");
    });
  }

  /* ------------------------------ điều phối ------------------------------ */
  const api = {
    onView(id) {
      try {
        if (id === "vocabulary") mountVocab();
        if (id === "speaking-lab") mountSpeaking();
        if (id === "listening-lab") mountListening();
        if (id === "tests") mountExams();
        if (id === "overview") bindOverview();
      } catch (e) { console.error("[ENGO units-ui]", e); }
    },
    pushError(code) {
      try {
        const p = loadProg();
        p.errors = p.errors || {};
        p.errors[code] = (p.errors[code] || 0) + 1;
        saveProg(p);
      } catch (_) {}
    },
    errorMap() { return loadProg().errors || {}; },
    refreshExams() { try { if (document.getElementById("tests")?.classList.contains("active")) mountExams(); } catch (_) {} },
    stats() {
      return { grammarDone: countDone("grammar"), listenDone: countDone("listen"), errors: api.errorMap() };
    }
  };
  window.ENGO_UNITS_UI = api;

  document.addEventListener("DOMContentLoaded", () => {
    bindOverview();
    const rl = document.getElementById("refreshListeningBtn");
    if (rl) rl.addEventListener("click", () => mountListening());
  });
})();
