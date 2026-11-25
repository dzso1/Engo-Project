(function () {
  "use strict";

  const DATA = () => window.ENGO_DATA;
  const GRADE = () => (DATA() ? DATA().getGrade() : 9);
  const VOCAB = () => (DATA() ? DATA().vocabUnits() : window.ENGO_VOCAB_UNITS || {});
  const GRAM = () => (DATA() ? DATA().grammarUnits() : window.ENGO_GRAMMAR_UNITS || {});
  const SPEAK = () => (DATA() ? DATA().speakingUnits() : window.ENGO_SPEAKING_UNITS || {});
  const LISTEN = () => (DATA() ? DATA().listeningUnits() : window.ENGO_LISTENING_UNITS || {});
  const EXAM = () => (DATA() ? DATA().examBank() : window.ENGO_EXAM_BANK || null);
  const UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const esc = s => String(s ?? "").replace(/[&<>'"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[m]));
  const toast = m => (window.showToast ? window.showToast(m) : null);
  const say = (t, rate, onDone) => (window.speakEnglishText ? window.speakEnglishText(t, { rate: rate || 0.85, onDone }) : onDone && onDone());
  const reward = (xp, carrots, why) => { try { window.gainRewards && window.gainRewards(xp, carrots, why || ""); } catch (_) {} };
  const cheerUp = kind => { try { window.cheer ? window.cheer(kind) : window.playSfx && window.playSfx(kind); } catch (_) {} };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const CU = () => { try { return typeof currentUser !== "undefined" ? currentUser : null; } catch (_) { return null; } };
  const TESTS = () => { try { if (typeof testsCache !== "undefined" && Array.isArray(testsCache) && testsCache.length) return testsCache; } catch (_) {} try { if (typeof teacherTestsCache !== "undefined" && Array.isArray(teacherTestsCache)) return teacherTestsCache; } catch (_) {} return []; };
  const gPrefix = () => (GRADE() === 8 ? "g8-" : "");

  async function logEvent(type, refId, title, score, maxScore, meta) {
    try {
      const cu = CU();
      if (typeof apiRequest !== "function" || !cu || cu.role !== "student") return;
      await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type, refId, title, score, maxScore, meta }) });
      if (typeof invalidateProgress === "function") invalidateProgress();
    } catch (_) {}
  }

  function exampleFor(unit, word) {
    const deck = (DATA() ? DATA().vocabDecks() : window.ENGO_VOCAB_DECKS || {})["unit" + unit];
    if (!deck) return null;
    const key = String(word).toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const c = deck.cards.find(x => x.word.toLowerCase() === key) || deck.cards.find(x => key.startsWith(x.word.toLowerCase()) || x.word.toLowerCase().startsWith(key));
    return c && c.examples && c.examples[0] ? { en: c.examples[0], vi: c.exampleVi || "" } : null;
  }

  function imageFor(word) {
    const map = window.ENGO_VOCAB_IMAGES || {};
    const w = String(word || "").toLowerCase().trim();
    if (map[w]) return map[w];
    const base = w.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
    if (map[base]) return map[base];
    const k = Object.keys(map).find(x => map[x] && (base.startsWith(x.toLowerCase()) || x.toLowerCase().startsWith(base)) && Math.abs(x.length - base.length) <= 3);
    return k ? map[k] : "";
  }

  function listeningTasks(u) {
    const base = (LISTEN()["unit" + u] || {}).tasks || [];
    const ai = ((DATA() ? DATA().listeningSets() : window.ENGO_LISTENING_SETS || {})["unit" + u] || {}).levels || [];
    const LV = { easy: 1, medium: 2, hard: 3 };
    const extra = ai.map(l => ({
      level: LV[l.level] || 2, rate: l.level === "easy" ? 0.82 : l.level === "medium" ? 0.9 : 0.95, ai: true,
      title: l.title + " (AI)", intro: l.intro || "",
      script: Array.isArray(l.script) ? l.script.join(" ") : String(l.script || ""),
      qs: (l.questions || []).map(q => ({ type: "mcq", q: q.prompt, opts: (q.options || []).map(o => String(o).replace(/^[A-D]\.\s*/, "")), a: Number(q.answer) || 0, why: q.explanation || "" }))
    })).filter(t => t.qs.length && t.script);
    return [...base, ...extra].sort((a, b) => a.level - b.level);
  }

  function storeKey() {
    try { if (window.getUserStorageKey) return window.getUserStorageKey("engoUnitsProgressV1"); } catch (_) {}
    return "engoUnitsProgressV1_guest";
  }
  function loadProg() { try { return JSON.parse(localStorage.getItem(storeKey()) || "") || {}; } catch (_) { return {}; } }
  function saveProg(p) { try { localStorage.setItem(storeKey(), JSON.stringify(p)); } catch (_) {} }
  function markDone(bucket, id) {
    const p = loadProg();
    p[bucket] = p[bucket] || {};
    if (p[bucket][id]) return false;
    p[bucket][id] = new Date().toISOString();
    saveProg(p);
    return true;
  }
  const countDone = bucket => Object.keys(loadProg()[bucket] || {}).length;
  const MAX_PLAYS = 3;
  function playsLeft(key) {
    const v = (loadProg().listenPlays || {})[key];
    return v === undefined ? MAX_PLAYS : Math.max(0, Number(v));
  }
  function setPlaysLeft(key, n) {
    const p = loadProg();
    p.listenPlays = p.listenPlays || {};
    if (n >= MAX_PLAYS) delete p.listenPlays[key]; else p.listenPlays[key] = n;
    saveProg(p);
  }

  const state = { vocabUnit: 1, vocabTab: "words", speakUnit: 1, listenUnit: 1, examTerm: 1, examGrade: 9 };

  function unitChips(current, attr) {
    return '<div class="unit-chip-row">' + UNITS.map(u =>
      `<button type="button" class="unit-chip${u === current ? " active" : ""}" ${attr}="${u}">U${u}</button>`
    ).join("") + "</div>";
  }

  function gradeSwitchHtml() {
    return DATA() ? DATA().gradeChipHtml(GRADE()) : "";
  }

  function ensureHost(view, id, afterSel) {
    let host = document.getElementById(id);
    if (!host) {
      host = document.createElement("div");
      host.id = id;
      const anchor = afterSel ? view.querySelector(afterSel) : null;
      if (anchor) anchor.insertAdjacentElement("afterend", host);
      else view.insertBefore(host, view.children[1] || null);
    }
    return host;
  }

  function vocabPanelHTML() {
    const u = state.vocabUnit, g = GRADE();
    const allVocab = VOCAB();
    const deck = allVocab["unit" + u];
    const gram = GRAM()["unit" + u];
    if (!deck) return '<div class="card panel"><p class="small muted">Chưa có dữ liệu từ vựng cho khối ' + g + '.</p></div>';

    const SECN = { GS: "Getting Started", CL1: "A Closer Look 1", CL2: "A Closer Look 2", COM: "Communication", SK1: "Skills 1", SK2: "Skills 2", LB: "Looking Back", PRJ: "Project" };
    const groups = {};
    deck.cards.forEach(c => { (groups[c.sec] = groups[c.sec] || []).push(c); });

    let rec = {};
    try { rec = (window.getVocabRecords ? window.getVocabRecords() : {})[(g === 8 ? "g8-" : "") + "unit" + u] || {}; } catch (e) {}
    const modeRec = rec.modes || {};
    const PRACTICE = [["mc", "quiz", "Trắc nghiệm"], ["listen", "hearing", "Nghe chọn từ"], ["spell", "keyboard", "Chính tả"], ["image", "image", "Nhìn hình"], ["gap", "edit_note", "Điền câu"], ["match", "link", "Nối từ"]];
    const practiceBtn = ([mode, icon, label]) => {
      const r = modeRec[mode];
      const tip = r ? ` title="Đã làm · Tốt nhất ${r.best}% · Lần gần nhất ${r.last}%"` : "";
      return `<button type="button" class="btn btn-soft btn-sm${r ? " practice-done" : ""}" data-practice="${mode}"${tip}><i class=mi>${r ? "check_circle" : icon}</i> ${label}${r ? ` <b class="practice-best">${r.best}%</b>` : ""}</button>`;
    };
    const doneCount = PRACTICE.filter(p => modeRec[p[0]]).length;
    const practiceBar = `
      <div class="vocab-practice-bar">
        <span><i class=mi>sports_esports</i> Luyện từ Unit ${u}${doneCount ? ` (${doneCount}/${PRACTICE.length} dạng đã làm)` : ""}:</span>
        ${PRACTICE.map(practiceBtn).join("")}
      </div>`;
    const words = Object.keys(groups).map(sec => `
      <div class="unit-sec">
        <h4 class="unit-sec-title">${esc(SECN[sec] || sec)} <span class="small muted">· ${groups[sec].length} từ</span></h4>
        <div class="unit-word-grid">
          ${groups[sec].map(c => `
            <div class="unit-word unit-word-lg">
              ${(img => img ? `<img class="unit-word-img" src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : "")(imageFor(c.w))}
              <button type="button" class="unit-say" data-say="${esc(c.w)}" title="Nghe phát âm"><i class=mi>volume_up</i></button>
              <div>
                <b>${esc(c.w)}</b> ${c.pos ? `<span class="unit-pos">${esc(c.pos)}</span>` : ""}
                <div class="small muted">${esc(c.ipa)}</div>
                <div class="unit-vi">${esc(c.vi)}</div>
                ${(ex => ex ? `<div class="unit-ex"><button type="button" class="unit-say mini" data-say="${esc(ex.en)}" title="Nghe câu ví dụ"><i class=mi>volume_up</i></button><em>${esc(ex.en)}</em>${ex.vi ? `<div class="small muted">${esc(ex.vi)}</div>` : ""}</div>` : "")(exampleFor(u, c.w))}
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
          <div class="unit-ok"><i class=mi>check</i> ${esc(pt.ok)}</div>
          <div class="unit-no"><i class=mi>close</i> ${esc(pt.no)}</div>
          <p class="small muted">${esc(pt.note)}</p>
        </div>`).join("")}
      <div class="unit-codes">
        <b class="small">Mã lỗi Phòng Chữa Lỗi nhận ra ở unit này:</b>
        ${(gram.codes || []).map(c => `<span class="unit-code" title="${esc(c.hint)}">${esc(c.id)} · ${esc(c.label)}</span>`).join("")}
      </div>
      <div class="unit-quiz" id="unitGrammarQuiz">
        <h4>Luyện tập nhanh</h4>
        ${(gram.quiz || []).map((q, i) => {
          const opts = [q.a].concat(q.b).map((o, k) => ({ o, k })).sort(() => Math.random() - 0.5);
          return `<div class="unit-q" data-answer="${esc(q.a)}" data-code="${esc(q.code)}">
            <p><b>${i + 1}.</b> ${esc(q.q)}</p>
            <div class="unit-opts">${opts.map(x => `<button type="button" class="unit-opt" data-val="${esc(x.o)}">${esc(x.o)}</button>`).join("")}</div>
          </div>`;
        }).join("")}
        <button class="btn btn-primary btn-sm" id="unitGrammarCheck" type="button">Kiểm tra đáp án</button>
        <span class="small muted" id="unitGrammarScore"></span>
      </div>`;

    const totalWords = Object.values(allVocab).reduce((a, x) => a + (x.cards ? x.cards.length : 0), 0);
    const totalUnits = Object.keys(allVocab).length;
    return `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Học theo Unit · ${esc(deck.name)}</h3>
            <p class="small muted">${deck.cards.length} từ vựng và ${gram ? gram.points.length : 0} điểm ngữ pháp bám sát sách Global Success ${g}.</p></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${gradeSwitchHtml()}
            <span class="badge" style="background:#eef2ff;color:#4338ca;font-weight:700">${totalWords} từ · ${totalUnits} unit</span>
          </div>
        </div>
        ${unitChips(u, "data-vunit")}
        <div class="healing-tabs" style="margin-top:12px">
          <button class="healing-tab${state.vocabTab === "words" ? " active" : ""}" data-vtab="words"><i class=mi>menu_book</i> Từ vựng</button>
          <button class="healing-tab${state.vocabTab === "grammar" ? " active" : ""}" data-vtab="grammar"><i class=mi>edit</i> Ngữ pháp</button>
        </div>
        <div class="unit-body">${state.vocabTab === "words" ? practiceBar + words : grammar}</div>
      </div>`;
  }

  const LVN = { easy: "Dễ", medium: "Vừa", hard: "Khó" };
  function grammarAiHTML(u, gram) {
    const theory = (gram.points || []).map(pt => `
      <div class="unit-rule">
        <h4>${esc(pt.name)}</h4>
        <p>${esc(pt.explanation)}</p>
        ${pt.formula ? `<div class="unit-form">${esc(pt.formula)}</div>` : ""}
        ${(pt.examples || []).map(e => `<div class="unit-ok"><button type="button" class="unit-say mini" data-say="${esc(e.en)}"><i class=mi>volume_up</i></button> ${esc(e.en)} <span class="small muted">— ${esc(e.vi)}</span></div>`).join("")}
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
    const g = GRADE();
    $("#unitGrammarScore").textContent = `Đúng ${right}/${total} (${pct}%)`;
    if (wrongList.length && typeof recordUnitGrammarErrors === "function") recordUnitGrammarErrors(u, gram.title || `Unit ${u}`, wrongList);
    wrongList.forEach(() => api.pushError(gPrefix() + "U" + u));
    logEvent("grammar", gPrefix() + "unit" + u, `Ngữ pháp Unit ${u} (Khối ${g}): ${gram.title || ""}`, right, total, { grade: g, unit: u, percent: pct });
    if (pct >= 80 && markDone("grammar", gPrefix() + "u" + u)) { reward(30, 3, `Ngữ pháp Unit ${u} (Khối ${g})`); cheerUp(pct === 100 ? "perfect" : "unitDone"); toast(`Hoàn thành ngữ pháp Unit ${u}: +30 XP, +3`); }
    else if (pct < 80) toast(`Đúng ${right}/${total}. Xem giải thích và làm lại để đạt ≥ 80% nhé!`);
  }

  async function mountVocab() {
    const view = document.getElementById("vocabulary");
    if (!view) return;
    const host = ensureHost(view, "unitVocabMount", ".flashcard-layout");
    if (!Object.keys(VOCAB()).length) host.innerHTML = '<div class="card panel"><p class="small muted">Đang tải dữ liệu bài học...</p></div>';
    if (DATA()) await DATA().ensure("vocab");
    host.innerHTML = vocabPanelHTML();
    if (!mountVocab.bound) {
      mountVocab.bound = true;
      document.addEventListener("engo:vocab-record", () => {
        if (document.getElementById("vocabulary")?.classList.contains("active")) mountVocab();
      });
      host.addEventListener("click", e => {
        const gBtn = e.target.closest("[data-engo-grade]");
        if (gBtn && DATA()) { DATA().setGrade(Number(gBtn.dataset.engoGrade)); return; }
        const vUnit = e.target.closest("[data-vunit]");
        if (vUnit) { state.vocabUnit = Number(vUnit.dataset.vunit); mountVocab(); return; }
        const vTab = e.target.closest("[data-vtab]");
        if (vTab) { state.vocabTab = vTab.dataset.vtab; mountVocab(); return; }
        const sayBtn = e.target.closest("[data-say]");
        if (sayBtn) { say(sayBtn.dataset.say, 0.8); return; }
        const pracBtn = e.target.closest("[data-practice]");
        if (pracBtn) { typeof window.practiceVocabUnit === "function" && window.practiceVocabUnit(state.vocabUnit, pracBtn.dataset.practice); return; }
        const opt = e.target.closest(".unit-opt");
        if (opt) {
          const q = opt.closest(".unit-q");
          q?.querySelectorAll(".unit-opt").forEach(x => x.classList.remove("picked"));
          opt.classList.add("picked");
          return;
        }
        if (e.target.closest("#unitGrammarCheck")) {
          const gramData = GRAM()["unit" + state.vocabUnit];
          if (gramData && Array.isArray(gramData.exercises)) checkAiGrammar(host, state.vocabUnit, gramData);
          else {
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
              if (!ok) api.pushError(q.dataset.code);
            });
            $("#unitGrammarScore").textContent = `Đúng ${right}/${qs.length}`;
            if (right === qs.length && markDone("grammar", gPrefix() + "u" + state.vocabUnit)) {
              reward(30, 3, `Ngữ pháp Unit ${state.vocabUnit}`);
              cheerUp("perfect");
              toast(`Hoàn thành ngữ pháp Unit ${state.vocabUnit}: +30 XP, +3`);
            }
          }
        }
      });
    }
  }

  async function mountSpeaking() {
    const view = document.getElementById("speaking-lab");
    if (!view) return;
    const host = ensureHost(view, "unitSpeakMount", null);
    if (!Object.keys(SPEAK()).length) host.innerHTML = '<div class="card panel"><p class="small muted">Đang tải dữ liệu luyện nói...</p></div>';
    if (DATA()) await DATA().ensure("speaking");
    const u = state.speakUnit, g = GRADE();
    const allSpeak = SPEAK();
    const set = allSpeak["unit" + u];
    const totalItems = Object.values(allSpeak).reduce((a, x) => a + (x.levels || []).reduce((b, l) => b + l.items.length, 0), 0);
    const totalUnits = Object.keys(allSpeak).length;
    host.innerHTML = !set ? "" : `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Luyện nói theo Unit · ${esc(set.name)}</h3></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${gradeSwitchHtml()}
            <span class="badge" style="background:#ecfdf5;color:#047857;font-weight:700">${totalItems} câu · ${totalUnits} unit</span>
          </div>
        </div>
        ${unitChips(u, "data-sunit")}
        <div class="unit-body">
          ${set.levels.map(l => `
            <div class="unit-sec">
              <h4 class="unit-sec-title"><span class="unit-lv lv${l.level}">Cấp ${l.level}</span> ${esc(l.label)}</h4>
              ${l.items.map(it => `
                <div class="unit-line">
                  <button type="button" class="unit-say" data-say="${esc(it.text)}" title="Nghe câu mẫu"><i class=mi>volume_up</i></button>
                  <div>
                    <b>${esc(it.text)}</b>
                    <div class="unit-vi">${esc(it.vi)}</div>
                    <div class="small muted">Chú ý: ${esc(it.focus)}</div>
                  </div>
                </div>`).join("")}
            </div>`).join("")}
        </div>
      </div>`;
    if (!mountSpeaking.bound) {
      mountSpeaking.bound = true;
      host.addEventListener("click", e => {
        const gBtn = e.target.closest("[data-engo-grade]");
        if (gBtn && DATA()) { DATA().setGrade(Number(gBtn.dataset.engoGrade)); return; }
        const sBtn = e.target.closest("[data-sunit]");
        if (sBtn) { state.speakUnit = Number(sBtn.dataset.sunit); mountSpeaking(); return; }
        const sayBtn = e.target.closest("[data-say]");
        if (sayBtn) say(sayBtn.dataset.say, 0.8);
      });
    }
  }

  async function mountListening() {
    const host = document.getElementById("listeningMount");
    if (!host) return;
    if (!Object.keys(LISTEN()).length) host.innerHTML = '<div class="card panel"><p class="small muted">Đang tải dữ liệu luyện nghe...</p></div>';
    if (DATA()) await DATA().ensure("listening");
    const u = state.listenUnit, g = GRADE();
    const base = LISTEN()["unit" + u];
    const set = base ? { ...base, tasks: listeningTasks(u) } : null;
    const badge = document.getElementById("listenProgressBadge");
    const totalTasks = UNITS.reduce((a, x) => a + listeningTasks(x).length, 0);
    const doneForGrade = () => Object.keys(loadProg().listen || {}).filter(k => g === 8 ? k.startsWith("g8-") : !k.startsWith("g8-")).length;
    if (badge) badge.textContent = `${doneForGrade()} / ${totalTasks} đoạn`;
    if (!set) { host.innerHTML = `<div class="card panel"><div class="section-head"><h3>Chưa có dữ liệu luyện nghe khối ${g}</h3>${gradeSwitchHtml()}</div></div>`; return; }

    const pfx = gPrefix();
    host.innerHTML = `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>${esc(set.name)}</h3></div>
          ${gradeSwitchHtml()}
        </div>
        ${unitChips(u, "data-lunit")}
      </div>
      ${set.tasks.map((t, ti) => {
        const key = pfx + "u" + u + "t" + ti;
        return `
        <div class="card panel unit-panel" data-task="${ti}">
          <div class="section-head">
            <div><h3><span class="unit-lv lv${t.level}">Cấp ${t.level}</span> ${esc(t.title)}</h3>
              <p class="small muted">${t.intro ? esc(t.intro) + " · " : ""}${t.script.split(/\s+/).length} từ · tốc độ ${t.rate}× ${loadProg().listen && loadProg().listen[key] ? "· <i class=mi>check_circle</i> đã hoàn thành" : ""}</p></div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-primary btn-sm" data-play="${ti}" type="button" ${playsLeft(key) <= 0 ? "disabled" : ""}><i class=mi>play_arrow</i> Nghe</button>
              <span class="small muted" data-plays="${ti}">Còn ${playsLeft(key)} lượt</span>
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
        </div>`;
      }).join("")}`;

    if (!mountListening.bound) {
      mountListening.bound = true;
      host.addEventListener("click", e => {
        const gBtn = e.target.closest("[data-engo-grade]");
        if (gBtn && DATA()) { DATA().setGrade(Number(gBtn.dataset.engoGrade)); return; }
        const lBtn = e.target.closest("[data-lunit]");
        if (lBtn) { state.listenUnit = Number(lBtn.dataset.lunit); mountListening(); return; }
        const curU = state.listenUnit, curPfx = gPrefix();
        const curTasks = listeningTasks(curU);

        const playBtn = e.target.closest("[data-play]");
        if (playBtn) {
          const ti = Number(playBtn.dataset.play), t = curTasks[ti], key = curPfx + "u" + curU + "t" + ti;
          const label = host.querySelector(`[data-plays="${ti}"]`);
          const left = playsLeft(key);
          if (left <= 0) { toast("Đã hết lượt nghe cho đoạn này. Bấm Kiểm tra để nộp, lần làm sau sẽ có lại 3 lượt."); return; }
          setPlaysLeft(key, left - 1);
          if (label) label.textContent = `Còn ${left - 1} lượt`;
          playBtn.disabled = true;
          say(t.script, t.rate, () => { const l2 = playsLeft(key); if (label) label.textContent = `Còn ${l2} lượt`; playBtn.disabled = l2 <= 0; });
          return;
        }
        const scriptBtn = e.target.closest("[data-script]");
        if (scriptBtn) { host.querySelector(`[data-scripttext="${scriptBtn.dataset.script}"]`)?.classList.toggle("hidden"); return; }
        const opt = e.target.closest(".unit-opt");
        if (opt) { opt.parentElement.querySelectorAll(".unit-opt").forEach(x => x.classList.remove("picked")); opt.classList.add("picked"); return; }
        const checkBtn = e.target.closest("[data-check]");
        if (checkBtn) {
          const ti = Number(checkBtn.dataset.check), t = curTasks[ti], key = curPfx + "u" + curU + "t" + ti;
          let right = 0;
          t.qs.forEach((q, qi) => {
            const box = host.querySelector(`[data-task="${ti}"] [data-q="${qi}"]`);
            let ok = false;
            if (q.type === "gap") {
              const inp = box.querySelector("input");
              ok = (inp.value || "").trim().toLowerCase() === String(q.a).toLowerCase();
              inp.classList.toggle("wrong", !ok); inp.classList.toggle("right", ok);
            } else {
              const picked = box.querySelector(".unit-opt.picked");
              const want = q.type === "tf" ? (q.a ? "Đúng" : "Sai") : q.opts[q.a];
              ok = picked && picked.dataset.val === want;
              box.querySelectorAll(".unit-opt").forEach(o => { o.classList.toggle("right", o.dataset.val === want); o.classList.toggle("wrong", o === picked && !ok); });
            }
            if (ok) right++;
          });
          host.querySelector(`[data-score="${ti}"]`).textContent = `Đúng ${right}/${t.qs.length}`;
          setPlaysLeft(key, MAX_PLAYS);
          const lbl = host.querySelector(`[data-plays="${ti}"]`), pb = host.querySelector(`[data-play="${ti}"]`);
          if (lbl) lbl.textContent = `Còn ${MAX_PLAYS} lượt`;
          if (pb) pb.disabled = false;
          host.querySelectorAll(`[data-task="${ti}"] .unit-why`).forEach(w => w.classList.remove("hidden"));
          logEvent("listening", key, `Nghe Unit ${curU} (Khối ${GRADE()}) · ${t.title}`, right, t.qs.length, { grade: GRADE(), unit: curU, level: t.level, ai: Boolean(t.ai) });
          if (right >= Math.ceil(t.qs.length * 0.8) && markDone("listen", key)) {
            reward(30, 3, `Nghe Unit ${curU} cấp ${t.level} (Khối ${GRADE()})`);
            cheerUp(right === t.qs.length ? "perfect" : "taskDone");
            toast(`Hoàn thành đoạn nghe: +30 XP, +3`);
            const b = document.getElementById("listenProgressBadge");
            if (b) b.textContent = `${Object.keys(loadProg().listen || {}).filter(k => GRADE() === 8 ? k.startsWith("g8-") : !k.startsWith("g8-")).length} / ${UNITS.reduce((a, x) => a + listeningTasks(x).length, 0)} đoạn`;
          }
        }
      });
    }
  }

  function renderQ(q, ti, qi) {
    const head = `<p><b>${qi + 1}.</b> ${esc(q.q)}</p>`;
    if (q.type === "gap") return `<div class="unit-q" data-q="${qi}">${head}<input class="unit-gap" type="text" placeholder="Điền từ nghe được"></div>`;
    const opts = q.type === "tf" ? ["Đúng", "Sai"] : q.opts;
    return `<div class="unit-q" data-q="${qi}">${head}<div class="unit-opts">${opts.map(o => `<button type="button" class="unit-opt" data-val="${esc(o)}">${esc(o)}</button>`).join("")}</div>${q.why ? `<div class="unit-why hidden">${esc(q.why)}</div>` : ""}</div>`;
  }

  async function mountExams() {
    const view = document.getElementById("tests");
    if (!view) return;
    if (DATA() && !EXAM()) await DATA().ensure("exam");
    const B = EXAM();
    if (!B) return;
    const host = ensureHost(view, "unitExamMount", null);
    const term = state.examTerm;
    const specs = B.byTerm(term);
    const TYPEN = { KTTX: "Thường xuyên", KTGK: "Giữa kì", KTCK: "Cuối kì" };
    const cu = CU();
    const isTeacher = cu && (cu.role === "teacher" || cu.role === "admin");
    const myGrade = cu && cu.className ? Number(String(cu.className).match(/^([89])/)?.[1]) : null;
    const grade = isTeacher ? state.examGrade : (myGrade || 9);
    const tests = TESTS().filter(t => !t.grade || Number(t.grade) === grade);
    const forSpec = s => tests.filter(t => String(t.testType || "kttx").toUpperCase() === s.type && Number(t.semester || 1) === s.term && (s.type !== "KTTX" || !t.unitNo || (s.units || []).includes(Number(t.unitNo))));
    const bankCell = s => {
      const list = forSpec(s);
      const rows = list.map(t => {
        const sub = t.submission;
        const btn = isTeacher ? "" : sub ? `<span class="badge green">${sub.scoreOnTen}/10</span>` : `<button type="button" class="btn btn-primary btn-sm" data-take="${t.id}">Làm bài</button>`;
        return `<div class="unit-bank-row"><span>${esc(t.title)}${t.className ? ` <span class="small muted">(${esc(t.className)})</span>` : ""}</span>${btn}</div>`;
      }).join("");
      const upload = isTeacher ? `<button type="button" class="btn btn-soft btn-sm" data-upload-spec="${esc(s.id)}">＋ Nạp đề Word</button>` : "";
      return (rows ? `<div class="unit-bank-list">${rows}</div><div class="small muted" style="margin-top:4px">${list.length} đề</div>` : '<span class="small muted">Chưa có đề</span>') + (upload ? `<div style="margin-top:6px">${upload}</div>` : "");
    };

    host.innerHTML = `
      <div class="card panel unit-panel">
        <div class="section-head">
          <div><h3>Kiểm tra theo Thông tư 22</h3></div>
          <span class="badge" style="background:#fff7ed;color:#b45309;font-weight:700">Khối ${grade} · ${tests.length} đề</span>
        </div>
        ${isTeacher ? `<div class="unit-chip-row" style="margin-bottom:8px">${[8, 9].map(g => `<button type="button" class="unit-chip${g === grade ? " active" : ""}" data-exam-grade="${g}">Khối ${g}</button>`).join("")}</div>` : ""}
        <div class="healing-tabs">
          <button class="healing-tab${term === 1 ? " active" : ""}" data-term="1">Học kì I · Unit 1–6</button>
          <button class="healing-tab${term === 2 ? " active" : ""}" data-term="2">Học kì II · Unit 7–12</button>
        </div>
        <div class="table-wrap" style="margin-top:12px">
          <table class="unit-exam-table">
            <thead><tr><th>Bài kiểm tra</th><th>Loại</th><th>Phạm vi</th><th>Thời gian</th><th>Cấu trúc</th><th>Ma trận NB–TH–VD–VDC</th><th>Ngân hàng đề</th></tr></thead>
            <tbody>
              ${specs.map(s => `
                <tr>
                  <td><b>${esc(s.name)}</b><div class="small muted">${esc(s.form)}</div></td>
                  <td><span class="unit-code">${esc(TYPEN[s.type])}</span></td>
                  <td>Unit ${s.units.join(", ")}</td>
                  <td>${s.minutes} phút</td>
                  <td class="small"><div class="unit-struct">${s.sections.map(x => `<span>${esc(x.skill)}</span><span><b>${x.n}</b> câu</span><span class="muted">${x.pts} đ</span>`).join("")}</div></td>
                  <td class="small">${s.matrix.NB}% – ${s.matrix.TH}% – ${s.matrix.VD}% – ${s.matrix.VDC}%</td>
                  <td>${bankCell(s)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    if (!mountExams.bound) {
      mountExams.bound = true;
      host.addEventListener("click", e => {
        const termBtn = e.target.closest("[data-term]");
        if (termBtn) { state.examTerm = Number(termBtn.dataset.term); mountExams(); return; }
        const gBtn = e.target.closest("[data-exam-grade]");
        if (gBtn) { state.examGrade = Number(gBtn.dataset.examGrade); mountExams(); return; }
        const takeBtn = e.target.closest("[data-take]");
        if (takeBtn) { typeof startImportedTest === "function" && startImportedTest(takeBtn.dataset.take); return; }
        const upBtn = e.target.closest("[data-upload-spec]");
        if (upBtn) {
          const curSpecs = EXAM()?.byTerm(state.examTerm) || [];
          const spec = curSpecs.find(x => x.id === upBtn.dataset.uploadSpec);
          if (typeof openCreateTestForSpec === "function") openCreateTestForSpec(spec);
        }
      });
    }
  }

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

  const api = {
    onView(id) {
      try {
        if (id === "vocabulary") mountVocab();
        if (id === "speaking-lab") mountSpeaking();
        if (id === "listening-lab") mountListening();
        if (id === "tests") mountExams();
        if (id === "student-home" || id === "results") bindOverview();
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
    stats() { return { grammarDone: countDone("grammar"), listenDone: countDone("listen"), errors: api.errorMap() }; }
  };
  window.ENGO_UNITS_UI = api;

  window.addEventListener("engo:grade-change", () => {
    const active = document.querySelector(".view.active")?.id;
    if (active === "vocabulary") mountVocab();
    else if (active === "speaking-lab") mountSpeaking();
    else if (active === "listening-lab") mountListening();
  });

  document.addEventListener("DOMContentLoaded", () => {
    bindOverview();
    const rl = document.getElementById("refreshListeningBtn");
    if (rl) rl.addEventListener("click", () => mountListening());
  });
})();
