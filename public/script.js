const views = [...document.querySelectorAll(".view")];
const sidebar = document.getElementById("sidebar");
const roleSelect = document.getElementById("roleSelect");
const avatar = document.getElementById("avatar");
const toast = document.getElementById("toast");

let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function playClickSound() {
  if (window.ENGO_SETTINGS && window.ENGO_SETTINGS.sound === false) return;
  try {
    const ctx = getAudioContext(); if (!ctx) return;
    const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(580, now); osc.frequency.exponentialRampToValueAtTime(160, now + 0.035);
    gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.035);
  } catch (e) {}
}
function playSuccessSound() {
  try {
    const ctx = getAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), t = now + i * 0.065;
      osc.type = "sine"; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.32);
    });
  } catch (e) {}
}
function playWrongSound() {
  try {
    const ctx = getAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    [320, 240].forEach((freq, idx) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), t = now + idx * 0.09;
      osc.type = "triangle"; osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + 0.16);
    });
  } catch (e) {}
}
document.addEventListener("click", e => {
  if (e.target.closest("button, .btn, .nav-btn, .auth-tab, .option, .deck-item, [data-view]")) playClickSound();
}, true);

const THEME_STORAGE_KEY = "engoTheme";
applyTheme(getPreferredTheme());
document.querySelectorAll(".theme-toggle").forEach(button => button.addEventListener("click", () => {
  const cur = currentThemeId(); const dark = document.body.classList.contains("dark-mode");
  const next = dark ? (localStorage.getItem("engoLastLight") || "light") : (localStorage.getItem("engoLastDark") || "dark");
  localStorage.setItem(dark ? "engoLastDark" : "engoLastLight", cur);
  localStorage.setItem(THEME_STORAGE_KEY, next); applyTheme(next);
  showToast(dark ? "Đã bật giao diện sáng" : "Đã bật giao diện tối");
}));
let toastTimer = null;
function showToast(message) {
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}
function escapeHTML(value) { return String(value ?? "").replace(/[&<>'"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[m])); }
function richText(value) { return escapeHTML(value).replace(/&lt;(\/?)(u|b)&gt;/g, "<$1$2>").replace(/\n/g, "<br>"); }
function plainText(value) { return String(value ?? "").replace(/<\/?[ub]>/g, ""); }
function fmtDate(v, withTime = false) {
  if (!v) return "—";
  const d = new Date(v); if (isNaN(d)) return "—";
  return withTime ? d.toLocaleString("vi-VN") : d.toLocaleDateString("vi-VN");
}
function openModal(id) { document.getElementById(id)?.classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }
document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.closeModal)));
document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); }));

const ROUTE_MAP = {
  "student-home": "/dashboard", "settings": "/settings", "quiz": "/contest", "achievements": "/rewards", "tests": "/tests",
  "vocabulary": "/vocabulary", "errorHealing": "/healing", "listening-lab": "/listening", "speaking-lab": "/speaking",
  "teacher-home": "/teacher", "parent-home": "/parent", "data-admin": "/admin"
};
const REVERSE_ROUTE_MAP = {
  "/": "student-home", "/overview": "student-home", "/dashboard": "student-home", "/results": "student-home", "/settings": "settings", "/contest": "quiz", "/quiz": "quiz", "/rewards": "achievements",
  "/achievements": "achievements", "/tests": "tests", "/assignments": "tests", "/vocabulary": "vocabulary", "/flashcards": "vocabulary",
  "/healing": "errorHealing", "/healing-room": "errorHealing", "/listening": "listening-lab", "/speaking": "speaking-lab",
  "/speaking-lab": "speaking-lab", "/teacher": "teacher-home", "/parent": "parent-home", "/admin": "data-admin"
};
const STUDENT_VIEWS = new Set(["student-home", "quiz", "achievements", "tests", "vocabulary", "errorHealing", "listening-lab", "speaking-lab"]);
const ROLE_HOME = { student: "student-home", teacher: "teacher-home", parent: "parent-home", admin: "data-admin" };

function switchView(id, pushHistory = true) {
  const scrollToResults = id === "results";
  if (scrollToResults) id = "student-home";
  if (!id || !document.getElementById(id)) return;

  if (currentUser && currentUser.role !== "student" && STUDENT_VIEWS.has(id)) id = ROLE_HOME[currentUser.role] || id;
  views.forEach(v => v.classList.toggle("active", v.id === id));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.view === id));
  sidebar.classList.remove("open");
  if (scrollToResults) setTimeout(() => document.getElementById("resultsAnchor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  else window.scrollTo({ top: 0, behavior: "smooth" });
  const targetPath = ROUTE_MAP[id] || ("/" + id);
  if (pushHistory && window.location.pathname !== targetPath) window.history.pushState({ viewId: id }, "", targetPath);

  const isQuiz = id === "quiz";
  const chatWidget = document.getElementById("capybaraChatWidget");
  if (chatWidget) { chatWidget.style.display = isQuiz ? "none" : "block"; if (isQuiz) document.getElementById("capybaraChatWindow")?.classList.add("hidden"); }

  if (!currentUser) return;
  if (id === "student-home") { renderStudentDashboard(); renderStudentResults(); }
  if (id === "tests") renderTestsPage();
  if (id === "errorHealing") renderHealingRoom();
  if (id === "speaking-lab") renderSpeakingLab();
  if (id === "achievements") renderAchievements();
  if (id === "vocabulary") renderVocabDecks();
  if (window.ENGO_UNITS_UI) window.ENGO_UNITS_UI.onView(id);
  if (id === "teacher-home") renderTeacherHome();
  if (id === "settings") renderSettings();
  if (id === "parent-home") renderParentDashboard();
  if (id === "data-admin") renderDataAdmin();
}
window.addEventListener("popstate", e => {
  const path = (window.location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
  switchView((e.state && e.state.viewId) || REVERSE_ROUTE_MAP[path] || "student-home", false);
});
document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", e => { e.preventDefault(); if (btn.dataset.view) switchView(btn.dataset.view); }));
document.getElementById("menuBtn").addEventListener("click", () => sidebar.classList.toggle("open"));

function applyRole(role, switchPage = true) {
  const isStudent = role === "student";
  document.querySelectorAll(".teacher-only").forEach(el => el.classList.toggle("hidden", role !== "teacher"));
  document.querySelectorAll(".parent-only").forEach(el => el.classList.toggle("hidden", role !== "parent"));
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", role !== "admin"));
  document.querySelectorAll(".student-nav-group").forEach(el => el.classList.toggle("hidden", !isStudent));
  document.querySelectorAll(".role-nav-group").forEach(el => el.classList.toggle("hidden", isStudent));
  document.querySelectorAll(".student-only-top").forEach(el => el.classList.toggle("hidden", !isStudent));
  roleSelect.value = role;
  if (!switchPage) return;
  const currentPath = (window.location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
  const fromUrl = REVERSE_ROUTE_MAP[currentPath];

  if (fromUrl && (isStudent ? STUDENT_VIEWS.has(fromUrl) : !STUDENT_VIEWS.has(fromUrl))) { switchView(fromUrl, false); return; }
  switchView(ROLE_HOME[role] || "student-home");
}
roleSelect.disabled = true;
document.getElementById("dashboardBtn").addEventListener("click", () => switchView(ROLE_HOME[currentUser?.role] || "student-home"));

const authScreen = document.getElementById("authScreen");
let currentUser = null;
let studentProgress = null;
let knownClasses = [];

async function apiRequest(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không thể thực hiện yêu cầu.");
  return data;
}
function setAuthError(element, message = "") { element.textContent = message; element.classList.toggle("show", Boolean(message)); }
function getInitials(name, role) {
  if (role === "teacher") return "GV"; if (role === "parent") return "PH"; if (role === "admin") return "QT";
  const parts = String(name || "HS").trim().split(/\s+/).filter(Boolean);
  return parts.slice(-2).map(p => p[0]).join("").toUpperCase() || "HS";
}
function sortClasses(list) { return [...new Set(list)].sort((x, y) => x.localeCompare(y, "vi", { numeric: true })); }
async function loadClassNames() {
  try {
    if (currentUser) {
      const data = await apiRequest("/api/class-settings");
      knownClasses = sortClasses([...(data.knownClasses || []), ...(data.settings || []).map(s => s.className)]);
    } else {
      const data = await apiRequest("/api/classes");
      knownClasses = sortClasses(data.classes || []);
    }
  } catch (e) { knownClasses = knownClasses.length ? knownClasses : Array.from({ length: 13 }, (_, i) => `9A${i + 1}`); }
  const dl = document.getElementById("classNameList");
  if (dl) dl.innerHTML = knownClasses.map(c => `<option value="${escapeHTML(c)}"></option>`).join("");
  document.querySelectorAll("#teacherClassFilter, #teacherStudentsClassFilter").forEach(sel => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tất cả các lớp</option>' + knownClasses.map(c => `<option value="${escapeHTML(c)}" ${c === cur ? "selected" : ""}>Lớp ${escapeHTML(c)}</option>`).join("");
  });
}
function updateUserUI(user) {
  currentUser = user;
  roleSelect.value = user.role;
  avatar.textContent = getInitials(user.fullName, user.role);
  const welcome = document.getElementById("welcomeHeading");
  if (welcome && user.role === "student") {
    const shortName = String(user.fullName || "học sinh").trim().split(/\s+/).slice(-2).join(" ");
    welcome.textContent = `Chào ${shortName}${user.className ? ` · Lớp ${user.className}` : ""}`;
  }
  loadClassNames();
  if (user.role === "student") {
    migrateLocalData();
    renderCapybaraCompanion();
    updateStreakTopbarUI();
    setTimeout(() => renderDailyStreakModal(false), 800);
  }
}
const LOCAL_DATA_VERSION = 4;
const USER_KEYS = ["engoLearningStatsV3", "engoStreakCheckinV2", "engoHealingProfileV3", "engoVocabV1", "engoSpeakingLocalV1", "engoUnitsProgressV1", "engoNotificationsReadV3"];
function migrateLocalData() {
  if (!currentUser || !currentUser.id) return;
  const vKey = getUserStorageKey("engoDataVersion");
  const cur = Number(localStorage.getItem(vKey) || 0);
  if (cur >= LOCAL_DATA_VERSION) return;
  try {
    const statsKey = getUserStorageKey("engoLearningStatsV3");
    if (!localStorage.getItem(statsKey)) {
      const legacy = localStorage.getItem("engoLearningStatsV3") || localStorage.getItem("engoLearningStats");
      if (legacy) localStorage.setItem(statsKey, legacy);
    }
    const h3 = getUserStorageKey("engoHealingProfileV3");
    if (!localStorage.getItem(h3)) {
      const oldRaw = localStorage.getItem(getUserStorageKey("engoHealingProfileV2")) || localStorage.getItem("engoHealingProfileV2");
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        const next = JSON.parse(JSON.stringify(defaultHealingProfile));
        next.grammar = (old.pendingErrors || []).map(e => ({ id: e.id, code: e.code, triggerQuestion: e.triggerQuestion, selected: e.selected, correct: e.correct, source: "test", createdAt: e.createdAt }));
        next.healedHistory = (old.healedHistory || []).map(e => ({ ...e, category: "grammar" }));
        next.heatmapStatus = old.heatmapStatus || {};
        next.healingStreak = old.healingStreak || 0;
        localStorage.setItem(h3, JSON.stringify(next));
      }
    }
    const st = getLearningStats(); setLearningStats({ ...defaultLearningStats, ...st });
    const skKey = getUserStorageKey("engoStreakCheckinV2");
    if (!localStorage.getItem(skKey)) { const old = localStorage.getItem("engoStreakCheckin") || localStorage.getItem("engoStreakCheckinV2"); if (old) localStorage.setItem(skKey, old); }
    localStorage.setItem(vKey, String(LOCAL_DATA_VERSION));
  } catch (e) { console.warn("migrateLocalData:", e); }
}
function exportMyData() {
  const data = { app: "ENGO", version: LOCAL_DATA_VERSION, userId: currentUser?.id, email: currentUser?.email, exportedAt: new Date().toISOString(), data: {} };
  USER_KEYS.forEach(k => { const v = localStorage.getItem(getUserStorageKey(k)); if (v) { try { data.data[k] = JSON.parse(v); } catch { data.data[k] = v; } } });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `engo-hoc-tap-${currentUser?.id || "user"}-${dateKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showToast("Đã tải bản sao dữ liệu học tập.");
}
function importMyData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || parsed.app !== "ENGO" || !parsed.data) throw new Error("File không đúng định dạng sao lưu ENGO.");
      const cur = getLearningStats(); const inc = parsed.data.engoLearningStatsV3 || {};
      setLearningStats({ ...defaultLearningStats, ...cur, ...inc, points: Math.max(cur.points || 0, inc.points || 0), carrots: Math.max(cur.carrots || 0, inc.carrots || 0), fedCarrots: Math.max(cur.fedCarrots || 0, inc.fedCarrots || 0), bestSpeakingScore: Math.max(cur.bestSpeakingScore || 0, inc.bestSpeakingScore || 0) });
      ["engoStreakCheckinV2", "engoHealingProfileV3", "engoVocabV1", "engoSpeakingLocalV1", "engoUnitsProgressV1"].forEach(k => { if (parsed.data[k] && !localStorage.getItem(getUserStorageKey(k))) localStorage.setItem(getUserStorageKey(k), JSON.stringify(parsed.data[k])); });
      if (parsed.data.engoHealingProfileV3 && localStorage.getItem(getUserStorageKey("engoHealingProfileV3"))) {
        const a = getHealingProfile(), b = parsed.data.engoHealingProfileV3;
        ["pronunciation", "grammar", "test", "healedHistory", "unitGrammar"].forEach(list => { const ids = new Set((a[list] || []).map(x => x.id)); a[list] = [...(a[list] || []), ...((b[list] || []).filter(x => !ids.has(x.id)))]; });
        a.heatmapStatus = { ...(b.heatmapStatus || {}), ...(a.heatmapStatus || {}) }; saveHealingProfile(a);
      }
      localStorage.setItem(getUserStorageKey("engoDataVersion"), String(LOCAL_DATA_VERSION));
      renderCapybaraCompanion(); showToast("Đã khôi phục dữ liệu học tập."); renderStudentDashboard(true);
    } catch (e) { showToast(e.message); }
  };
  reader.readAsText(file);
}
document.getElementById("exportMyDataBtn")?.addEventListener("click", exportMyData);
document.getElementById("importMyDataBtn")?.addEventListener("click", () => document.getElementById("importMyDataInput").click());
document.getElementById("importMyDataInput")?.addEventListener("change", e => { const f = e.target.files[0]; if (f) importMyData(f); e.target.value = ""; });

function completeLogin(user) { updateUserUI(user); authScreen.classList.add("hidden"); applyRole(user.role); showToast(`Xin chào, ${user.fullName}`); }

document.querySelectorAll("[data-auth-tab]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-auth-tab]").forEach(x => x.classList.toggle("active", x === tab));
  const login = tab.dataset.authTab === "login";
  document.getElementById("loginPane").classList.toggle("hidden", !login);
  document.getElementById("registerPane").classList.toggle("hidden", login);
  setAuthError(document.getElementById("loginError")); setAuthError(document.getElementById("registerError"));
}));
document.querySelectorAll("[data-password-target]").forEach(btn => btn.addEventListener("click", () => {
  const input = document.getElementById(btn.dataset.passwordTarget); input.type = input.type === "password" ? "text" : "password";
}));
const registerRoleSelect = document.getElementById("registerRole");
const registerClassGroup = document.getElementById("registerClassGroup");
registerRoleSelect?.addEventListener("change", () => {
  const isStudent = registerRoleSelect.value === "student";
  registerClassGroup.style.display = isStudent ? "grid" : "none";
  if (!isStudent) document.getElementById("registerClass").value = "";
});
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const error = document.getElementById("loginError"); setAuthError(error);
  const submit = e.submitter; if (submit) submit.disabled = true;
  try {
    const data = await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ email: document.getElementById("loginEmail").value.trim(), password: document.getElementById("loginPassword").value, role: document.getElementById("loginRole").value }) });
    completeLogin(data.user);
  } catch (err) { setAuthError(error, err.message); } finally { if (submit) submit.disabled = false; }
});
document.getElementById("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const error = document.getElementById("registerError"); setAuthError(error);
  const fullName = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirm").value;
  const role = document.getElementById("registerRole").value;
  const className = (document.getElementById("registerClass")?.value || "").trim().toUpperCase();
  if (!fullName || !email || !password) return setAuthError(error, "Vui lòng điền đầy đủ các trường thông tin.");
  if (password.length < 6) return setAuthError(error, "Mật khẩu phải có tối thiểu 6 ký tự.");
  if (password !== confirm) return setAuthError(error, "Hai mật khẩu chưa trùng khớp.");
  if (role === "student" && !className) return setAuthError(error, "Vui lòng nhập lớp học của bạn (ví dụ 9A1).");
  const submit = e.submitter || document.getElementById("registerSubmitBtn"); if (submit) submit.disabled = true;
  try {
    const data = await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password, role, className }) });
    showToast(data.message || "Đăng ký thành công!"); e.target.reset();
    document.getElementById("loginEmail").value = email; document.querySelector('[data-auth-tab="login"]').click();
  } catch (err) { setAuthError(error, err.message); } finally { if (submit) submit.disabled = false; }
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await apiRequest("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
  currentUser = null; studentProgress = null;
  authScreen.classList.remove("hidden");
  views.forEach(v => v.classList.toggle("active", v.id === "student-home"));
  window.history.pushState({}, "", "/");
  document.getElementById("loginForm").reset();
  showToast("Đã đăng xuất");
});
async function restoreSession() {
  try {
    const data = await apiRequest("/api/auth/me");
    updateUserUI(data.user); authScreen.classList.add("hidden"); applyRole(data.user.role);
  } catch { authScreen.classList.remove("hidden"); }
}

function getUserStorageKey(baseKey) { return currentUser && currentUser.id ? `${baseKey}_user_${currentUser.id}` : `${baseKey}_guest`; }
const defaultLearningStats = { points: 0, streak: 1, lastStudyDate: "", carrots: 15, fedCarrots: 0, bestSpeakingScore: 0, speakingAttempts: 0, quizCount: 0, bestScore: 0, vocabSets: 0 };
function getLearningStats() {
  try {
    const raw = localStorage.getItem(getUserStorageKey("engoLearningStatsV3"));
    return raw ? { ...defaultLearningStats, ...JSON.parse(raw) } : { ...defaultLearningStats };
  } catch { return { ...defaultLearningStats }; }
}
function setLearningStats(stats) { localStorage.setItem(getUserStorageKey("engoLearningStatsV3"), JSON.stringify(stats)); }
function dateKey() { return new Date().toISOString().slice(0, 10); }
function updateStudyStreak(stats) {
  const today = dateKey();
  if (!stats.lastStudyDate) { stats.streak = 1; stats.lastStudyDate = today; return; }
  if (stats.lastStudyDate === today) return;
  const days = Math.round((new Date(today + "T00:00:00") - new Date(stats.lastStudyDate + "T00:00:00")) / 86400000);
  stats.streak = days === 1 ? Math.max(1, stats.streak + 1) : 1; stats.lastStudyDate = today;
}
function getXPMultiplier() { return getCapybaraProgress(getLearningStats().fedCarrots || 0).isMax ? 1.5 : 1.0; }
function gainRewards(xp = 0, carrots = 0, reason = "") {
  const stats = getLearningStats();
  const gainedXp = Math.round((Number(xp) || 0) * getXPMultiplier());
  stats.points = (stats.points || 0) + gainedXp;
  stats.carrots = (stats.carrots || 0) + (Number(carrots) || 0);
  updateStudyStreak(stats); setLearningStats(stats);
  renderCapybaraCompanion();
 if (reason) showToast(`+${gainedXp} XP${carrots ?`, +${carrots}`:""} · ${reason}`);
}
function gainCarrots(amount, reason) { gainRewards(0, amount, reason); }
function gainXP(amount) { gainRewards(amount, 0, ""); }

const STREAK_CHECKIN_REWARDS = [
  { day: 1, carrots: 2, xp: 20, icon: "<i class=ico-carrot></i>" }, { day: 2, carrots: 3, xp: 30, icon: "<i class=ico-carrot></i>" }, { day: 3, carrots: 4, xp: 40, icon: "<i class=ico-carrot></i>" },
  { day: 4, carrots: 5, xp: 50, icon: "<i class=ico-carrot></i>" }, { day: 5, carrots: 6, xp: 60, icon: "<i class=ico-carrot></i>" }, { day: 6, carrots: 8, xp: 80, icon: "<i class=ico-carrot></i>" }, { day: 7, carrots: 10, xp: 100, icon: "<i class=mi>workspace_premium</i>" }
];
function getStreakCheckinData() { try { return JSON.parse(localStorage.getItem(getUserStorageKey("engoStreakCheckinV2")) || "") || { streak: 1, lastClaimDate: "", totalClaimed: 0 }; } catch { return { streak: 1, lastClaimDate: "", totalClaimed: 0 }; } }
function setStreakCheckinData(data) { localStorage.setItem(getUserStorageKey("engoStreakCheckinV2"), JSON.stringify(data)); }
function calculateStreakInfo() {
  const today = dateKey(), data = getStreakCheckinData(), stats = getLearningStats();
  let streak = data.streak || stats.streak || 1;
  const alreadyClaimed = data.lastClaimDate === today;
  if (!data.lastClaimDate) streak = 1;
  else if (!alreadyClaimed) {
    const diffDays = Math.round((new Date(today + "T00:00:00") - new Date(data.lastClaimDate + "T00:00:00")) / 86400000);
    if (diffDays === 1) streak += 1; else if (diffDays > 1) streak = 1;
  }
  const cycleDay = ((streak - 1) % 7) + 1;
  return { today, streak, cycleDay, alreadyClaimed, reward: STREAK_CHECKIN_REWARDS[cycleDay - 1], data, stats };
}
function updateStreakTopbarUI() {
  const info = calculateStreakInfo();
  const top = document.getElementById("topStreakCount"); if (top) top.textContent = info.streak;
  const capy = document.getElementById("capybaraStreakCount"); if (capy) capy.innerHTML = `<i class=mi>local_fire_department</i> <strong>${info.streak}</strong> ngày streak`;
  const dash = document.getElementById("dashboardStreak"); if (dash) dash.textContent = `${info.streak} ngày`;
}
function renderDailyStreakModal(forceOpen = false) {
  const modal = document.getElementById("dailyStreakModal"); if (!modal) return;
  const info = calculateStreakInfo();
  if (!forceOpen && info.alreadyClaimed) { updateStreakTopbarUI(); return; }
  document.getElementById("streakHeroCount").textContent = info.streak;
  document.getElementById("streakHeroDesc").textContent = info.alreadyClaimed ? `Bạn đã điểm danh hôm nay (chuỗi ${info.streak} ngày)! Quay lại vào ngày mai nhé.` : `Bạn đang có chuỗi ${info.streak} ngày học liên tiếp! Nhận quà hôm nay để giữ chuỗi nhé!`;
 document.getElementById("streakTrackStatus").textContent = info.alreadyClaimed ?"Đã nhận hôm nay":`Hôm nay: Ngày ${info.cycleDay}/7`;
  const grid = document.getElementById("streakDaysGrid");
  grid.innerHTML = STREAK_CHECKIN_REWARDS.map(r => {
    let cls = "locked";
    if (r.day < info.cycleDay || (r.day === info.cycleDay && info.alreadyClaimed)) cls = "claimed"; else if (r.day === info.cycleDay) cls = "today";
    return `<div class="streak-day-item ${cls}"><span class="day-label">Ngày ${r.day}</span><span class="reward-icon">${r.icon}</span><span class="reward-amount">${cls === "claimed" ? "<i class=mi>check</i> Đã nhận" : `+${r.carrots} <i class=ico-carrot></i>`}</span></div>`;
  }).join("");
 document.getElementById("streakCapySpeech").textContent = info.alreadyClaimed ?"Hôm nay bạn đã nhận thưởng rồi! Cùng học thật vui và quay lại điểm danh ngày mai nha!":`Oa, bạn chăm chỉ quá! Nhận ngay +${info.reward.carrots} Cà rốt để Capybara nạp năng lượng cùng bạn nha!`;
  const claimBtn = document.getElementById("streakClaimBtn"), claimText = document.getElementById("streakClaimBtnText");
  claimBtn.disabled = info.alreadyClaimed;
 claimText.textContent = info.alreadyClaimed ? "Đã Nhận Thưởng Hôm Nay" : `Nhận Thưởng (+${info.reward.carrots} cà rốt, +${info.reward.xp} XP)`;
  updateStreakTopbarUI(); modal.classList.remove("hidden");
}
function claimDailyStreakReward() {
  const info = calculateStreakInfo();
 if (info.alreadyClaimed) { showToast("Hôm nay bạn đã nhận thưởng rồi! Hãy quay lại vào ngày mai"); return; }
  const { data, stats, reward, today, streak } = info;
  data.streak = streak; data.lastClaimDate = today; data.totalClaimed = (data.totalClaimed || 0) + 1; setStreakCheckinData(data);
  stats.streak = streak; stats.lastStudyDate = today; setLearningStats(stats);
  gainRewards(reward.xp, reward.carrots, `Điểm danh chuỗi ${streak} ngày`);
  playSuccessSound();
  renderDailyStreakModal(true);
  setTimeout(() => closeModal("dailyStreakModal"), 1500);
}
document.getElementById("streakModalClose")?.addEventListener("click", () => closeModal("dailyStreakModal"));
document.getElementById("streakTopBtn")?.addEventListener("click", () => renderDailyStreakModal(true));
document.getElementById("streakClaimBtn")?.addEventListener("click", claimDailyStreakReward);
document.getElementById("capybaraStreakCount")?.addEventListener("click", () => renderDailyStreakModal(true));

const capybaraQuotesByLevel = {
 1: ["Chào bạn mới! Cùng mình bắt đầu từ những câu đơn giản nhé!","Đừng ngại phát âm chưa chuẩn, mình luôn lắng nghe bạn!","Mỗi ngày học 5 từ vựng mới là bạn đã giỏi hơn hôm qua!"],
 2: ["Bạn đang duy trì chuỗi học rất tốt, tiếp tục phát huy nào!","Luyện nói 5 phút mỗi ngày giúp bạn tự tin hơn nhiều!"],
 3: ["Bạn đã nắm vững nhiều cấu trúc rồi, thử sức với hội thoại giai đoạn 2 nhé!","Kỹ năng phát âm của bạn đang tiến bộ vượt bậc!"],
 4: ["Sắp chạm tới đỉnh cao Bậc Thầy rồi!","Chú ý các bẫy ngữ pháp: đuôi -s, -ed nhé!"],
 5: ["Xin chào Bậc Thầy ENGO! Bạn đã mở khóa toàn bộ đặc quyền!","Đỉnh cao ngữ pháp và phát âm! Điểm 9-10 trong tầm tay!"]
};
function getCapybaraProgress(fed = 0) {
  let remaining = Number(fed) || 0;
  const levels = [[10, "Capybara Mầm Non", "Capybara Chăm Chỉ"], [20, "Capybara Chăm Chỉ", "Capybara Học Giả"], [35, "Capybara Học Giả", "Capybara Thông Thái"], [50, "Capybara Thông Thái", "Capybara Bậc Thầy"]];
  for (let i = 0; i < levels.length; i++) {
    const [need, name, next] = levels[i];
    if (remaining < need) return { lv: i + 1, name, currentInLevel: remaining, neededForNext: need, percent: Math.round((remaining / need) * 100), nextName: next, isMax: false };
    remaining -= need;
  }
  return { lv: 5, name: "Capybara Bậc Thầy", currentInLevel: remaining, neededForNext: 0, percent: 100, nextName: "", isMax: true };
}
let currentCapyAudio = null;
function capybaraSpeak(text) {
  if (currentCapyAudio) { try { currentCapyAudio.pause(); } catch (e) {} }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, "").replace(/[()]/g, " ").trim();
  if (!cleanText) return;
  const audio = new Audio(`/api/tts?lang=vi&text=${encodeURIComponent(cleanText)}`);
  currentCapyAudio = audio;
  audio.play().catch(() => {
    const u = new SpeechSynthesisUtterance(cleanText); u.lang = "vi-VN"; u.rate = 1.05; window.speechSynthesis.speak(u);
  });
}
function renderCapybaraCompanion() {
  const stats = getLearningStats();
  const progress = getCapybaraProgress(stats.fedCarrots || 0);
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set("capybaraBadgeLv", `Lv.${progress.lv}`);
  set("capybaraSubtitle", `Cấp độ ${progress.lv}: ${progress.name}`);
  set("capybaraCarrotCount", `<i class=ico-carrot></i> <strong>${stats.carrots || 0}</strong> Cà rốt`);
  set("capybaraLevelNextLabel", progress.isMax ? `<i class=mi>workspace_premium</i> <strong>Đã đạt cấp độ Bậc Thầy!</strong>` : `Tiến hóa lên Lv.${progress.lv + 1} (${progress.nextName}): <strong>${progress.currentInLevel} / ${progress.neededForNext} <i class=ico-carrot></i></strong>`);
  set("capybaraLevelPercent", `${progress.percent}%`);
  const fill = document.getElementById("capybaraLevelProgressFill"); if (fill) fill.style.width = `${progress.percent}%`;
  set("capybaraLevelHint", progress.isMax ? "Bạn và Capybara đã chinh phục đỉnh cao!" : `Cần thêm ${progress.neededForNext - progress.currentInLevel} Cà rốt để tiến hóa`);
  document.getElementById("capybaraCompanionCard")?.classList.toggle("capybara-master-tier", progress.isMax);
  const perks = document.getElementById("capybaraMasterPerks"); if (perks) perks.style.display = progress.isMax ? "block" : "none";
  const feedBtn = document.getElementById("feedCapybaraBtn");
 if (feedBtn) { const c = stats.carrots || 0; feedBtn.textContent = c >= 5 ?"Cho ăn Cà rốt (-5)": c > 0 ?`Cho ăn Cà rốt (-${c})`:"Hết Cà rốt (luyện tập để kiếm)"; }
  set("speakingCarrotBadge", `<i class=ico-carrot></i> ${stats.carrots || 0} Cà rốt`);
  set("speakingScoreBadge", `<i class=mi>star</i> Điểm cao nhất: ${stats.bestSpeakingScore || 0}%`);
  set("progressPoints", `${stats.points || 0} XP`);
  updateStreakTopbarUI();
}
document.getElementById("talkToCapybaraBtn")?.addEventListener("click", () => {
  const progress = getCapybaraProgress(getLearningStats().fedCarrots || 0);
  const quotes = capybaraQuotesByLevel[progress.lv] || capybaraQuotesByLevel[1];
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById("capybaraMessage").textContent = `"${q}"`; capybaraSpeak(q);
});
document.getElementById("feedCapybaraBtn")?.addEventListener("click", () => {
  const stats = getLearningStats();
 if ((stats.carrots || 0) <= 0) { showToast("Bạn đã hết Cà rốt! Luyện nói hoặc làm bài kiểm tra để kiếm thêm nhé!"); return; }
  const feed = Math.min(5, stats.carrots);
  const old = getCapybaraProgress(stats.fedCarrots || 0);
  stats.carrots -= feed; stats.fedCarrots = (stats.fedCarrots || 0) + feed; stats.points = (stats.points || 0) + feed * 5;
  updateStudyStreak(stats); setLearningStats(stats); renderCapybaraCompanion();
  const next = getCapybaraProgress(stats.fedCarrots);
 if (next.lv > old.lv) { cheer("levelUp"); showToast(`Capybara đã thăng cấp lên Lv.${next.lv} ${next.name}!`); capybaraSpeak(`Chúc mừng! Mình đã tiến hóa lên cấp ${next.lv} ${next.name} rồi!`); }
 else { showToast(`Yum! Đã cho Capybara ăn ${feed} củ (+${feed * 5} XP)`); capybaraSpeak("Cảm ơn bạn nhé! Cà rốt ngon tuyệt!"); }
});

async function loadStudentProgress(force = false) {
  if (!currentUser || currentUser.role !== "student") return null;
  if (studentProgress && !force) return studentProgress;
  try {
    const data = await apiRequest("/api/student/progress");
    studentProgress = data.progress;
  } catch (e) {
    console.warn("progress unavailable:", e.message);
    studentProgress = null;
  }
  return studentProgress;
}
const SKILL_TEXT = { Listening: "Nghe", Speaking: "Nói", Vocabulary: "Từ vựng", Grammar: "Ngữ pháp", Writing: "Viết", Reading: "Đọc" };
const SKILL_LABELS = { Listening: "<i class=mi>headphones</i> Nghe", Speaking: "<i class=mi>record_voice_over</i> Nói", Vocabulary: "<i class=mi>abc</i> Từ vựng", Grammar: "<i class=mi>menu_book</i> Ngữ pháp", Writing: "<i class=mi>edit</i> Viết", Reading: "<i class=mi>book_2</i> Đọc" };

function renderRadar(scores) {
  const order = ["Listening", "Speaking", "Vocabulary", "Grammar", "Writing", "Reading"];
  const center = { x: 180, y: 160 }, radius = 100;
  const hasData = order.some(k => (scores[k] || 0) > 0);
  const points = order.map((name, index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    const factor = hasData ? Math.max(0.08, (scores[name] || 0) / 100) : 0.05;
    return { x: center.x + Math.cos(angle) * radius * factor, y: center.y + Math.sin(angle) * radius * factor };
  });
  document.getElementById("radarPolygon")?.setAttribute("points", points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  order.forEach((name, i) => { const dot = document.getElementById(`radarDot${name}`); if (dot) { dot.setAttribute("cx", points[i].x.toFixed(1)); dot.setAttribute("cy", points[i].y.toFixed(1)); } });
  return hasData;
}
function barChart(container, items, { max = 100, suffix = "", height = 100 } = {}) {
  if (!container) return;
  if (!items.length) { container.innerHTML = '<div class="empty-state" style="width:100%">Chưa có dữ liệu.</div>'; return; }
  container.innerHTML = items.map(it => {
    const pct = Math.max(6, Math.min(100, Math.round((Number(it.value) / max) * 100)));
    return `<div class="bar-wrap" title="${escapeHTML(it.title || it.label)}"><div class="bar ${it.cls || ""}" data-value="${escapeHTML(String(it.value))}${suffix}" style="height:${pct}%"></div>${escapeHTML(it.label)}</div>`;
  }).join("");
}
function titleChip(t) { return `<span class="title-chip" title="${escapeHTML(t.desc || "")}"><i class=mi>${escapeHTML(t.icon || "workspace_premium")}</i> ${escapeHTML(t.name)}</span>`; }

async function renderStudentDashboard(force = false) {
  if (!currentUser || currentUser.role !== "student") return;
  renderCapybaraCompanion();
  const p = await loadStudentProgress(force);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  if (!p) {
    set("dashTestAvg", "--"); set("dashTestCount", "0"); set("dashSpeakingAvg", "--%"); set("dashVocabSets", "0"); set("dashHealed", "0");
    document.getElementById("dashboardTodoList").innerHTML = '<div class="notice"><strong>Chưa kết nối được dữ liệu tiến độ</strong><p>Hãy làm mới sau ít phút.</p></div>';
    return;
  }
  set("dashTestAvg", p.tests.count ? `${p.tests.avgScore}/10` : "--");
  set("dashTestCount", p.tests.count);
  set("dashSpeakingAvg", p.speaking.totalAttempts ? `${p.speaking.avgAccuracy}%` : "--%");
  set("dashVocabSets", p.vocab.setsCompleted);
  set("dashHealed", p.healing.healed);
  set("progressBest", p.tests.count ? `${p.tests.bestScore}/10` : "--");
  set("progressActiveDays", p.activeDays);

  const hasData = renderRadar(p.skills);
  const strongest = Object.entries(p.skills).sort((a, b) => b[1] - a[1])[0];
  set("overallProgress", `${p.overall}%`);
  document.querySelector(".score-orbit")?.style.setProperty("--overall-progress", `${p.overall}%`);
  set("overallLevel", p.overall >= 80 ? "Người học vững vàng" : p.overall >= 50 ? "Đang tiến bộ tốt" : hasData ? "Người học khởi động" : "Chưa có dữ liệu");
  set("overallHint", hasData ? `Điểm mạnh hiện tại: ${SKILL_TEXT[strongest[0]]} (${strongest[1]}%).` : "Hoàn thành bài kiểm tra hoặc bài nói đầu tiên để mở thống kê.");
  set("competencyMessage", hasData ? `Nổi bật: ${SKILL_TEXT[strongest[0]]} đang ở mức ${strongest[1]}%.` : "Tổng hợp từ bài kiểm tra, luyện nói và từ vựng.");
  set("progressStatus", p.overall >= 80 ? "Năng lực tốt" : p.overall >= 50 ? "Đang tiến bộ" : hasData ? "Đang khởi động" : "Chưa đánh giá");
  document.getElementById("skillStatList").innerHTML = Object.keys(SKILL_LABELS).map(name => `<div class="skill-stat"><div class="skill-stat-head"><span>${SKILL_LABELS[name]}</span><b>${p.skills[name] || 0}%</b></div><div class="progress"><span style="width:${p.skills[name] || 0}%"></span></div></div>`).join("");
  document.getElementById("dashboardTitleChips").innerHTML = p.earnedTitles.length ? p.earnedTitles.map(titleChip).join("") : "";

  const hist = p.tests.history.slice(-8);
  barChart(document.getElementById("testTrendChart"), hist.map((h, i) => ({ label: `#${p.tests.history.length - hist.length + i + 1}`, value: h.scoreOnTen, title: `${h.title}: ${h.scoreOnTen}/10`, cls: h.scoreOnTen >= 8 ? "good" : h.scoreOnTen < 5 ? "bad" : "" })), { max: 10 });
  set("testTrendHint", p.tests.count ? `${p.tests.count} bài · TB ${p.tests.avgScore} · ${p.tests.improvement >= 0 ? "tăng" : "giảm"} ${Math.abs(p.tests.improvement)} điểm so với lúc bắt đầu` : "Điểm hệ 10 của các bài gần nhất");

  document.getElementById("dashStageGrid").innerHTML = [1, 2].map(s => {
    const st = p.speaking.stages[s] || {};
    return `<div class="stage-mini ${st.unlocked === false ? "locked" : ""}"><span class="small muted">Giai đoạn ${s} · ${s === 1 ? "Câu đơn" : "Hội thoại"}</span><strong>${st.attempts ? `${st.avgAccuracy}%` : "--"}</strong><span class="small">${st.attempts || 0} lượt · tốt nhất ${st.bestAccuracy || 0}% ${st.improvement ? `· ${st.improvement > 0 ? "▲" : "▼"} ${Math.abs(st.improvement)}%` : ""}</span></div>`;
  }).join("");
  barChart(document.getElementById("speakingTrendChart"), p.speaking.trend.map(t => ({ label: t.date.slice(5), value: t.accuracy, title: `${t.date}: ${t.accuracy}% (${t.attempts} lượt)` })), { suffix: "%" });

  const recent = p.events.slice(0, 6);
  const typeLabel = { test: "Bài kiểm tra", speaking: "Luyện nói", vocab: "Từ vựng", healing: "Chữa lỗi" };
  document.getElementById("recentHomeSubmissionsBody").innerHTML = recent.length ? recent.map(e => {
    const result = e.type === "test" ? `${e.maxScore ? ((e.score / e.maxScore) * 10).toFixed(1) : e.score}/10` : e.type === "vocab" ? `${e.maxScore ? Math.round((e.score / e.maxScore) * 100) : e.score}%` : e.type === "speaking" ? `${e.score}%` : "<i class=mi>check</i>";
    return `<tr><td><strong>${escapeHTML(e.title || typeLabel[e.type])}</strong></td><td>${fmtDate(e.createdAt)}</td><td><span class="score-pill">${result}</span></td><td><span class="badge">${typeLabel[e.type] || e.type}</span></td></tr>`;
  }).join("") : '<tr><td colspan="4" class="small muted" style="text-align:center;padding:20px">Chưa có hoạt động nào. Hãy bắt đầu với một bài luyện nói!</td></tr>';

  const todos = [];
  try {
    const t = await apiRequest("/api/tests/latest");
    const pending = (t.tests || []).filter(x => !x.submission);
    if (pending.length) todos.push({ title: `${pending.length} bài kiểm tra chưa làm`, desc: pending.slice(0, 2).map(x => x.title).join(", "), view: "tests" });
  } catch (e) {}
  if (!p.speaking.stages[1]?.attempts) todos.push({ title: "Bắt đầu luyện nói giai đoạn 1", desc: "Đọc các câu đơn theo chủ đề để mở khóa giai đoạn hội thoại.", view: "speaking-lab" });
  else if (p.speaking.stages[2]?.unlocked && !p.speaking.stages[2]?.attempts) todos.push({ title: "Giai đoạn 2 đã mở khóa!", desc: "Thử sức với hội thoại theo SGK.", view: "speaking-lab" });
  if (p.tests.pending) todos.push({ title: `${p.tests.pending} bài đang chờ giáo viên chấm Writing`, desc: "Điểm sẽ cập nhật khi giáo viên chấm xong.", view: "results" });
  const localHealing = getHealingProfile();
  const pendingErrors = localHealing.pronunciation.length + localHealing.grammar.length + localHealing.test.filter(t => !t.reviewed).length;
  if (pendingErrors) todos.push({ title: `${pendingErrors} lỗi đang chờ chữa`, desc: "Vào Phòng chữa lỗi để luyện lại.", view: "errorHealing" });
  if (!todos.length) todos.push({ title: "Tuyệt vời, bạn đã hoàn thành mọi việc!", desc: "Học thêm một bộ từ vựng để giữ chuỗi ngày nhé.", view: "vocabulary" });
  document.getElementById("dashboardTodoList").innerHTML = todos.map(t => `<div class="notice notice-link" data-view="${t.view}"><strong>${escapeHTML(t.title)}</strong><p>${escapeHTML(t.desc)}</p></div>`).join("");
  document.querySelectorAll("#dashboardTodoList [data-view]").forEach(el => el.addEventListener("click", () => switchView(el.dataset.view)));
}
document.getElementById("refreshDashboardBtn")?.addEventListener("click", () => { renderStudentDashboard(true); renderStudentResults(); showToast("Đã làm mới dashboard."); });

let testsCache = [];
const DIFF_LABEL = { easy: "Dễ", medium: "TB", hard: "Khó" };
const TEST_TYPE_LABEL = { kttx: "Thường xuyên", ktgk: "Giữa kỳ", ktck: "Cuối kỳ" };
function testTypeBadge(t) { const ty = t.testType || "kttx"; return `<span class="badge ${ty === "ktck" ? "red" : ty === "ktgk" ? "orange" : "blue"}">${TEST_TYPE_LABEL[ty] || ty}</span><div class="small muted">HK${t.semester || 1}${t.unitNo ? ` · Unit ${t.unitNo}` : ""}</div>`; }
function invalidateProgress() { studentProgress = null; }
function difficultyPills(counts) {
  if (!counts) return '<span class="small muted">Chưa phân tích</span>';
  return `<span class="diff-pill easy" title="Nhận biết">${counts.easy} dễ</span><span class="diff-pill medium" title="Thông hiểu">${counts.medium} TB</span><span class="diff-pill hard" title="Vận dụng">${counts.hard} khó</span>`;
}
async function renderTestsPage() {
  const tbody = document.getElementById("testsTableBody"); if (!tbody || !currentUser || currentUser.role !== "student") return;
  const filter = document.getElementById("testsStatusFilter")?.value || "";
  const semFilter = document.getElementById("testsSemesterFilter")?.value || "";
  const typeFilter = document.getElementById("testsTypeFilter")?.value || "";
  try {
    const data = await apiRequest("/api/tests/latest");
    testsCache = data.tests || [];
    if (window.ENGO_UNITS_UI) window.ENGO_UNITS_UI.refreshExams();
    const hint = document.getElementById("testsVariantHint");
    if (hint) hint.textContent = data.variant === "regular" ? "Lớp bạn nhận đề cơ bản (rút gọn bớt câu vận dụng theo ma trận)." : data.variant === "advanced" ? "Lớp bạn thuộc nhóm tăng cường: nhận đề đầy đủ với nhiều câu vận dụng." : "";
    const list = testsCache.filter(t => (filter === "todo" ? !t.submission : filter === "done" ? Boolean(t.submission) : true) && (!semFilter || String(t.semester || 1) === semFilter) && (!typeFilter || (t.testType || "kttx") === typeFilter));
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="small muted" style="text-align:center;padding:24px">Chưa có bài kiểm tra nào phù hợp.</td></tr>'; return; }
    tbody.innerHTML = list.map(t => {
      const s = t.summary || {};
      const structure = [s.objectiveCount ? `${s.objectiveCount} TN` : "", s.speakingCount ? `${s.speakingCount} Speaking` : "", s.manualCount ? `${s.manualCount} Writing` : ""].filter(Boolean).join(" · ");
      const status = t.submission
        ? `<span class="badge ${t.submission.status === "pending_manual" ? "orange" : "green"}">${t.submission.status === "pending_manual" ? "Chờ chấm Writing" : "Đã nộp"} · ${t.submission.scoreOnTen}/10</span>`
        : '<span class="badge blue">Chưa làm</span>';
      const action = t.submission
        ? `<button class="btn btn-light btn-sm" data-view="results">Xem kết quả</button>`
        : `<button class="btn btn-primary btn-sm start-test-btn" data-test-id="${t.id}">Làm bài</button>`;
      return `<tr><td><strong>${escapeHTML(t.title)}</strong><div class="small muted">${escapeHTML(t.sourceFileName || "")}</div></td><td>${testTypeBadge(t)}</td><td>${t.className ? `<span class="badge blue">${escapeHTML(t.className)}</span>` : '<span class="badge">Toàn khối</span>'}</td><td class="small">${structure}</td><td>${difficultyPills(t.difficultyCounts)}</td><td><strong>${t.durationMinutes} phút</strong><div class="small muted">AI đề xuất</div></td><td>${status}</td><td>${action}</td></tr>`;
    }).join("");
    tbody.querySelectorAll(".start-test-btn").forEach(b => b.addEventListener("click", () => startImportedTest(b.dataset.testId)));
    tbody.querySelectorAll("[data-view]").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));
  } catch (err) { tbody.innerHTML = `<tr><td colspan="8" class="small muted" style="color:red">${escapeHTML(err.message)}</td></tr>`; }
}
document.getElementById("refreshTestsBtn")?.addEventListener("click", () => { renderTestsPage(); showToast("Đã làm mới danh sách đề."); });
["testsStatusFilter", "testsSemesterFilter", "testsTypeFilter"].forEach(id => document.getElementById(id)?.addEventListener("change", renderTestsPage));

function createRecognizer({ onInterim, onEnd, onError } = {}) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return null;
  const rec = new SpeechRec();
  rec.lang = "en-US"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
  const finals = [];
  let interim = "";
  let stoppedByUser = false;
  rec.onresult = event => {
    finals.length = 0; interim = "";
    for (let i = 0; i < event.results.length; i++) {
      const r = event.results[i];
      if (r.isFinal) finals.push([...Array(r.length).keys()].map(k => r[k].transcript.trim()).filter(Boolean));
      else interim += r[0].transcript;
    }
    const live = (finals.map(f => f[0]).join(" ") + " " + interim).trim();
    onInterim && onInterim(live);
  };
  rec.onerror = event => { if (event.error !== "no-speech" && event.error !== "aborted") onError && onError(event.error); };
  rec.onend = () => {
    const alternatives = [];
    for (let k = 0; k < 3; k++) {
      const alt = finals.map(f => f[Math.min(k, f.length - 1)]).join(" ").trim();
      if (alt && !alternatives.includes(alt)) alternatives.push(alt);
    }
    if (!alternatives.length && interim.trim()) alternatives.push(interim.trim());
    onEnd && onEnd(alternatives, stoppedByUser);
  };
  return {
    start: () => { try { rec.start(); } catch (e) {} },
    stop: () => { stoppedByUser = true; try { rec.stop(); } catch (e) {} },
    abort: () => { try { rec.abort(); } catch (e) {} }
  };
}
function speakEnglishText(text, { rate = 0.85, onDone } = {}) {
  if (!("speechSynthesis" in window)) { showToast("Trình duyệt không hỗ trợ phát âm!"); onDone && onDone(); return; }
  window.speechSynthesis.cancel();
  const prefs = window.ENGO_SETTINGS || {};
  const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = rate * (Number(prefs.ttsSpeed) || 1);
  const voices = window.speechSynthesis.getVoices();
  const v = (prefs.ttsVoice && voices.find(x => x.name === prefs.ttsVoice)) || voices.find(x => x.lang.startsWith("en") && /Natural|Google|US/i.test(x.name)) || voices.find(x => x.lang.startsWith("en"));
  if (v) u.voice = v;
  u.onend = () => onDone && onDone(); u.onerror = () => onDone && onDone();
  window.speechSynthesis.speak(u);
}

let questions = [];
let activeImportedTest = null;
let currentQuestion = 0;
let answers = {};
let speakingAnswers = {};
let secondsLeft = 45 * 60;
let timerInterval = null;
let quizStartedAt = 0;
let quizRecognizer = null;
const questionContent = document.getElementById("questionContent");
const answerArea = document.getElementById("answerArea");
const questionCounter = document.getElementById("questionCounter");
const questionGrid = document.getElementById("questionGrid");

function saveAnswers() {
  if (!activeImportedTest) return;
  localStorage.setItem(getUserStorageKey(`engoAnswers_${activeImportedTest.id}`), JSON.stringify({ answers, speakingAnswers }));
  const status = document.getElementById("saveStatus"); status.textContent = "Đang lưu..."; setTimeout(() => status.textContent = "Đã tự lưu", 350);
}
const TASK_FALLBACK = {
  "Phonetics": { en: "Choose the word whose underlined part is pronounced differently from the others, or whose stress pattern is different.", vi: "Chọn từ có phần gạch chân phát âm khác, hoặc có trọng âm khác với các từ còn lại." },
  "Grammar and Vocabulary": { en: "Choose the best option (A, B, C or D) to complete each sentence.", vi: "Chọn phương án đúng nhất (A, B, C hoặc D) để hoàn thành câu." },
  "Reading": { en: "Read the passage carefully, then answer the questions below.", vi: "Đọc kỹ đoạn văn rồi trả lời các câu hỏi bên dưới." },
  "Listening": { en: "Listen carefully, then answer the questions.", vi: "Nghe kỹ rồi trả lời các câu hỏi." },
  "Writing": { en: "Write your answer in English. Pay attention to grammar, vocabulary and the required length.", vi: "Viết câu trả lời bằng tiếng Anh, chú ý ngữ pháp, từ vựng và độ dài yêu cầu." },
  "Speaking": { en: "Press the microphone and speak clearly in English.", vi: "Bấm nút micro và nói rõ ràng bằng tiếng Anh." },
};
const TYPE_FALLBACK = {
  multiple_choice: { en: "Choose the best option (A, B, C or D).", vi: "Chọn phương án đúng nhất (A, B, C hoặc D)." },
  short_answer: { en: "Write ONE suitable word or the required form in the blank.", vi: "Điền MỘT từ thích hợp hoặc dạng đúng của từ vào chỗ trống." },
  writing: { en: "Write a complete answer in English.", vi: "Viết câu trả lời hoàn chỉnh bằng tiếng Anh." },
  speaking: { en: "Speak your answer aloud in English.", vi: "Nói câu trả lời của em bằng tiếng Anh." },
};
function taskFor(q) {
  const own = String(q.instruction || "").trim();
  const base = TASK_FALLBACK[q.section] || TYPE_FALLBACK[q.type] || TYPE_FALLBACK.multiple_choice;
  return { text: own || base.en, vi: base.vi, fromPaper: Boolean(own) };
}

function renderQuestion() {
  const q = questions[currentQuestion]; if (!q) return;
  questionCounter.textContent = `Câu ${currentQuestion + 1} / ${questions.length}`;
  document.getElementById("questionType").textContent = q.type === "speaking" ? "Speaking" : q.type === "writing" ? "Writing" : q.type === "short_answer" ? "Điền từ" : "Trắc nghiệm";
  const diffEl = document.getElementById("questionDifficulty");
  diffEl.textContent = `${DIFF_LABEL[q.difficulty] || "TB"} · ~${Math.round((q.suggestedSeconds || 45) / 60 * 10) / 10} phút`;
  diffEl.className = `badge diff-${q.difficulty || "medium"}`;
  document.getElementById("questionSectionTitle").textContent = q.section || "Phần thi";
  document.getElementById("explanationBox").classList.add("hidden");
  let content = "";
  const task = taskFor(q);
  content += `<div class="task-instruction"><i class=mi>assignment</i><div><span>${richText(task.text)}</span><small>${escapeHTML(task.vi)}</small></div></div>`;
  if (q.passage) content += `<div class="reading-passage">${richText(q.passage)}</div>`;
  const sameAsTask = q.instruction && plainText(q.prompt || "").replace(/[^a-z0-9]/gi, "").toLowerCase() === plainText(q.instruction).replace(/[^a-z0-9]/gi, "").toLowerCase();
  content += `<h4>${sameAsTask ? `Câu ${q.number || currentQuestion + 1}` : richText(q.prompt || "")}</h4>`;
  questionContent.innerHTML = content;

  if (q.type === "speaking") {
    renderSpeakingQuestion(q);
  } else if (q.options?.length) {
    answerArea.innerHTML = `<div class="option-list">${q.options.map((opt, i) => `<div class="option ${answers[q.id] === i ? "selected" : ""}" data-option="${i}"><span class="option-marker">${String.fromCharCode(65 + i)}</span><span>${richText(opt.replace(/^[A-D]\.\s*/, ""))}</span></div>`).join("")}</div>`;
    answerArea.querySelectorAll(".option").forEach(el => el.addEventListener("click", () => { answers[q.id] = Number(el.dataset.option); saveAnswers(); renderQuestion(); }));
  } else {
    answerArea.innerHTML = `<textarea class="text-answer" placeholder="${q.type === "writing" ? "Viết bài của em tại đây (giáo viên sẽ chấm)..." : "Nhập câu trả lời của em..."}">${escapeHTML(answers[q.id] || "")}</textarea>`;
    answerArea.querySelector("textarea").addEventListener("input", e => { answers[q.id] = e.target.value; saveAnswers(); renderQuestionGrid(); });
  }
  renderQuestionGrid();
  document.getElementById("quizProgress").style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  document.getElementById("prevQuestion").disabled = currentQuestion === 0;
  document.getElementById("nextQuestion").textContent = currentQuestion === questions.length - 1 ? "Hoàn tất" : "Câu tiếp →";
}
function isAnswered(q) {
  if (q.type === "speaking") return Boolean(speakingAnswers[q.id]);
  return answers[q.id] !== undefined && answers[q.id] !== "";
}
function renderQuestionGrid() {
  questionGrid.innerHTML = questions.map((q, i) => `<button class="q-btn ${i === currentQuestion ? "active" : isAnswered(q) ? "answered" : ""}" data-q="${i}">${i + 1}</button>`).join("");
  questionGrid.querySelectorAll(".q-btn").forEach(btn => btn.addEventListener("click", () => { stopQuizRecognizer(); currentQuestion = Number(btn.dataset.q); renderQuestion(); }));
}
function stopQuizRecognizer() { if (quizRecognizer) { quizRecognizer.abort(); quizRecognizer = null; } }
function renderSpeakingQuestion(q) {
  const done = speakingAnswers[q.id];
  const isFree = q.mode === "free";
  answerArea.innerHTML = `
    <div class="quiz-speaking">
      <p class="small muted">${isFree ? "Hãy trả lời / nói về chủ đề trên bằng tiếng Anh (ít nhất 3 câu). AI chấm theo độ dài và mức bám sát đề bài." : "Đọc to câu trên. AI chấm độ chuẩn phát âm, chấp nhận giọng đọc chưa hoàn hảo."}</p>
      <div class="speaking-controls">
        ${isFree ? "" : `<button type="button" class="btn btn-soft" id="quizSpeakPlay"><i class=mi>volume_up</i> Nghe mẫu</button>`}
        <button type="button" class="btn btn-primary speaking-mic-btn" id="quizSpeakMic"><i class=mi>mic</i> <span id="quizSpeakMicLabel">${done ? "Đọc lại" : "Bắt đầu nói"}</span></button>
      </div>
      <div class="speaking-live hidden" id="quizSpeakLive"></div>
      <div id="quizSpeakResult">${done ? `<div class="quiz-speaking-result"><strong>Độ chuẩn: ${done.accuracy}%</strong><div class="small muted">AI nghe được: "${escapeHTML(done.transcript)}"</div>${done.tip ? `<div class="small" style="margin-top:4px"><i class=mi>lightbulb</i> ${escapeHTML(done.tip)}</div>` : ""}</div>` : ""}</div>
    </div>`;
  document.getElementById("quizSpeakPlay")?.addEventListener("click", () => speakEnglishText(q.target || q.prompt));
  const mic = document.getElementById("quizSpeakMic"), label = document.getElementById("quizSpeakMicLabel"), live = document.getElementById("quizSpeakLive"), resultEl = document.getElementById("quizSpeakResult");
  mic.addEventListener("click", () => {
    if (quizRecognizer) { quizRecognizer.stop(); return; }
    window.speechSynthesis?.cancel();
    quizRecognizer = createRecognizer({
      onInterim: t => { live.classList.remove("hidden"); live.textContent = `Đang nghe: "${t}"`; },
      onError: () => showToast("Micro chưa nhận diện được âm thanh. Hãy nói to hơn nhé!"),
      onEnd: async alternatives => {
        quizRecognizer = null; mic.classList.remove("recording"); label.textContent = "Đọc lại";
        if (!alternatives.length) { showToast("Chưa thu được giọng đọc, thử lại nhé!"); return; }
        resultEl.innerHTML = '<div class="small muted">AI đang chấm...</div>';
        try {
          const res = await apiRequest("/api/speaking/evaluate", { method: "POST", body: JSON.stringify({ target: q.target || q.prompt, alternatives, context: "test", mode: q.mode || "read" }) });
          speakingAnswers[q.id] = { transcript: res.transcript, accuracy: res.accuracy, tip: res.tip };
          saveAnswers();
          resultEl.innerHTML = `<div class="quiz-speaking-result"><strong>Độ chuẩn: ${res.accuracy}% · ${escapeHTML(res.verdict?.label || "")}</strong><div class="small muted">AI nghe được: "${escapeHTML(res.transcript)}"</div>${res.tip ? `<div class="small" style="margin-top:4px"><i class=mi>lightbulb</i> ${escapeHTML(res.tip)}</div>` : ""}</div>`;
          renderQuestionGrid();
        } catch (e) { resultEl.innerHTML = `<div class="small" style="color:red">${escapeHTML(e.message)}</div>`; }
      }
    });
    if (!quizRecognizer) { showToast("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome/Edge."); return; }
    mic.classList.add("recording"); label.textContent = "Hoàn thành & Chấm"; live.classList.remove("hidden"); live.textContent = "Đang lắng nghe...";
    quizRecognizer.start();
  });
}
function startQuizTimer() {
  const timer = document.getElementById("timer");
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    timer.textContent = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
    if (secondsLeft === 0) { clearInterval(timerInterval); timerInterval = null; submitQuiz(); }
  }, 1000);
}
async function startImportedTest(testId) {
  try {
    const data = await apiRequest(`/api/tests/${testId}`);
    activeImportedTest = data.test;
    questions = data.test.sections.flatMap(section => section.questions).map(q => ({ ...q, passage: q.context || "", options: q.options?.map(o => `${o.key}. ${o.text}`) || [] }));
    try { const saved = JSON.parse(localStorage.getItem(getUserStorageKey(`engoAnswers_${testId}`)) || "{}"); answers = saved.answers || {}; speakingAnswers = saved.speakingAnswers || {}; } catch { answers = {}; speakingAnswers = {}; }
    currentQuestion = 0;
    secondsLeft = (data.test.durationMinutes || 45) * 60;
    quizStartedAt = Date.now();
    document.getElementById("quizTitle").textContent = data.test.title;
    document.getElementById("quizSubtitle").textContent = `${questions.length} câu · ${data.test.durationMinutes} phút`;
    document.getElementById("quizVariantBadge").textContent = data.test.variant === "regular" ? "Đề cơ bản (lớp thường)" : data.test.variant === "advanced" ? "Đề nâng cao (lớp tăng cường)" : "";
    document.getElementById("quizTimeHint").textContent = `Gợi ý: ${questions.filter(q => q.difficulty === "hard").length} câu khó — nên làm câu dễ trước.`;
    switchView("quiz"); startAntiCheatGuard(); renderQuestion(); startQuizTimer();
  } catch (error) { showToast(error.message); }
}
document.getElementById("prevQuestion").addEventListener("click", () => { if (currentQuestion > 0) { stopQuizRecognizer(); currentQuestion--; renderQuestion(); } });
document.getElementById("nextQuestion").addEventListener("click", () => { stopQuizRecognizer(); if (currentQuestion < questions.length - 1) { currentQuestion++; renderQuestion(); } else submitQuiz(); });
document.getElementById("submitQuiz").addEventListener("click", () => { if (confirm("Nộp bài ngay?")) submitQuiz(); });
document.getElementById("exitQuiz").addEventListener("click", () => { if (!confirm("Thoát bài? Bài làm được tự lưu để tiếp tục sau.")) return; stopQuizRecognizer(); stopAntiCheatGuard(); if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } switchView("tests"); });

function applyResultScoreUI(scoreVal, isPendingManual = false) {
  const ring = document.getElementById("resultScoreRing"), verdictEl = document.getElementById("resultVerdict"), feedbackEl = document.getElementById("resultFeedback");
  const scoreNum = Number(scoreVal) || 0;
  const percent = Math.min(100, Math.max(0, Math.round((scoreNum / 10) * 100)));
  ring.style.background = `conic-gradient(${scoreNum >= 6 ? "#22c55e" : "#ef4444"} 0 ${percent}%, #e5e7eb ${percent}% 100%)`;
  if (scoreNum < 5) { verdictEl.textContent = "Chưa tốt!"; verdictEl.style.color = "#dc2626"; feedbackEl.textContent = isPendingManual ? "Điểm phần tự động dưới 5. Hãy chờ giáo viên chấm Writing và ôn lại trong Phòng chữa lỗi." : "Kết quả dưới 5 điểm. Hãy xem lại các câu sai bên dưới và luyện lại trong Phòng chữa lỗi."; }
  else if (scoreNum < 6) { verdictEl.textContent = "Cần cố gắng thêm!"; verdictEl.style.color = "#d97706"; feedbackEl.textContent = "Kết quả ở mức trung bình. Ôn lại các câu chưa đúng để nâng điểm nhé."; }
  else { verdictEl.textContent = "Hoàn thành tốt!"; verdictEl.style.color = "#16a34a"; feedbackEl.textContent = isPendingManual ? "Phần tự động làm rất tốt! Điểm tổng kết cập nhật sau khi giáo viên chấm Writing." : "Chúc mừng bạn! Tiếp tục phát huy ở các bài tiếp theo nhé."; }
}
function getViolationPenalty(v) { if (!v || v <= 0) return 0; if (v === 1) return 0.5; if (v === 2) return 1.25; return 2.25; }
let lastTestReview = [];
async function submitQuiz() {
  stopQuizRecognizer(); stopAntiCheatGuard();
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (!activeImportedTest) return;
  const penalty = getViolationPenalty(examTabSwitches);
  const forced = examTabSwitches >= 3;
  const payload = Object.fromEntries(questions.filter(q => q.type !== "speaking").map(q => [q.id, q.options?.length && answers[q.id] !== undefined ? String.fromCharCode(65 + Number(answers[q.id])) : (answers[q.id] ?? "")]));
  try {
    const result = await apiRequest(`/api/tests/${activeImportedTest.id}/submissions`, { method: "POST", body: JSON.stringify({ answers: payload, speakingAnswers, tabViolations: examTabSwitches, violationPenalty: penalty, isForcedSubmit: forced, timeSpentSeconds: Math.round((Date.now() - quizStartedAt) / 1000) }) });
    localStorage.removeItem(getUserStorageKey(`engoAnswers_${activeImportedTest.id}`));
    const scoreOnTen = Number(result.scoreOnTen || 0);
    document.getElementById("finalScore").textContent = result.status === "pending_manual" ? `${scoreOnTen.toFixed(1)}*` : scoreOnTen.toFixed(1);
    document.getElementById("correctCount").textContent = `${Number(result.objectiveScore).toFixed(2)}/${Number(result.objectiveMax).toFixed(2)}`;
    const wrong = (result.review || []).filter(r => !r.correct);
    document.getElementById("wrongCount").textContent = `${wrong.length}/${(result.review || []).length}`;
    document.getElementById("attemptCount").textContent = examTabSwitches > 0 ? `${examTabSwitches} vi phạm (-${penalty}đ)` : "Nghiêm túc";
    applyResultScoreUI(scoreOnTen, result.status === "pending_manual");
    lastTestReview = result.review || [];
    document.getElementById("resultReviewList").innerHTML = wrong.length ? `<h4 style="margin:14px 0 8px">Các câu chưa đúng (${wrong.length})</h4>` + wrong.slice(0, 12).map(r => `<div class="review-item"><div class="small muted">${escapeHTML(r.section)}${r.instruction ? " · " + richText(r.instruction) : ""}</div><div>${richText(r.prompt)}</div><div class="small">Bạn chọn: <b style="color:#dc2626">${escapeHTML(String(r.selected || "—"))}</b> · Đáp án: <b style="color:#16a34a">${richText(String(r.correctAnswer || ""))}</b>${r.aiNote ? `<div class="small muted">AI: ${escapeHTML(r.aiNote)}</div>` : ""}</div></div>`).join("") : '<div class="small" style="color:#16a34a;text-align:center;margin-top:10px"><i class=mi>celebration</i> Không có câu trắc nghiệm nào sai!</div>';
    recordTestErrorsForHealing(wrong, activeImportedTest.title);
    const st = getLearningStats(); st.quizCount = (st.quizCount || 0) + 1; st.bestScore = Math.max(st.bestScore || 0, scoreOnTen); setLearningStats(st);
    gainRewards(scoreOnTen >= 8 ? 40 : 25, scoreOnTen >= 8 ? 3 : 1, "Hoàn thành bài kiểm tra");
    studentProgress = null;
    openModal("resultModal"); showToast(result.message);
    if (scoreOnTen >= 9) cheer("perfect"); else if (scoreOnTen >= 6) cheer("unitDone"); else playSfx("wrong");
  } catch (error) { showToast(error.message); }
}
document.getElementById("gotoHealingRoomBtn")?.addEventListener("click", () => { closeModal("resultModal"); switchView("errorHealing"); });
document.querySelectorAll(".modal-close").forEach(btn => btn.addEventListener("click", () => { closeModal("resultModal"); switchView("results"); }));
setInterval(() => { if (document.getElementById("quiz").classList.contains("active")) saveAnswers(); }, 15000);

let examTabSwitches = 0, antiCheatActive = false, lastViolationTime = 0;
function startAntiCheatGuard() { examTabSwitches = 0; antiCheatActive = true; updateAntiCheatUI(); }
function stopAntiCheatGuard() { antiCheatActive = false; document.getElementById("antiCheatModal")?.classList.add("hidden"); }
function updateAntiCheatUI() { const c = document.getElementById("tabSwitchCounter"); if (c) c.innerHTML = `Lần rời tab: <strong style="color:${examTabSwitches > 0 ? "#dc2626" : "#059669"}">${examTabSwitches}</strong>/3`; }
function handleAntiCheatViolation() {
  if (!antiCheatActive || !document.getElementById("quiz").classList.contains("active")) return;
  const now = Date.now(); if (now - lastViolationTime < 1500) return; lastViolationTime = now;
  examTabSwitches++; updateAntiCheatUI();
  const modal = document.getElementById("antiCheatModal");
  document.getElementById("modalViolationCount").textContent = examTabSwitches;
  const titleEl = document.getElementById("antiCheatModalTitle"), penaltyEl = document.getElementById("modalPenaltyText"), descEl = document.getElementById("antiCheatModalDesc"), dismissBtn = document.getElementById("dismissAntiCheatModal");
 if (examTabSwitches === 1) { titleEl.textContent ="CẢNH BÁO VI PHẠM PHÒNG THI (LẦN 1)"; penaltyEl.textContent ="Bị trừ phạt: -0.50 điểm"; descEl.textContent ="Hệ thống phát hiện bạn vừa chuyển tab hoặc rời khỏi màn hình bài thi!"; dismissBtn.textContent ="Tôi đã hiểu, tiếp tục làm bài"; dismissBtn.disabled = false; }
 else if (examTabSwitches === 2) { titleEl.textContent ="CẢNH BÁO NGHIÊM TRỌNG (LẦN 2)"; penaltyEl.textContent ="Bị trừ phạt: -1.25 điểm"; descEl.textContent ="Nếu rời tab thêm 1 lần nữa, bài thi sẽ bị TỰ ĐỘNG THU!"; dismissBtn.textContent ="Tôi cam kết không chuyển tab nữa"; dismissBtn.disabled = false; }
 else { titleEl.textContent ="ĐÃ ĐẠT GIỚI HẠN VI PHẠM (LẦN 3)"; penaltyEl.textContent ="Bị trừ -2.25 điểm & HỆ THỐNG ĐANG THU BÀI!"; descEl.textContent ="Bạn đã vi phạm 3 lần. Hệ thống tự động nộp bài ngay bây giờ."; dismissBtn.textContent ="Đang nộp bài tự động..."; dismissBtn.disabled = true; modal.classList.remove("hidden"); setTimeout(() => { modal.classList.add("hidden"); submitQuiz(); }, 1200); return; }
  modal.classList.remove("hidden");
}
document.addEventListener("visibilitychange", () => { if (document.hidden) handleAntiCheatViolation(); });
window.addEventListener("blur", handleAntiCheatViolation);
document.getElementById("dismissAntiCheatModal")?.addEventListener("click", () => { if (examTabSwitches < 3) closeModal("antiCheatModal"); });
const quizCardEl = document.getElementById("quizExamCard");
["copy","contextmenu"].forEach(evt => quizCardEl?.addEventListener(evt, e => { if (document.getElementById("quiz").classList.contains("active")) { e.preventDefault(); showToast("Thao tác này bị khóa trong phòng thi!"); } }));

let studentSubmissionsCache = [];
async function renderStudentResults() {
  const tbody = document.getElementById("studentResultsTableBody"); if (!tbody || !currentUser || currentUser.role !== "student") return;
  try {
    const data = await apiRequest("/api/student/results");
    studentSubmissionsCache = data.submissions || [];
    const stats = data.stats || {};
    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt("studentAvgScore", stats.avgScore ? `${stats.avgScore}/10` : "--"); setTxt("studentAccuracy", stats.accuracy ? `${stats.accuracy}%` : "--%");
    setTxt("studentTotalTests", stats.totalTests || 0); setTxt("studentPendingWriting", stats.pendingWriting || 0);
    tbody.innerHTML = studentSubmissionsCache.length ? studentSubmissionsCache.map(item => {
      const isPending = item.status === "pending_manual";
      const writing = item.manualScore !== null ? `<strong style="color:#059669">${Number(item.manualScore).toFixed(2)} đ</strong>${item.teacherFeedback ? `<div class="small" style="color:#64748b;font-style:italic">"${escapeHTML(item.teacherFeedback)}"</div>` : ""}` : '<span class="badge orange">Chờ GV chấm</span>';
      const cls = item.scoreOnTen >= 8 ? "high" : item.scoreOnTen >= 5 ? "mid" : "low";
      return `<tr><td><strong>${escapeHTML(item.testTitle)}</strong><br><span class="small muted">Nộp lúc: ${fmtDate(item.submittedAt, true)}${item.variant && item.variant !== "full" ? ` · Đề ${item.variant === "regular" ? "cơ bản" : "nâng cao"}` : ""}</span></td><td><strong>${Number(item.objectiveScore).toFixed(2)}</strong> / ${Number(item.objectiveMax).toFixed(2)}${item.speakingScore ? `<div class="small muted">Speaking: ${Number(item.speakingScore).toFixed(2)}</div>` : ""}</td><td>${writing}</td><td><strong class="total-score-badge ${cls}">${item.scoreOnTen} / 10</strong></td><td><span class="badge ${isPending ? "orange" : "green"}">${isPending ? "Chờ chấm Writing" : "Đã hoàn thành"}</span></td><td><button class="btn btn-light btn-sm view-student-sub-btn" data-sub-id="${item.id}">Xem bài</button></td></tr>`;
    }).join("") : '<tr><td colspan="6" class="small muted" style="text-align:center;padding:24px">Bạn chưa nộp bài kiểm tra nào.</td></tr>';
    tbody.querySelectorAll(".view-student-sub-btn").forEach(btn => btn.addEventListener("click", () => { const sub = studentSubmissionsCache.find(s => s.id == btn.dataset.subId); if (sub) openSubmissionDetail(sub); }));
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="small muted" style="color:red;text-align:center">${escapeHTML(err.message)}</td></tr>`; }

  const p = await loadStudentProgress(true);
  const spkBody = document.getElementById("studentSpeakingHistoryBody"), vocBody = document.getElementById("studentVocabHistoryBody");
  if (p) {
    const spk = p.events.filter(e => e.type === "speaking");
    spkBody.innerHTML = spk.length ? spk.slice(0, 15).map(e => `<tr><td><strong>${escapeHTML(e.title)}</strong></td><td>GĐ${e.meta?.stage || 1}</td><td><span class="score-pill">${e.score}%</span></td><td class="small muted">${fmtDate(e.createdAt, true)}</td></tr>`).join("") : '<tr><td colspan="4" class="small muted" style="text-align:center;padding:16px">Chưa nộp bài luyện nói nào.</td></tr>';
    const others = p.events.filter(e => e.type === "vocab" || e.type === "healing");
    vocBody.innerHTML = others.length ? others.slice(0, 15).map(e => `<tr><td><strong>${escapeHTML(e.title)}</strong><div class="small muted">${e.type === "vocab" ? "Từ vựng" : "Chữa lỗi"}</div></td><td>${e.type === "vocab" ? `<span class="score-pill">${e.maxScore ? Math.round((e.score / e.maxScore) * 100) : e.score}%</span>` : '<span class="badge green">Đã chữa</span>'}</td><td class="small muted">${fmtDate(e.createdAt, true)}</td></tr>`).join("") : '<tr><td colspan="3" class="small muted" style="text-align:center;padding:16px">Chưa có dữ liệu.</td></tr>';
  }
}

const achievementDefs = [
 { icon:"target", name:"Bước đầu tiên", desc:"Hoàn thành bài kiểm tra đầu tiên", rule: (s, p) => (p?.tests.count || 0) >= 1 || s.quizCount >= 1 },
 { icon:"star", name:"Điểm số nổi bật", desc:"Đạt ít nhất 8 điểm", rule: (s, p) => (p?.tests.bestScore || s.bestScore) >= 8 },
 { icon:"verified", name:"Bài làm hoàn hảo", desc:"Đạt điểm 10", rule: (s, p) => (p?.tests.bestScore || s.bestScore) >= 10 },
 { icon:"mic", name:"Giọng nói tự tin", desc:"Hoàn thành 10 lượt luyện nói", rule: (s, p) => (p?.speaking.totalAttempts || 0) >= 10 },
 { icon:"auto_stories", name:"Kho từ vựng", desc:"Hoàn thành 3 bộ từ vựng", rule: (s, p) => (p?.vocab.setsCompleted || 0) >= 3 },
 { icon:"healing", name:"Tự chữa lành", desc:"Chữa khỏi 3 lỗi", rule: (s, p) => (p?.healing.healed || 0) >= 3 },
 { icon:"bolt", name:"Tích lũy 100 XP", desc:"Đạt tổng cộng 100 XP", rule: s => s.points >= 100 },
 { icon:"emoji_events", name:"Chuỗi 7 ngày", desc:"Học liên tục trong 7 ngày", rule: s => calculateStreakInfo().streak >= 7 }
];
async function renderAchievements() {
  const stats = getLearningStats();
  const p = await loadStudentProgress();
  const level = Math.floor(stats.points / 100) + 1, within = stats.points % 100;
  document.getElementById("achievementLevel").textContent = level;
  document.getElementById("achievementPoints").textContent = `${stats.points} XP`;
  document.getElementById("achievementLevelName").textContent = level >= 5 ? "Bậc thầy ENGO" : level >= 3 ? "Người học kiên trì" : level >= 2 ? "Người học tiến bộ" : "Người học khởi động";
  document.getElementById("achievementProgress").style.width = `${within}%`;
  document.getElementById("achievementProgressText").textContent = `${within}/100 XP đến cấp tiếp theo`;
  const titles = p?.titles || [];
  const earned = titles.filter(t => t.earned);
  document.getElementById("achievementTitleLine").innerHTML = earned.length ? `Danh hiệu của bạn: ${earned.map(titleChip).join(" ")}` : "Chưa có danh hiệu. Hãy luyện nói, làm bài kiểm tra và học từ vựng để mở khóa!";
  document.getElementById("titleCount").textContent = `${earned.length}/${titles.length || 9} đã đạt`;
  document.getElementById("titleGrid").innerHTML = titles.length ? titles.map(t => `<article class="card achievement-card ${t.earned ? "unlocked" : ""}"><div class="achievement-icon"><i class=mi>${escapeHTML(t.icon)}</i></div><h4>${escapeHTML(t.name)}</h4><p>${escapeHTML(t.desc)}</p><span class="achievement-state">${t.earned ? "Đã đạt" : "Chưa đạt"}</span></article>`).join("") : '<div class="empty-state">Không tải được danh hiệu (kiểm tra kết nối).</div>';
  let unlocked = 0;
  document.getElementById("achievementGrid").innerHTML = achievementDefs.map(a => { const ok = a.rule(stats, p); if (ok) unlocked++; return `<article class="card achievement-card ${ok ? "unlocked" : ""}"><div class="achievement-icon"><i class=mi>${a.icon}</i></div><h4>${a.name}</h4><p>${a.desc}</p><span class="achievement-state">${ok ? "Đã mở khóa" : "Chưa mở khóa"}</span></article>`; }).join("");
  document.getElementById("achievementCount").textContent = `${unlocked}/${achievementDefs.length} đã mở khóa`;
}

const flashDecks = window.ENGO_VOCAB_DECKS || {};
const POS_LABEL = { n: "danh từ", v: "động từ", adj: "tính từ", adv: "trạng từ", phr: "cụm từ", "phr v": "cụm động từ", modal: "động từ khuyết thiếu", "v/n": "động từ / danh từ" };
let activeDeck = Object.keys(flashDecks)[0] || "unit1", flashOrder = [], flashIndex = 0, flashViewed = new Set();
function getVocabRecords() { try { return JSON.parse(localStorage.getItem(getUserStorageKey("engoVocabV1")) || "{}"); } catch { return {}; } }
function setVocabRecords(r) { localStorage.setItem(getUserStorageKey("engoVocabV1"), JSON.stringify(r)); }
function currentFlash() { return flashDecks[activeDeck].cards[flashOrder[flashIndex]]; }
function resetFlashOrder() { flashOrder = flashDecks[activeDeck].cards.map((_, i) => i); flashIndex = 0; flashViewed = new Set([0]); renderFlashcard(); }
function renderVocabDecks() {
  const list = document.getElementById("deckList"); if (!list) return;
  const records = getVocabRecords();
  list.innerHTML = Object.entries(flashDecks).map(([key, deck]) => {
    const rec = records[key];
    return `<button class="deck-item ${key === activeDeck ? "active" : ""}" data-deck="${key}"><div><strong>${escapeHTML(deck.name)}</strong><span>${deck.cards.length} từ${rec ? ` · Tốt nhất ${rec.best}%` : ""}</span></div><b>${rec && rec.best >= 80 ? "<i class=mi>check</i>" : "→"}</b></button>`;
  }).join("");
  list.querySelectorAll("[data-deck]").forEach(btn => btn.addEventListener("click", () => { activeDeck = btn.dataset.deck; exitVocabQuiz(); resetFlashOrder(); renderVocabDecks(); }));
}
function renderFlashcard() {
  const deck = flashDecks[activeDeck], card = currentFlash(); if (!card) return;
  document.getElementById("flashcardInner").classList.remove("flipped");
  document.getElementById("flashDeckName").textContent = deck.name;
  document.getElementById("flashProgressText").textContent = `Thẻ ${flashIndex + 1} / ${deck.cards.length}`;
  document.getElementById("flashProgressBar").style.width = `${((flashIndex + 1) / deck.cards.length) * 100}%`;
  document.getElementById("flashWord").textContent = card.word;
  document.getElementById("flashWordBack").textContent = card.word;
  const flashImg = (window.ENGO_VOCAB_IMAGES || {})[card.word] || "";
  document.querySelectorAll(".flash-img").forEach(el => { el.src = flashImg; el.classList.toggle("hidden", !flashImg); });
  document.getElementById("flashPhonetic").textContent = card.phonetic;
  document.getElementById("flashPos").textContent = card.pos; document.getElementById("flashPos").title = POS_LABEL[card.pos] || card.pos;
  document.getElementById("flashPosBack").textContent = `${card.pos} · ${POS_LABEL[card.pos] || ""}`;
  document.getElementById("flashMeaning").textContent = card.meaning;
  document.getElementById("flashExamples").innerHTML = (card.examples || []).map(ex => `<li><span>${escapeHTML(ex).replace(new RegExp(`(${card.word.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*)`, "i"), "<mark>$1</mark>")}</span><button type="button" class="flash-tts-mini" data-tts="${escapeHTML(ex)}" title="Nghe câu ví dụ"><i class=mi>volume_up</i></button></li>`).join("");
  document.querySelectorAll("#flashExamples [data-tts]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); speakEnglishText(b.dataset.tts, { rate: 0.9 }); }));
  flashViewed.add(flashOrder[flashIndex]);
  const viewedAll = flashViewed.size >= deck.cards.length;
  document.getElementById("flashViewedText").textContent = `Đã xem ${flashViewed.size}/${deck.cards.length} thẻ${viewedAll ? " — sẵn sàng kiểm tra!" : ""}`;
  document.querySelectorAll(".vocab-modes .btn").forEach(b => { b.disabled = !viewedAll; });
}
function flipFlash() { document.getElementById("flashcardInner").classList.toggle("flipped"); }
document.getElementById("flashcardShell").addEventListener("click", e => { if (!e.target.closest("button")) flipFlash(); });
document.getElementById("flashFlip").addEventListener("click", flipFlash);
document.getElementById("flashcardShell").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipFlash(); } });
document.getElementById("flashPrev").addEventListener("click", () => { flashIndex = (flashIndex - 1 + flashOrder.length) % flashOrder.length; renderFlashcard(); });
document.getElementById("flashNext").addEventListener("click", () => { flashIndex = (flashIndex + 1) % flashOrder.length; renderFlashcard(); });
document.getElementById("shuffleCards").addEventListener("click", () => { flashOrder.sort(() => Math.random() - 0.5); flashIndex = 0; renderFlashcard(); showToast("Đã trộn thứ tự thẻ"); });
document.getElementById("restartCards").addEventListener("click", () => { exitVocabQuiz(); resetFlashOrder(); });
document.getElementById("flashTtsFront").addEventListener("click", e => { e.stopPropagation(); speakEnglishText(currentFlash().word, { rate: 0.8 }); });

let vocabQuiz = null;
function shuffleArray(array) { const c = [...array]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }
function exitVocabQuiz() { vocabQuiz = null; document.getElementById("vocabQuizStage").classList.add("hidden"); document.getElementById("flashcardStage").classList.remove("hidden"); }
document.getElementById("exitVocabQuiz").addEventListener("click", exitVocabQuiz);
document.getElementById("startVocabQuizMc").addEventListener("click", () => startVocabQuiz("mc"));
document.getElementById("startVocabQuizMatch").addEventListener("click", () => startVocabQuiz("match"));
document.getElementById("startVocabQuizListen")?.addEventListener("click", () => startVocabQuiz("listen"));
document.getElementById("startVocabQuizSpell")?.addEventListener("click", () => startVocabQuiz("spell"));
document.getElementById("startVocabQuizImage")?.addEventListener("click", () => startVocabQuiz("image"));
document.getElementById("startVocabQuizGap")?.addEventListener("click", () => startVocabQuiz("gap"));
function vocabImage(word) {
  const map = window.ENGO_VOCAB_IMAGES || {};
  const w = String(word || "").toLowerCase().trim();
  if (map[w]) return map[w];
  const base = w.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
  return map[base] || "";
}
window.practiceVocabUnit = function (unit, mode) {
  const key = "unit" + unit;
  if (flashDecks[key]) { activeDeck = key; resetFlashOrder(); renderVocabDecks(); flashOrder.forEach((_, i) => flashViewed.add(i)); }
  startVocabQuiz(mode || "mc");
};
function startVocabQuiz(mode) {
  const deck = flashDecks[activeDeck];
  let pool = deck.cards;
  if (mode === "image") pool = deck.cards.filter(c => vocabImage(c.word));
  if (mode === "gap") pool = deck.cards.filter(c => (c.examples || []).some(e => new RegExp("\\b" + c.word.split(" ")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(e)));
  const MIN = mode === "image" ? 4 : mode === "gap" ? 3 : 2;
  if (pool.length < MIN) {
    showToast(mode === "image" ? "Bộ từ này chưa đủ ảnh minh hoạ, hãy thử dạng khác nhé." : "Bộ từ này chưa đủ câu ví dụ, hãy thử dạng khác nhé.");
    return;
  }
  const LIMIT = mode === "match" ? 8 : 12;
  const picked = shuffleArray(pool).slice(0, Math.min(LIMIT, pool.length));
  vocabQuiz = { mode, deck, cards: picked, index: 0, correct: 0, total: picked.length, matches: {} };
  document.getElementById("flashcardStage").classList.add("hidden");
  const stage = document.getElementById("vocabQuizStage");
  stage.classList.remove("hidden");
  document.getElementById("vocabQuizDeckName").textContent = deck.name;
  setTimeout(() => { const y = stage.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: y, behavior: "instant" }); }, 60);
  const TITLES = { mc: "Trắc nghiệm nghĩa của từ", match: "Nối từ với nghĩa", listen: "Nghe và chọn từ đúng", spell: "Nghe và viết lại từ", image: "Nhìn hình đoán từ", gap: "Điền từ vào câu" };
  document.getElementById("vocabQuizTitle").textContent = TITLES[mode] || "Kiểm tra từ vựng";
  if (mode === "match") renderVocabMatch();
  else if (mode === "spell") renderVocabSpell();
  else if (mode === "gap") renderVocabGap();
  else renderVocabMcQuestion();
}
function renderVocabMcQuestion() {
  const q = vocabQuiz; const body = document.getElementById("vocabQuizBody");
  document.getElementById("vocabQuizProgress").style.width = `${(q.index / q.total) * 100}%`;
  if (q.index >= q.total) return finishVocabQuiz();
  const card = q.cards[q.index];
  const askMeaning = q.mode === "mc" ? Math.random() < 0.6 : false;
  const distractors = shuffleArray(q.deck.cards.filter(c => c !== card)).slice(0, 3);
  const options = shuffleArray([card, ...distractors]);
  const img = q.mode === "image" ? vocabImage(card.word) : "";
  const head = q.mode === "listen"
    ? `<h3 style="margin:8px 0 14px;font-size:22px">Nghe rồi chọn từ em vừa nghe <button type="button" class="btn btn-primary btn-sm" id="vqTts"><i class=mi>volume_up</i> Nghe lại</button></h3>`
    : q.mode === "image"
    ? `<h3 style="margin:8px 0 10px;font-size:22px">Bức ảnh này nói về từ nào?</h3><img class="vq-image" src="${escapeHTML(img)}" alt="">`
    : `<h3 style="margin:8px 0 14px;font-size:22px">${askMeaning ? `"${escapeHTML(card.word)}" <span class="flash-pos">${card.pos}</span> nghĩa là gì?` : `Từ nào có nghĩa "${escapeHTML(card.meaning)}"?`} <button type="button" class="btn btn-soft btn-sm" id="vqTts"><i class=mi>volume_up</i></button></h3>`;
  body.innerHTML = `<div class="small muted">Câu ${q.index + 1}/${q.total}</div>
    ${head}
    <div class="option-list">${options.map((o, i) => `<div class="option" data-word="${escapeHTML(o.word)}"><span class="option-marker">${String.fromCharCode(65 + i)}</span><span>${escapeHTML(askMeaning ? o.meaning : o.word)}</span></div>`).join("")}</div>
    <div class="explanation hidden" id="vqExplain"></div>
    <button class="btn btn-primary hidden" id="vqNext" style="margin-top:12px">Câu tiếp →</button>`;
  document.getElementById("vqTts")?.addEventListener("click", () => speakEnglishText(card.word, { rate: 0.8 }));
  if (q.mode === "listen") setTimeout(() => speakEnglishText(card.word, { rate: 0.75 }), 350);
  body.querySelectorAll(".option").forEach(el => el.addEventListener("click", () => {
    if (body.dataset.locked) return; body.dataset.locked = "1";
    const right = el.dataset.word === card.word;
    body.querySelectorAll(".option").forEach(o => { if (o.dataset.word === card.word) o.classList.add("correct"); });
    if (right) { q.correct++; playSfx("correct"); } else { el.classList.add("wrong"); playSfx("wrong"); }
    const ex = document.getElementById("vqExplain"); ex.classList.remove("hidden");
    ex.innerHTML = `<strong>${right ? "<i class=mi>check</i> Chính xác!" : "<i class=mi>close</i> Chưa đúng."}</strong> <b>${escapeHTML(card.word)}</b> (${card.pos}) ${card.phonetic}: ${escapeHTML(card.meaning)}<br><em>${escapeHTML(card.examples?.[0] || "")}</em>`;
    document.getElementById("vqNext").classList.remove("hidden");
  }));
  document.getElementById("vqNext").addEventListener("click", () => { delete body.dataset.locked; q.index++; renderVocabMcQuestion(); });
}
function renderVocabSpell() {
  const q = vocabQuiz, body = document.getElementById("vocabQuizBody");
  document.getElementById("vocabQuizProgress").style.width = `${(q.index / q.total) * 100}%`;
  if (q.index >= q.total) return finishVocabQuiz();
  const card = q.cards[q.index];
  const hint = card.word.replace(/[A-Za-z]/g, (ch, i) => (i === 0 || i === card.word.length - 1 ? ch : "_"));
  body.innerHTML = `<div class="small muted">Câu ${q.index + 1}/${q.total}</div>
    <h3 style="margin:8px 0 6px;font-size:22px">Nghe rồi viết lại từ <button type="button" class="btn btn-primary btn-sm" id="vqTts"><i class=mi>volume_up</i> Nghe</button></h3>
    <p class="muted" style="margin:0 0 12px">Nghĩa: <b>${escapeHTML(card.meaning)}</b> · Gợi ý: <code class="vq-hint">${escapeHTML(hint)}</code></p>
    <input class="text-answer vq-spell" id="vqSpell" placeholder="Viết từ em nghe được..." autocomplete="off" spellcheck="false">
    <div class="explanation hidden" id="vqExplain"></div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-primary" id="vqCheck">Kiểm tra</button>
      <button class="btn btn-light hidden" id="vqNext">Câu tiếp →</button>
    </div>`;
  const input = document.getElementById("vqSpell");
  const say = () => speakEnglishText(card.word, { rate: 0.75 });
  document.getElementById("vqTts").addEventListener("click", say);
  setTimeout(() => { input.focus(); say(); }, 300);
  const check = () => {
    if (body.dataset.locked) return; body.dataset.locked = "1";
    const right = input.value.trim().toLowerCase() === card.word.toLowerCase();
    if (right) { q.correct++; playSfx("correct"); } else playSfx("wrong");
    input.classList.add(right ? "ok" : "bad");
    const ex = document.getElementById("vqExplain"); ex.classList.remove("hidden");
    ex.innerHTML = `<strong>${right ? "<i class=mi>check</i> Chính xác!" : "<i class=mi>close</i> Đáp án đúng: "}</strong> <b>${escapeHTML(card.word)}</b> ${escapeHTML(card.phonetic || "")} — ${escapeHTML(card.meaning)}`;
    document.getElementById("vqCheck").classList.add("hidden");
    document.getElementById("vqNext").classList.remove("hidden");
  };
  document.getElementById("vqCheck").addEventListener("click", check);
  input.addEventListener("keydown", e => { if (e.key === "Enter") (body.dataset.locked ? document.getElementById("vqNext").click() : check()); });
  document.getElementById("vqNext").addEventListener("click", () => { delete body.dataset.locked; q.index++; renderVocabSpell(); });
}

function renderVocabGap() {
  const q = vocabQuiz, body = document.getElementById("vocabQuizBody");
  document.getElementById("vocabQuizProgress").style.width = `${(q.index / q.total) * 100}%`;
  if (q.index >= q.total) return finishVocabQuiz();
  const card = q.cards[q.index];
  const head = card.word.split(" ")[0];
  const re = new RegExp("\\b" + head.replace(/[.*+?^${}()|[\]\\]/g, "\\function renderVocabMatch() {") + "\\w*", "i");
  const sentence = (card.examples || []).find(e => re.test(e)) || "";
  const masked = escapeHTML(sentence).replace(re, "_____");
  const options = shuffleArray([card, ...shuffleArray(q.deck.cards.filter(c => c !== card)).slice(0, 3)]);
  body.innerHTML = `<div class="small muted">Câu ${q.index + 1}/${q.total}</div>
    <h3 style="margin:8px 0 12px;font-size:20px">Chọn từ điền vào chỗ trống</h3>
    <div class="reading-passage vq-sentence">${masked}</div>
    <p class="muted small" style="margin:8px 0 12px">Gợi ý nghĩa của câu: ${escapeHTML(card.exampleVi || card.meaning)}</p>
    <div class="option-list">${options.map((o, i) => `<div class="option" data-word="${escapeHTML(o.word)}"><span class="option-marker">${String.fromCharCode(65 + i)}</span><span>${escapeHTML(o.word)}</span></div>`).join("")}</div>
    <div class="explanation hidden" id="vqExplain"></div>
    <button class="btn btn-primary hidden" id="vqNext" style="margin-top:12px">Câu tiếp →</button>`;
  body.querySelectorAll(".option").forEach(el => el.addEventListener("click", () => {
    if (body.dataset.locked) return; body.dataset.locked = "1";
    const right = el.dataset.word === card.word;
    body.querySelectorAll(".option").forEach(o => { if (o.dataset.word === card.word) o.classList.add("correct"); });
    if (right) { q.correct++; playSfx("correct"); } else { el.classList.add("wrong"); playSfx("wrong"); }
    const ex = document.getElementById("vqExplain"); ex.classList.remove("hidden");
    ex.innerHTML = `<strong>${right ? "<i class=mi>check</i> Chính xác!" : "<i class=mi>close</i> Chưa đúng."}</strong> <em>${escapeHTML(sentence)}</em>`;
    speakEnglishText(sentence, { rate: 0.85 });
    document.getElementById("vqNext").classList.remove("hidden");
  }));
  document.getElementById("vqNext").addEventListener("click", () => { delete body.dataset.locked; q.index++; renderVocabGap(); });
}

function renderVocabMatch() {
  const q = vocabQuiz; const body = document.getElementById("vocabQuizBody");
  const words = q.cards, meanings = shuffleArray(q.cards);
  body.innerHTML = `<p class="small muted">Chọn một từ bên trái rồi chọn nghĩa tương ứng bên phải. Nối đúng ${q.total} cặp để hoàn thành.</p>
    <div class="match-grid"><div class="match-col" id="matchWords">${words.map(c => `<button type="button" class="match-item" data-word="${escapeHTML(c.word)}"><span>${escapeHTML(c.word)}</span><small>${c.pos}</small></button>`).join("")}</div>
    <div class="match-col" id="matchMeanings">${meanings.map(c => `<button type="button" class="match-item" data-meaning="${escapeHTML(c.word)}">${escapeHTML(c.meaning)}</button>`).join("")}</div></div>
    <div class="small muted" style="margin-top:10px" id="matchStatus">Đã nối 0/${q.total} · Sai: 0</div>`;
  let selectedWord = null, wrongCount = 0, done = 0;
  document.getElementById("vocabQuizProgress").style.width = "0%";
  body.querySelectorAll("#matchWords .match-item").forEach(b => b.addEventListener("click", () => {
    if (b.classList.contains("done")) return;
    body.querySelectorAll("#matchWords .match-item").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected"); selectedWord = b;
  }));
  body.querySelectorAll("#matchMeanings .match-item").forEach(b => b.addEventListener("click", () => {
    if (!selectedWord || b.classList.contains("done")) return;
    if (b.dataset.meaning === selectedWord.dataset.word) {
      b.classList.add("done"); selectedWord.classList.add("done"); selectedWord.classList.remove("selected"); selectedWord = null; done++; playSfx("coin");
    } else { wrongCount++; b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 500); playWrongSound(); }
    document.getElementById("matchStatus").textContent = `Đã nối ${done}/${q.total} · Sai: ${wrongCount}`;
    document.getElementById("vocabQuizProgress").style.width = `${(done / q.total) * 100}%`;
    if (done === q.total) { q.correct = Math.max(0, q.total - Math.floor(wrongCount / 2)); setTimeout(finishVocabQuiz, 500); }
  }));
}
async function finishVocabQuiz() {
  const q = vocabQuiz; if (!q) return;
  const percent = Math.round((q.correct / q.total) * 100);
  const good = percent >= 80;
  const records = getVocabRecords();
  records[activeDeck] = { best: Math.max(percent, records[activeDeck]?.best || 0), last: percent, at: new Date().toISOString() };
  setVocabRecords(records);
  gainRewards(good ? 30 : 10, good ? 3 : 0, `Hoàn thành bộ ${q.deck.name}`);
  const st = getLearningStats(); st.vocabSets = (st.vocabSets || 0) + 1; setLearningStats(st);
  try { await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type: "vocab", refId: activeDeck, title: q.deck.name, score: q.correct, maxScore: q.total, meta: { mode: q.mode, percent } }) }); studentProgress = null; } catch (e) {}
  document.getElementById("vocabQuizProgress").style.width = "100%";
  document.getElementById("vocabQuizBody").innerHTML = `<div style="text-align:center;padding:20px 0">
    <div class="result-score" style="background:conic-gradient(${good ? "#22c55e" : "#f59e0b"} 0 ${percent}%, #e5e7eb ${percent}% 100%)"><div><strong>${percent}%</strong><span class="small muted">đúng</span></div></div>
    <h3 style="margin:0 0 6px">${good ? "<i class=mi>celebration</i> Xuất sắc! Bạn đã thuộc bộ từ này" : "<i class=mi>thumb_up</i> Hoàn thành! Ôn lại các từ chưa nhớ nhé"}</h3>
    <p class="muted">Đúng ${q.correct}/${q.total} · Thưởng ${good ? "+30 XP & +3 <i class=ico-carrot></i>" : "+10 XP"}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px"><button class="btn btn-light" id="vqRetry">Học lại bộ thẻ</button><button class="btn btn-primary" id="vqOther">Làm dạng ${q.mode === "mc" ? "nối từ" : "trắc nghiệm"}</button></div></div>`;
  if (percent === 100) cheer("perfect"); else if (good) cheer("unitDone"); else playSfx("taskDone");
  document.getElementById("vqRetry").addEventListener("click", () => { exitVocabQuiz(); resetFlashOrder(); });
  document.getElementById("vqOther").addEventListener("click", () => startVocabQuiz(q.mode === "mc" ? "match" : "mc"));
  renderVocabDecks();
}

let speakingTasks = [];
let speakingProgressData = null;
let activeSpeakingTask = null, activeItemIndex = 0, speakingItemResults = {};
let speakingRecognizer = null, lastSpeakingEvaluation = null;
let speakingRole = "A";
let ttsAutoTimer = null;

function buildSpeakingTasks(apiAssignments, progress) {
  const system = (window.ENGO_SPEAKING_SETS || []).map(s => ({ ...s, source: s.unit ? `Hệ thống · Unit ${s.unit}` : "Hệ thống", teacherName: "ENGO", progress: null }));
  const teacher = (apiAssignments || []).map(a => ({ id: `t-${a.id}`, assignmentId: a.id, title: a.title, stage: a.stage, system: false, source: a.teacherName || "Giáo viên", className: a.className, situation: a.translation && a.stage === 2 ? a.translation : "", items: a.items || [], progress: a.progress || null, unitTitle: a.unitTitle }));

  const local = getLocalSpeakingRecords();
  system.forEach(s => { if (local[s.id]) s.progress = local[s.id]; });
  return [...teacher, ...system].sort((a, b) => a.stage - b.stage);
}
function getLocalSpeakingRecords() { try { return JSON.parse(localStorage.getItem(getUserStorageKey("engoSpeakingLocalV1")) || "{}"); } catch { return {}; } }
function setLocalSpeakingRecord(id, rec) { const all = getLocalSpeakingRecords(); all[id] = rec; localStorage.setItem(getUserStorageKey("engoSpeakingLocalV1"), JSON.stringify(all)); }
function stageUnlocked(stage) {
  if (stage === 1) return true;
  const s1 = speakingProgressData?.stages?.[1];
  const local = Object.values(getLocalSpeakingRecords()).filter(r => r.stage === 1);
  const localAvg = local.length ? local.reduce((s, r) => s + r.best, 0) / local.length : 0;
  return Boolean((s1 && (s1.unlocked || (s1.attempts >= 3 && s1.avgAccuracy >= 70))) || (local.length >= 2 && localAvg >= 70) || speakingProgressData?.stages?.[2]?.attempts);
}
async function renderSpeakingLab() {
  if (!currentUser || currentUser.role !== "student") return;
  renderCapybaraCompanion();
  const tbody = document.getElementById("speakingTableBody");
  try {
    const res = await apiRequest("/api/speaking/assignments");
    speakingProgressData = res.progress || null;
    speakingTasks = buildSpeakingTasks(res.assignments, res.progress);
  } catch (e) {
    speakingProgressData = null; speakingTasks = buildSpeakingTasks([], null);
  }
  const stageGrid = document.getElementById("speakingStageGrid");
  stageGrid.innerHTML = [1, 2].map(stage => {
    const st = speakingProgressData?.stages?.[stage] || { attempts: 0, avgAccuracy: 0, bestAccuracy: 0, improvement: 0 };
    const unlocked = stageUnlocked(stage);
    const tasks = speakingTasks.filter(t => t.stage === stage);
    const done = tasks.filter(t => t.progress && t.progress.best > 0).length;
    return `<div class="stage-card ${unlocked ? "" : "locked"}">
      <div class="stage-card-head"><span class="badge ${stage === 1 ? "green" : "orange"}">Giai đoạn ${stage}</span><strong>${stage === 1 ? "Câu đơn theo chủ đề" : "Hội thoại theo SGK"}</strong>${unlocked ? "" : '<span class="small" style="color:#dc2626"><i class=mi>lock</i> Hoàn thành ≥3 lượt GĐ1 với TB ≥70% để mở khóa</span>'}</div>
      <div class="stage-metrics"><div><b>${st.attempts ? st.avgAccuracy + "%" : "--"}</b><span>Trung bình</span></div><div><b>${st.bestAccuracy || 0}%</b><span>Tốt nhất</span></div><div><b>${st.attempts || 0}</b><span>Lượt đọc</span></div><div><b>${done}/${tasks.length}</b><span>Bài đã luyện</span></div></div>
      <div class="progress"><span style="width:${Math.min(100, st.avgAccuracy || 0)}%"></span></div>
      <div class="small muted">${st.improvement ? `Tiến bộ ${st.improvement > 0 ? "▲ +" : "▼ "}${st.improvement}% so với những lượt đầu` : "Luyện đều để thấy tiến bộ theo thời gian"}</div>
    </div>`;
  }).join("");
  renderSpeakingTable();
}
function renderSpeakingTable() {
  const tbody = document.getElementById("speakingTableBody");
  const filter = document.getElementById("speakingStageFilter")?.value || "";
  const unitFilter = document.getElementById("speakingUnitFilter")?.value || "";
  const unitSel = document.getElementById("speakingUnitFilter");
  if (unitSel && unitSel.options.length <= 1) unitSel.innerHTML = '<option value="">Tất cả Unit</option>' + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Unit ${i + 1}</option>`).join("") + '<option value="teacher">Bài giáo viên giao</option>';
  const list = speakingTasks.filter(t => (!filter || String(t.stage) === filter) && (!unitFilter || (unitFilter === "teacher" ? !t.system : String(t.unit || "") === unitFilter)));
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="small muted" style="text-align:center;padding:24px">Chưa có bài luyện nói.</td></tr>'; return; }
  tbody.innerHTML = list.map((t, idx) => {
    const unlocked = stageUnlocked(t.stage);
    const best = t.progress?.best || 0;
    const prog = best ? `<div class="mini-progress"><span style="width:${best}%"></span></div><span class="small">${best}% tốt nhất · ${t.progress?.attempts || 1} lượt</span>` : '<span class="small muted">Chưa luyện</span>';
    return `<tr class="${activeSpeakingTask && activeSpeakingTask.id === t.id ? "row-active" : ""}"><td>${idx + 1}</td><td><strong>${escapeHTML(t.title)}</strong>${t.unitTitle ? `<div class="small muted">${escapeHTML(t.unitTitle)}</div>` : ""}${t.className ? `<div class="small muted">Lớp ${escapeHTML(t.className)}</div>` : ""}</td><td>${t.unit ? `<span class="badge">U${t.unit}</span>` : '<span class="small muted">—</span>'}</td><td><span class="badge ${t.stage === 1 ? "green" : "orange"}">GĐ${t.stage} · ${t.stage === 1 ? "Câu đơn" : "Hội thoại"}</span></td><td class="small">${escapeHTML(t.source)}</td><td>${t.items.length} câu</td><td>${prog}</td><td><button class="btn ${best ? "btn-light" : "btn-primary"} btn-sm open-speaking-task" data-task-id="${t.id}" ${unlocked ? "" : "disabled title='Giai đoạn chưa mở khóa'"}>${best ? "Luyện lại" : "Luyện"}</button></td></tr>`;
  }).join("");
  tbody.querySelectorAll(".open-speaking-task").forEach(b => b.addEventListener("click", () => openSpeakingTask(b.dataset.taskId)));
}
document.getElementById("speakingStageFilter")?.addEventListener("change", renderSpeakingTable);
document.getElementById("speakingUnitFilter")?.addEventListener("change", renderSpeakingTable);
document.getElementById("refreshSpeakingBtn")?.addEventListener("click", () => { renderSpeakingLab(); showToast("Đã làm mới."); });

function openSpeakingTask(taskId) {
  const task = speakingTasks.find(t => t.id === taskId); if (!task) return;
  activeSpeakingTask = task; activeItemIndex = 0; speakingItemResults = {};
  const panel = document.getElementById("speakingPracticePanel");
  panel.classList.remove("hidden");
  document.getElementById("speakingSummary").classList.add("hidden");
  document.getElementById("speakingTopicTag").textContent = `Giai đoạn ${task.stage} · ${task.stage === 1 ? "Câu đơn" : "Hội thoại"}`;
  document.getElementById("speakingTaskTitle").textContent = task.title;
  document.getElementById("speakingTaskSubtitle").textContent = task.situation || (task.stage === 1 ? "Đọc từng câu, từ dễ đến khó." : "Đọc lần lượt từng lời thoại theo đúng vai.");
  renderSpeakingTable();
  renderSpeakingItem();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.getElementById("closeSpeakingPractice").addEventListener("click", () => { clearTimeout(ttsAutoTimer); window.speechSynthesis?.cancel(); stopSpeakingRecording(false); activeSpeakingTask = null; document.getElementById("speakingPracticePanel").classList.add("hidden"); renderSpeakingTable(); });
function renderSpeakingItem() {
  stopSpeakingRecording(false); window.speechSynthesis?.cancel();
  const task = activeSpeakingTask; if (!task) return;
  const item = task.items[activeItemIndex]; if (!item) return;
  const n = task.items.length;
  document.getElementById("speakingCounter").textContent = `Câu ${activeItemIndex + 1} / ${n}`;
  document.getElementById("speakingItemProgress").style.width = `${(Object.values(speakingItemResults).filter(r => r && !r.tts).length / Math.max(1, task.items.filter(l => !(task.stage === 2 && task.items.some(x => x.speaker)) || (l.speaker || "A") === speakingRole).length)) * 100}%`;
  const speakerEl = document.getElementById("speakingSpeaker");
  const isDialogue = task.stage === 2 && task.items.some(l => l.speaker);
  const speakers = isDialogue ? [...new Set(task.items.map(l => l.speaker || "A"))] : [];
  const mine = !isDialogue || (item.speaker || "A") === speakingRole;
  if (isDialogue) {
    speakerEl.innerHTML = `<span class="role-pick">Bạn đóng vai: ${speakers.map(sp => `<button type="button" class="btn btn-sm ${sp === speakingRole ? "btn-primary" : "btn-light"}" data-role="${escapeHTML(sp)}">${escapeHTML(sp)}</button>`).join("")}</span><span class="role-now ${mine ? "" : "tts"}">${mine ? `<i class=mi>mic</i> Vai ${escapeHTML(item.speaker || "A")} — đến lượt bạn đọc` : `<i class=mi>volume_up</i> Vai ${escapeHTML(item.speaker)} — máy đọc, bạn lắng nghe`}</span>`;
    speakerEl.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => { speakingRole = b.dataset.role; clearTimeout(ttsAutoTimer); renderSpeakingItem(); }));
  } else speakerEl.textContent = item.speaker ? `Vai ${item.speaker}` : "";
  document.getElementById("speakingMicBtn").disabled = !mine;
  document.getElementById("speakingRetryBtn").disabled = !mine;
  clearTimeout(ttsAutoTimer);
  if (!mine) {
    speakingItemResults[activeItemIndex] = { tts: true };
    ttsAutoTimer = setTimeout(() => speakEnglishText(item.text, { rate: 0.9, onDone: () => { ttsAutoTimer = setTimeout(() => { if (activeSpeakingTask === task && activeItemIndex < task.items.length - 1) { activeItemIndex++; renderSpeakingItem(); } }, 700); } }), 350);
  }
  document.getElementById("speakingTargetText").textContent = item.text;
  document.getElementById("speakingIpa").textContent = item.ipa || "";
  document.getElementById("speakingMeaning").textContent = item.meaning ? `"${item.meaning}"` : "";
  const focusEl = document.getElementById("speakingFocus");
 focusEl.textContent = item.focus ?`${item.focus}`:""; focusEl.classList.toggle("hidden", !item.focus);
  const script = document.getElementById("dialogueScript");
  if (task.stage === 2) {
    script.classList.remove("hidden");
    script.innerHTML = task.items.map((l, i) => { const r = speakingItemResults[i]; const sp = l.speaker || (i % 2 ? "B" : "A"); return `<div class="dialogue-line ${i === activeItemIndex ? "current" : ""} ${r && !r.tts ? "done" : ""} ${sp !== speakingRole ? "machine" : ""}" data-idx="${i}"><b>${escapeHTML(sp)}:</b> ${escapeHTML(l.text)} ${r && !r.tts ? `<span class="small">${r.accuracy}%</span>` : sp !== speakingRole ? '<span class="small muted"><i class=mi>volume_up</i></span>' : ""}</div>`; }).join("");
    script.querySelectorAll(".dialogue-line").forEach(l => l.addEventListener("click", () => { activeItemIndex = Number(l.dataset.idx); renderSpeakingItem(); }));
  } else script.classList.add("hidden");
  document.getElementById("speakingResultBox").classList.add("hidden");
  document.getElementById("speakingWave").classList.add("hidden");
  const prev = speakingItemResults[activeItemIndex];
  if (prev && !prev.tts) showSpeakingResult(prev, item);
  document.getElementById("speakingPrevBtn").disabled = activeItemIndex === 0;
  document.getElementById("speakingNextBtn").textContent = activeItemIndex === n - 1 ? "Hoàn thành bài →" : "Câu tiếp theo →";
}
function stopSpeakingRecording(shouldGrade) {
  if (speakingRecognizer) { if (shouldGrade) speakingRecognizer.stop(); else speakingRecognizer.abort(); if (!shouldGrade) speakingRecognizer = null; }
  const micBtn = document.getElementById("speakingMicBtn"); micBtn?.classList.remove("recording");
  const label = document.getElementById("speakingMicLabel"); if (label) label.textContent = "Bắt đầu nói";
  if (!shouldGrade) document.getElementById("speakingWave")?.classList.add("hidden");
}
document.getElementById("speakingPlayAudioBtn").addEventListener("click", () => {
  const item = activeSpeakingTask?.items[activeItemIndex]; if (!item) return;
  stopSpeakingRecording(false);
  const btn = document.getElementById("speakingPlayAudioBtn"); btn.disabled = true; btn.textContent = "Đang phát...";
 speakEnglishText(item.text, { onDone: () => { btn.disabled = false; btn.textContent ="Nghe phát âm mẫu"; } });
});
document.getElementById("speakingMicBtn").addEventListener("click", () => {
  const item = activeSpeakingTask?.items[activeItemIndex]; if (!item) return;
  if (speakingRecognizer) { stopSpeakingRecording(true); return; }
  window.speechSynthesis?.cancel();
  document.getElementById("speakingResultBox").classList.add("hidden");
  const live = document.getElementById("speakingLiveText");
  speakingRecognizer = createRecognizer({
    onInterim: t => { live.textContent = t ? `Đang nghe: "${t}"` : "Đang lắng nghe..."; },
    onError: () => showToast("Micro chưa nhận diện được âm thanh. Hãy nói to và rõ hơn nhé!"),
    onEnd: alternatives => { speakingRecognizer = null; stopSpeakingRecording(false); evaluateSpeakingAttempt(alternatives); }
  });
  if (!speakingRecognizer) { showToast("Trình duyệt không hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge."); return; }
  document.getElementById("speakingMicBtn").classList.add("recording");
  document.getElementById("speakingMicLabel").textContent = "Hoàn thành & Chấm điểm";
  document.getElementById("speakingWave").classList.remove("hidden"); live.textContent = "Đang lắng nghe...";
  speakingRecognizer.start();
});
document.getElementById("speakingRetryBtn").addEventListener("click", () => document.getElementById("speakingMicBtn").click());
document.getElementById("speakingPrevBtn").addEventListener("click", () => { if (activeItemIndex > 0) { activeItemIndex--; renderSpeakingItem(); } });
document.getElementById("speakingNextBtn").addEventListener("click", () => {
  if (!activeSpeakingTask) return;
  if (activeItemIndex < activeSpeakingTask.items.length - 1) { activeItemIndex++; renderSpeakingItem(); } else finishSpeakingTask();
});
async function evaluateSpeakingAttempt(alternatives) {
  const task = activeSpeakingTask, item = task?.items[activeItemIndex]; if (!item) return;
  if (!alternatives.length) { showToast("Chưa thu được giọng đọc. Hãy bấm 'Bắt đầu nói' và đọc to câu mẫu nhé!"); return; }
  const box = document.getElementById("speakingResultBox"); box.classList.remove("hidden");
  document.getElementById("speakingVerdict").textContent = "AI đang chấm điểm..."; document.getElementById("speakingFeedback").textContent = "";
  document.getElementById("speakingWordPills").innerHTML = ""; document.getElementById("speakingTranscript").textContent = `"${alternatives[0]}"`;
  try {
    const res = await apiRequest("/api/speaking/evaluate", { method: "POST", body: JSON.stringify({ target: item.text, alternatives, assignmentId: task.assignmentId || null, itemIndex: activeItemIndex, stage: task.stage, context: "practice" }) });
    const result = { accuracy: res.accuracy, transcript: res.transcript, breakdown: res.breakdown, errors: res.errors, verdict: res.verdict, tip: res.tip };
    speakingItemResults[activeItemIndex] = result; lastSpeakingEvaluation = result;
    showSpeakingResult(result, item);
    recordSpeakingErrorsForHealing(res.errors || [], item.text, item.ipa);
    const stats = getLearningStats();
    stats.speakingAttempts = (stats.speakingAttempts || 0) + 1; stats.bestSpeakingScore = Math.max(stats.bestSpeakingScore || 0, res.accuracy); setLearningStats(stats);
    if (res.accuracy >= 90) cheer("perfect"); else if (res.accuracy >= 60) playSfx("taskDone"); else playSfx("wrong");
    document.getElementById("speakingItemProgress").style.width = `${(Object.values(speakingItemResults).filter(r => r && !r.tts).length / Math.max(1, task.items.filter(l => !(task.stage === 2 && task.items.some(x => x.speaker)) || (l.speaker || "A") === speakingRole).length)) * 100}%`;
    if (task.stage === 2) renderSpeakingItem();
  } catch (e) { document.getElementById("speakingVerdict").textContent = "Không chấm được"; document.getElementById("speakingFeedback").textContent = e.message; }
}
function showSpeakingResult(r, item) {
  const box = document.getElementById("speakingResultBox"); box.classList.remove("hidden");
  document.getElementById("speakingScorePercent").textContent = `${r.accuracy}%`;
  document.getElementById("speakingScoreCircle").style.borderColor = r.accuracy >= 75 ? "#22c55e" : r.accuracy >= 60 ? "#f59e0b" : "#ef4444";
  document.getElementById("speakingVerdict").textContent = r.verdict?.label || "";
  document.getElementById("speakingFeedback").textContent = r.tip || "";
  document.getElementById("speakingTranscript").textContent = `"${r.transcript}"`;
  document.getElementById("speakingWordPills").innerHTML = (r.breakdown || []).map(b => `<span class="word-pill ${b.status}" title="${b.heard ? `AI nghe: ${escapeHTML(b.heard)}` : "Không nghe thấy"}">${b.status === "correct" ? "<i class=mi>check</i>" : b.status === "near" ? "≈" : b.status === "ending" ? "-s/-ed" : "<i class=mi>close</i>"} ${escapeHTML(b.word)}</span>`).join("");
  const note = document.getElementById("speakingErrorNote");
  const gram = (r.errors || []).filter(e => e.type === "grammar"), pron = (r.errors || []).filter(e => e.type === "pronunciation"), flu = (r.errors || []).filter(e => e.type === "fluency");
  if (gram.length || pron.length || flu.length) {
    note.classList.remove("hidden");
    note.innerHTML = `${flu.map(e => e.subtype === "extra_words" ? `<div><i class=mi>warning</i> <b>Nói thừa ${e.extra} từ</b> ngoài câu mẫu — chỉ đọc đúng câu, không thêm bớt.</div>` : `<div><i class=mi>warning</i> <b>Sai trật tự từ</b> (${escapeHTML(e.detail || "")}) — đọc theo đúng thứ tự câu mẫu.</div>`).join("")}${gram.length ? `<div><i class=mi>menu_book</i> <b>Lỗi ngữ pháp (đuôi từ):</b> ${gram.map(e => `${escapeHTML(e.word)} → đọc "${escapeHTML(e.heard)}"`).join(", ")} — đã đưa vào Phòng chữa lỗi mục Ngữ pháp.</div>` : ""}${pron.length ? `<div><i class=mi>mic</i> <b>Cần luyện phát âm:</b> ${pron.slice(0, 5).map(e => escapeHTML(e.word)).join(", ")} — đã đưa vào mục Phát âm.</div>` : ""}`;
  } else note.classList.add("hidden");
  const coach = document.getElementById("capybaraCoachBubble");
 if (coach) coach.textContent = r.accuracy >= 90 ?"Quá đỉnh! Phát âm chuẩn như người bản xứ luôn!": r.accuracy >= 75 ?"Tốt lắm! Người nghe hiểu rõ rồi, luyện thêm vài từ màu vàng nữa là hoàn hảo!": r.accuracy >= 60 ?"Khá rồi nè! Nghe lại mẫu và chú ý các từ đỏ nhé!":"Đừng nản! Bấm nghe mẫu, đọc chậm và rõ từng từ rồi thử lại cùng mình nào!";
}
async function finishSpeakingTask() {
  const task = activeSpeakingTask; if (!task) return;
  const results = task.items.map((_, i) => speakingItemResults[i]).filter(r => r && !r.tts);
  if (!results.length) { showToast("Hãy đọc ít nhất một câu trước khi hoàn thành nhé!"); return; }
  const avg = Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length);
  const verdict = avg >= 90 ? { xp: 40, carrots: 3 } : avg >= 75 ? { xp: 30, carrots: 2 } : avg >= 60 ? { xp: 20, carrots: 1 } : { xp: 10, carrots: 0 };
  const summary = document.getElementById("speakingSummary");
  summary.classList.remove("hidden");
  summary.innerHTML = `<h4 style="margin:0 0 6px"><i class=mi>celebration</i> Hoàn thành bài "${escapeHTML(task.title)}"</h4><div class="stage-metrics"><div><b>${avg}%</b><span>Trung bình</span></div><div><b>${results.length}/${task.items.length}</b><span>Câu đã đọc</span></div><div><b>${Math.max(...results.map(r => r.accuracy))}%</b><span>Câu tốt nhất</span></div></div><p class="small muted" id="speakingSubmitStatus">Đang lưu kết quả...</p>`;
  gainRewards(verdict.xp, verdict.carrots, "Hoàn thành bài luyện nói");
  if (task.assignmentId) {
    try {
      const res = await apiRequest("/api/student/speaking-submissions", { method: "POST", body: JSON.stringify({ assignmentId: task.assignmentId, itemsResult: task.items.map((_, i) => speakingItemResults[i] && !speakingItemResults[i].tts ? { index: i, accuracy: speakingItemResults[i].accuracy, transcript: speakingItemResults[i].transcript } : null).filter(Boolean), spokenTranscript: results.map(r => r.transcript).join(" | ") }) });
      document.getElementById("speakingSubmitStatus").textContent = res.message;
    } catch (e) { document.getElementById("speakingSubmitStatus").textContent = "Không nộp được cho giáo viên: " + e.message; }
  } else {
    const rec = getLocalSpeakingRecords()[task.id] || { best: 0, attempts: 0, stage: task.stage };
    setLocalSpeakingRecord(task.id, { best: Math.max(rec.best, avg), attempts: rec.attempts + 1, stage: task.stage, last: avg });
    try { await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type: "speaking", refId: task.id, title: task.title, score: avg, maxScore: 100, meta: { stage: task.stage, items: results.length, system: true } }) }); } catch (e) {}
    document.getElementById("speakingSubmitStatus").textContent = "Đã ghi nhận tiến độ.";
  }
  studentProgress = null;
  playSuccessSound();
  renderSpeakingLab();
}

const healingExercisesBank = window.ENGO_HEALING_BANK || {};
const defaultHealingProfile = { pronunciation: [], grammar: [], test: [], healedHistory: [], healingStreak: 0, heatmapStatus: {} };
function getHealingProfile() {
  try { const raw = localStorage.getItem(getUserStorageKey("engoHealingProfileV3")); if (raw) return { ...JSON.parse(JSON.stringify(defaultHealingProfile)), ...JSON.parse(raw) }; } catch (e) {}
  return JSON.parse(JSON.stringify(defaultHealingProfile));
}
function saveHealingProfile(profile) { localStorage.setItem(getUserStorageKey("engoHealingProfileV3"), JSON.stringify(profile)); }
function detectGrammarCode(text) {
  const q = String(text || "").toLowerCase();
  if (q.includes("past") && /irregular|bất quy tắc/.test(q)) return "PAST_IRR";
  if (q.includes("past") && /negative|phủ định/.test(q)) return "PAST_NEG";
  if (q.includes("past") && /question|nghi vấn/.test(q)) return "PAST_QUE";
  if (/\b(was|were)\b/.test(q)) return "PAST_BE";
  if (q.includes("comparative") && q.includes("long")) return "CMP_LONG";
  if (q.includes("comparative") && /irregular|bất quy tắc/.test(q)) return "CMP_IRR";
  if (/comparative|than\b|more /.test(q)) return "CMP_SHORT";
  if (q.includes("present") && q.includes("negative")) return "PS_NEG";
  if (q.includes("present") && q.includes("question")) return "PS_QUE";
  if (/adverb|always|usually|often/.test(q)) return "PS_ADV";
  if (/present|does|doesn't|every day/.test(q)) return "PS_AFF";
  if (/past|yesterday|ago|last /.test(q)) return "PAST_REG";
  return null;
}
function addGrammarError(profile, code, triggerQuestion, selected, correct, source) {
  if (!code || !healingExercisesBank[code]) return;
  if (profile.grammar.some(e => e.code === code)) return;
  profile.grammar.unshift({ id: `err-${Date.now()}-${code}`, code, triggerQuestion, selected, correct, source, createdAt: new Date().toISOString() });
  profile.heatmapStatus[code] = "weak";
}
function recordSpeakingErrorsForHealing(errors, sentence, ipa) {
  if (!errors.length) return;
  const profile = getHealingProfile();
  errors.forEach(e => {
    if (e.type === "grammar") {
      const code = e.subtype === "missing_ed" ? "PAST_REG" : "PS_AFF";
      addGrammarError(profile, code, `Trong câu "${sentence}", bạn đọc "${e.heard}" thay vì "${e.word}"`, e.heard, e.word, "speaking");
    } else if (e.subtype !== "near" || Math.random() < 0.5) {
      const word = String(e.word || "").replace(/[^A-Za-z'\-]/g, ""); if (!word || word.length < 2) return;
      const existing = profile.pronunciation.find(p => p.word.toLowerCase() === word.toLowerCase());
      if (existing) { existing.count += 1; existing.heard = e.heard || existing.heard; existing.sentence = sentence; }
      else profile.pronunciation.unshift({ id: `pron-${Date.now()}-${word}`, word, heard: e.heard || "", count: 1, sentence, ipa: ipa || "", createdAt: new Date().toISOString() });
    }
  });
  profile.pronunciation = profile.pronunciation.slice(0, 40);
  saveHealingProfile(profile);
}
function recordUnitGrammarErrors(unit, title, wrongList) {
  const profile = getHealingProfile();
  profile.unitGrammar = profile.unitGrammar || [];
  wrongList.forEach(w => profile.unitGrammar.unshift({ id: `ug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, unit, title, prompt: w.prompt, selected: w.selected, correct: w.correct, explanation: w.explanation, createdAt: new Date().toISOString() }));
  profile.unitGrammar = profile.unitGrammar.slice(0, 60);
  saveHealingProfile(profile);
}
function recordTestErrorsForHealing(wrongList, testTitle) {
  if (!wrongList.length) return;
  const profile = getHealingProfile();
  wrongList.forEach(r => {
    profile.test.unshift({ id: `test-${Date.now()}-${r.id}`, testTitle, section: r.section, prompt: r.prompt, selected: r.selected, correct: r.correctAnswer, reviewed: false, createdAt: new Date().toISOString() });
    if (r.section === "Grammar and Vocabulary" || r.section === "Phonetics") {
      const code = detectGrammarCode(`${r.prompt} ${(r.options || []).map(o => o.text || o).join(" ")}`);
      if (code) addGrammarError(profile, code, r.prompt, r.selected, r.correctAnswer, "test");
    }
  });
  profile.test = profile.test.slice(0, 80);
  saveHealingProfile(profile);
}
async function logHealingEvent(title, meta) {
  try { await apiRequest("/api/learning-events", { method: "POST", body: JSON.stringify({ type: "healing", title, score: 1, maxScore: 1, meta }) }); studentProgress = null; } catch (e) {}
}
function renderHealingRoom() {
  const profile = getHealingProfile();
  const pendingTest = profile.test.filter(t => !t.reviewed);
  document.getElementById("healingStatPron").textContent = profile.pronunciation.length;
  document.getElementById("healingStatGrammar").textContent = profile.grammar.length;
  document.getElementById("healingStatTest").textContent = pendingTest.length;
  document.getElementById("healingStatHealed").textContent = profile.healedHistory.length;

  const pronList = document.getElementById("healingPronList");
  pronList.innerHTML = profile.pronunciation.length ? profile.pronunciation.map(p => `<div class="healing-error-card pron">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><span class="error-badge purple">Phát âm · sai ${p.count} lần</span><h4 style="margin:6px 0 2px;font-size:22px">${escapeHTML(p.word)} ${p.ipa ? `<span class="small muted" style="font-family:monospace;font-weight:400"></span>` : ""}</h4><div class="small muted">AI nghe thành: "${escapeHTML(p.heard || "…")}" · Trong câu: "${escapeHTML(p.sentence || "")}"</div></div>
      <div style="display:flex;gap:8px"><button class="btn btn-soft btn-sm pron-play" data-word="${escapeHTML(p.word)}"><i class=mi>volume_up</i> Nghe</button><button class="btn btn-primary btn-sm pron-drill" data-id="${p.id}"><i class=mi>mic</i> Luyện lại</button></div></div></div>`).join("")
    : '<div class="empty-state"><strong style="color:#16a34a">Không có lỗi phát âm nào cần chữa.</strong><p class="small muted">Luyện nói AI để hệ thống phát hiện các từ bạn đọc chưa chuẩn.</p></div>';
  pronList.querySelectorAll(".pron-play").forEach(b => b.addEventListener("click", () => speakEnglishText(b.dataset.word, { rate: 0.75 })));
  pronList.querySelectorAll(".pron-drill").forEach(b => b.addEventListener("click", () => openPronDrill(b.dataset.id)));

  const pendingList = document.getElementById("healingPendingList");
  pendingList.innerHTML = profile.grammar.length ? profile.grammar.map(err => {
    const bank = healingExercisesBank[err.code] || { label: "Ngữ pháp", rule: "", mnemonic: "" };
    return `<div class="healing-error-card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px"><span class="error-badge red">Cần chữa: ${escapeHTML(bank.label)}</span><span class="small muted">${err.source === "speaking" ? "<i class=mi>mic</i> Từ luyện nói" : "<i class=mi>edit_note</i> Từ bài kiểm tra"} · ${fmtDate(err.createdAt)}</span></div>
      <div style="font-size:14px;margin-bottom:8px"><strong>Câu mắc lỗi:</strong> "${escapeHTML(err.triggerQuestion)}"</div>
      <div style="display:flex;gap:12px;font-size:13px;margin-bottom:12px;background:#fef2f2;padding:8px 12px;border-radius:8px;flex-wrap:wrap"><div>Bạn chọn/đọc: <span style="color:#dc2626;font-weight:700">${escapeHTML(String(err.selected || "—"))}</span></div><div>Đáp án chuẩn: <span style="color:#16a34a;font-weight:700">${escapeHTML(String(err.correct || ""))}</span></div></div>
      <div style="background:#f8fafc;border-left:3px solid #6366f1;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:14px;font-size:13px"><div style="font-weight:700;color:#4338ca">Quy tắc cốt lõi:</div><div>${escapeHTML(bank.rule)}</div><div style="margin-top:6px;color:#059669;font-weight:600">Mẹo nhớ: ${escapeHTML(bank.mnemonic)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary start-healing-btn" data-error-code="${err.code}" data-error-id="${err.id}" style="flex:2;font-weight:700">Bắt đầu chữa lỗi (3 câu) →</button><button class="btn btn-soft ask-capybara-err-btn" data-error-label="${escapeHTML(bank.label)}" style="flex:1"><i class=mi>chat</i> Hỏi AI giải thích</button></div></div>`;
  }).join("") : '<div class="empty-state"><strong style="color:#16a34a">Tuyệt vời! Không có lỗi ngữ pháp nào đang chờ chữa.</strong><p class="small muted">Lỗi từ bài kiểm tra và đuôi -s/-ed khi luyện nói sẽ tự động xuất hiện ở đây.</p></div>';
  pendingList.querySelectorAll(".start-healing-btn").forEach(btn => btn.addEventListener("click", () => startHealingExercise(btn.dataset.errorCode, btn.dataset.errorId)));
  pendingList.querySelectorAll(".ask-capybara-err-btn").forEach(btn => btn.addEventListener("click", () => { if (capybaraChatWindow.classList.contains("hidden")) toggleCapybaraChat(); sendCapybaraMessage(`Capybara ơi, giải thích chi tiết quy tắc ngữ pháp '${btn.dataset.errorLabel}' và cho 2 ví dụ dễ hiểu nhé!`); }));

  const ugList = document.getElementById("healingUnitGrammarList");
  const ug = profile.unitGrammar || [];
  if (ugList) {
    const byUnit = {};
    ug.forEach(t => { (byUnit[t.unit] = byUnit[t.unit] || []).push(t); });
    ugList.innerHTML = ug.length ? `<h4 style="margin:6px 0 10px"><i class=mi>book_2</i> Câu sai từ bài tập ngữ pháp theo Unit (${ug.length})</h4>` + Object.keys(byUnit).sort((a, b) => a - b).map(un => `<div class="card panel" style="margin-bottom:12px"><div class="section-head"><h4 style="margin:0">Unit ${un} · ${escapeHTML(byUnit[un][0].title || "")} <span class="badge orange">${byUnit[un].length} câu</span></h4><button class="btn btn-soft btn-sm ug-clear" data-unit="${un}">Đã ôn lại</button></div>${byUnit[un].map(t => `<div class="review-item"><div>${escapeHTML(t.prompt)}</div><div class="small">Bạn chọn: <b style="color:#dc2626">${escapeHTML(String(t.selected || "—"))}</b> · Đáp án: <b style="color:#16a34a">${escapeHTML(String(t.correct || ""))}</b></div>${t.explanation ? `<div class="small muted"><i class=mi>lightbulb</i> ${escapeHTML(t.explanation)}</div>` : ""}</div>`).join("")}</div>`).join("") : "";
    ugList.querySelectorAll(".ug-clear").forEach(b => b.addEventListener("click", () => {
      const pr = getHealingProfile(); const removed = (pr.unitGrammar || []).filter(t => String(t.unit) === b.dataset.unit).length;
      pr.unitGrammar = (pr.unitGrammar || []).filter(t => String(t.unit) !== b.dataset.unit);
      pr.healedHistory.unshift({ id: `healed-${Date.now()}`, category: "grammar", title: `Ôn lại ${removed} câu ngữ pháp Unit ${b.dataset.unit}`, healedAt: new Date().toISOString(), score: `${removed} câu` });
      saveHealingProfile(pr); logHealingEvent(`Ôn lại ngữ pháp Unit ${b.dataset.unit}`, { category: "grammar", unit: Number(b.dataset.unit), count: removed }); gainRewards(5 * removed, 0, "Ôn lại ngữ pháp"); renderHealingRoom();
    }));
  }
  document.getElementById("healingStatGrammar").textContent = profile.grammar.length + ug.length;

  const testList = document.getElementById("healingTestList");
  const byTest = {};
  pendingTest.forEach(t => { (byTest[t.testTitle] = byTest[t.testTitle] || []).push(t); });
  testList.innerHTML = pendingTest.length ? Object.entries(byTest).map(([title, items]) => `<div class="card panel" style="margin-bottom:12px"><div class="section-head"><h4 style="margin:0"><i class=mi>edit_note</i> ${escapeHTML(title)} <span class="badge orange">${items.length} câu sai</span></h4><button class="btn btn-soft btn-sm review-all-test" data-title="${escapeHTML(title)}">Đã xem lại tất cả</button></div>
      ${items.map(t => `<div class="review-item"><div class="small muted">${escapeHTML(t.section || "")}</div><div>${escapeHTML(t.prompt)}</div><div class="small">Bạn chọn: <b style="color:#dc2626">${escapeHTML(String(t.selected || "—"))}</b> · Đáp án: <b style="color:#16a34a">${escapeHTML(String(t.correct || ""))}</b> <button class="btn btn-light btn-sm review-one" data-id="${t.id}" style="margin-left:8px"><i class=mi>check</i> Đã hiểu</button></div></div>`).join("")}</div>`).join("")
    : '<div class="empty-state"><strong style="color:#16a34a">Không có câu sai nào đang chờ xem lại.</strong><p class="small muted">Sau mỗi bài kiểm tra, các câu sai sẽ được liệt kê ở đây kèm đáp án đúng.</p></div>';
  const markReviewed = (ids, title) => {
    const pr = getHealingProfile();
    pr.test.forEach(t => { if (ids.includes(t.id)) t.reviewed = true; });
    pr.healedHistory.unshift({ id: `healed-${Date.now()}`, category: "test", title: `Xem lại ${ids.length} câu sai · ${title}`, healedAt: new Date().toISOString(), score: `${ids.length} câu` });
    saveHealingProfile(pr); logHealingEvent(`Xem lại câu sai: ${title}`, { category: "test", count: ids.length }); renderHealingRoom(); gainRewards(5 * ids.length, 0, "Xem lại câu sai");
  };
  testList.querySelectorAll(".review-one").forEach(b => b.addEventListener("click", () => { const t = pendingTest.find(x => x.id === b.dataset.id); markReviewed([b.dataset.id], t?.testTitle || ""); }));
  testList.querySelectorAll(".review-all-test").forEach(b => b.addEventListener("click", () => markReviewed(byTest[b.dataset.title].map(t => t.id), b.dataset.title)));

  const groups = [["Thì Hiện tại đơn", [["PS_AFF", "Khẳng định (+s/es)"], ["PS_NEG", "Phủ định (don't/doesn't)"], ["PS_QUE", "Nghi vấn (Do/Does)"], ["PS_ADV", "Trạng từ tần suất"]]], ["Thì Quá khứ đơn", [["PAST_REG", "V-ed có quy tắc"], ["PAST_IRR", "V2 bất quy tắc"], ["PAST_NEG", "Phủ định (didn't + V)"], ["PAST_QUE", "Câu hỏi (Did + S + V)"], ["PAST_BE", "Was / Were"]]], ["Cấu trúc So sánh", [["CMP_SHORT", "Tính từ ngắn (-er/-est)"], ["CMP_LONG", "Tính từ dài (more/most)"], ["CMP_IRR", "So sánh bất quy tắc"]]]];
  const label = st => st === "mastered" ? '<span style="color:#16a34a;font-weight:700">Thành thạo</span>' : st === "weak" ? '<span style="color:#dc2626;font-weight:700">Yếu (cần chữa)</span>' : '<span style="color:#94a3b8">Chưa kiểm tra</span>';
  document.getElementById("grammarHeatmapContainer").innerHTML = groups.map(([g, rows]) => `<div class="healing-heatmap-group"><h4>${g}</h4>${rows.map(([code, name]) => `<div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${profile.heatmapStatus[code] || "unknown"}"></div></div><div style="flex:1">${name}</div><div>${label(profile.heatmapStatus[code])}</div></div>`).join("")}</div>`).join("");

  const historyList = document.getElementById("healingHistoryList");
  const catLabel = { pronunciation: "<i class=mi>mic</i> Phát âm", grammar: "<i class=mi>menu_book</i> Ngữ pháp", test: "<i class=mi>edit_note</i> Bài kiểm tra" };
  historyList.innerHTML = profile.healedHistory.length ? profile.healedHistory.map(item => `<div class="card panel" style="padding:14px 18px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:10px"><div><span class="badge green">${catLabel[item.category] || "Đã chữa"}</span><div style="font-weight:700;margin-top:4px">${escapeHTML(item.title)}</div><div class="small muted">${fmtDate(item.healedAt, true)}</div></div><div style="text-align:right"><div class="small muted">${escapeHTML(item.score || "")}</div></div></div>`).join("") : '<div class="empty-state">Chưa có lỗi nào được chữa khỏi.</div>';
}
document.querySelectorAll("[data-healing-tab]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-healing-tab]").forEach(t => t.classList.toggle("active", t === tab));
  document.querySelectorAll("#errorHealing .healing-panel").forEach(p => p.classList.toggle("active", p.id === `healingPanel-${tab.dataset.healingTab}`));
}));

let drillItem = null, drillRecognizer = null;
function openPronDrill(id) {
  const profile = getHealingProfile(); drillItem = profile.pronunciation.find(p => p.id === id); if (!drillItem) return;
  document.getElementById("pronDrillWord").textContent = drillItem.word;
  document.getElementById("pronDrillIpa").textContent = "";
  document.getElementById("pronDrillContext").textContent = drillItem.sentence ? `Trong câu: "${drillItem.sentence}"` : "";
  document.getElementById("pronDrillResult").innerHTML = "";
  document.getElementById("pronDrillMicLabel").textContent = "Đọc lại";
  openModal("pronDrillModal");
  apiRequest("/api/ai/translate-and-ipa", { method: "POST", body: JSON.stringify({ sentence: drillItem.word }) }).then(r => { if (drillItem && r.ipa) document.getElementById("pronDrillIpa").textContent = r.ipa; }).catch(() => {});
}
document.getElementById("pronDrillPlay").addEventListener("click", () => drillItem && speakEnglishText(drillItem.word, { rate: 0.7 }));
document.getElementById("pronDrillMic").addEventListener("click", () => {
  if (!drillItem) return;
  const mic = document.getElementById("pronDrillMic"), label = document.getElementById("pronDrillMicLabel"), out = document.getElementById("pronDrillResult");
  if (drillRecognizer) { drillRecognizer.stop(); return; }
  drillRecognizer = createRecognizer({
    onInterim: t => { out.innerHTML = `<div class="small muted">Đang nghe: "${escapeHTML(t)}"</div>`; },
    onEnd: async alternatives => {
      drillRecognizer = null; mic.classList.remove("recording"); label.textContent = "Đọc lại";
      if (!alternatives.length) { out.innerHTML = '<div class="small muted">Chưa nghe thấy gì, thử lại nhé.</div>'; return; }
      try {
        const res = await apiRequest("/api/speaking/evaluate", { method: "POST", body: JSON.stringify({ target: drillItem.word, alternatives, context: "drill" }) });
        const ok = res.accuracy >= 85;
        out.innerHTML = `<div class="quiz-speaking-result"><strong style="color:${ok ? "#16a34a" : "#d97706"}">Độ chuẩn: ${res.accuracy}% ${ok ? "— Đã chữa khỏi! <i class=mi>celebration</i>" : "— Chưa đạt 85%, thử lại nhé"}</strong><div class="small muted">AI nghe: "${escapeHTML(res.transcript)}"</div>${res.tip ? `<div class="small"><i class=mi>lightbulb</i> ${escapeHTML(res.tip)}</div>` : ""}</div>`;
        if (ok) {
          const pr = getHealingProfile();
          pr.pronunciation = pr.pronunciation.filter(p => p.id !== drillItem.id);
          pr.healedHistory.unshift({ id: `healed-${Date.now()}`, category: "pronunciation", title: `Phát âm chuẩn từ "${drillItem.word}"`, healedAt: new Date().toISOString(), score: `${res.accuracy}%` });
          pr.healingStreak = (pr.healingStreak || 0) + 1; saveHealingProfile(pr);
          gainRewards(10, 1, "Chữa khỏi lỗi phát âm"); logHealingEvent(`Chữa lỗi phát âm: ${drillItem.word}`, { category: "pronunciation", accuracy: res.accuracy });
          cheer("taskDone"); setTimeout(() => { closeModal("pronDrillModal"); renderHealingRoom(); }, 1400);
        } else playWrongSound();
      } catch (e) { out.innerHTML = `<div class="small" style="color:red">${escapeHTML(e.message)}</div>`; }
    }
  });
  if (!drillRecognizer) { showToast("Trình duyệt không hỗ trợ nhận diện giọng nói."); return; }
  mic.classList.add("recording"); label.textContent = "Hoàn thành"; out.innerHTML = '<div class="small muted">Đang lắng nghe...</div>';
  drillRecognizer.start();
});

let activeHealingSession = null;
function startHealingExercise(errorCode, errorId) {
  const bank = healingExercisesBank[errorCode]; if (!bank || !bank.questions?.length) { showToast("Chưa có bài tập cho dạng này."); return; }
  activeHealingSession = { errorCode, errorId, label: bank.label, questions: shuffleArray(bank.questions).slice(0, 3), currentIndex: 0, correctCount: 0 };
  document.getElementById("healingModalTitle").textContent = `Chữa lỗi: ${bank.label}`;
  renderHealingModalStep(); openModal("healingExerciseModal");
}
function renderHealingModalStep() {
  const s = activeHealingSession; if (!s) return;
  const modalBody = document.getElementById("healingModalBody");
  document.getElementById("healingModalProgress").style.width = `${Math.max(15, Math.round((s.currentIndex / s.questions.length) * 100))}%`;
  if (s.currentIndex >= s.questions.length) {
    const passed = s.correctCount >= 2;
    if (passed) {
      const profile = getHealingProfile();
      profile.grammar = profile.grammar.filter(e => e.id !== s.errorId);
      profile.healedHistory.unshift({ id: `healed-${Date.now()}`, category: "grammar", title: s.label, healedAt: new Date().toISOString(), score: `${s.correctCount}/${s.questions.length}` });
      profile.heatmapStatus[s.errorCode] = s.correctCount === 3 ? "mastered" : "shaky";
      profile.healingStreak = (profile.healingStreak || 0) + 1; saveHealingProfile(profile);
      gainRewards(15, 1, "Chữa khỏi lỗi ngữ pháp"); logHealingEvent(`Chữa lỗi ngữ pháp: ${s.label}`, { category: "grammar", code: s.errorCode, score: s.correctCount }); cheer("taskDone");
    }
    modalBody.innerHTML = `<div style="text-align:center;padding:20px 0"><h3 style="color:${passed ? "#16a34a" : "#d97706"};margin:0 0 8px">${passed ? "CHỮA LỖI THÀNH CÔNG!" : "CHƯA ĐẠT — THỬ LẠI NHÉ"}</h3><p style="line-height:1.5">Bạn làm đúng <strong>${s.correctCount}/${s.questions.length}</strong> câu dạng <strong>${escapeHTML(s.label)}</strong>.${passed ? " Lỗi này đã được đánh dấu trên Bản đồ ngữ pháp!" : " Cần đúng ít nhất 2/3 câu để chữa khỏi."}</p>${passed ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;display:inline-block;margin-bottom:20px"><strong style="color:#15803d"><i class=mi>redeem</i> +15 XP & +1 Cà rốt</strong></div>' : ""}<button class="btn btn-primary" id="finishHealingSessionBtn" style="width:100%;font-weight:700">${passed ? "Hoàn tất" : "Làm lại 3 câu khác"}</button></div>`;
    document.getElementById("finishHealingSessionBtn").addEventListener("click", () => { if (passed) { closeModal("healingExerciseModal"); renderHealingRoom(); } else startHealingExercise(s.errorCode, s.errorId); });
    return;
  }
  const q = s.questions[s.currentIndex];
  modalBody.innerHTML = `<div style="margin-bottom:12px;display:flex;justify-content:space-between"><span class="badge blue">Câu ${s.currentIndex + 1} / ${s.questions.length}</span><span class="small muted">${escapeHTML(s.label)}</span></div><div style="font-size:15px;font-weight:700;margin-bottom:16px;line-height:1.5">${escapeHTML(q.prompt)}</div><div id="healingOptionsList">${q.options.map((opt, i) => `<button type="button" class="healing-option" data-opt-index="${i}">${escapeHTML(opt)}</button>`).join("")}</div><div id="healingAnswerFeedback" style="display:none;margin-top:14px;padding:12px 14px;border-radius:10px;font-size:13.5px"></div><button class="btn btn-primary" id="nextHealingStepBtn" style="display:none;width:100%;margin-top:14px;font-weight:700">Tiếp tục →</button>`;
  const options = modalBody.querySelectorAll(".healing-option"), feedback = document.getElementById("healingAnswerFeedback"), nextBtn = document.getElementById("nextHealingStepBtn");
  options.forEach(btn => btn.addEventListener("click", () => {
    options.forEach(b => b.disabled = true);
    const isRight = Number(btn.dataset.optIndex) === q.answer;
    if (isRight) { btn.classList.add("correct"); s.correctCount++; playSfx("correct"); } else { btn.classList.add("wrong"); options[q.answer]?.classList.add("correct"); playSfx("wrong"); }
    feedback.style.display = "block"; feedback.style.background = isRight ? "#f0fdf4" : "#fef2f2"; feedback.style.border = isRight ? "1px solid #bbf7d0" : "1px solid #fecaca"; feedback.style.color = isRight ? "#15803d" : "#991b1b";
    feedback.innerHTML = `<strong>${isRight ? "<i class=mi>check</i> CHÍNH XÁC!" : "<i class=mi>close</i> CHƯA ĐÚNG!"}</strong> ${escapeHTML(q.explanation)}`;
    nextBtn.style.display = "block";
    nextBtn.addEventListener("click", () => { s.currentIndex++; renderHealingModalStep(); }, { once: true });
  }));
}
document.getElementById("healingModalClose")?.addEventListener("click", () => closeModal("healingExerciseModal"));

async function fileToDataUrl(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error("Không thể đọc file.")); r.readAsDataURL(file); }); }
function isTeacherLike() { return currentUser && (currentUser.role === "teacher" || currentUser.role === "admin"); }
document.querySelectorAll("[data-teacher-tab]").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll("[data-teacher-tab]").forEach(t => t.classList.toggle("active", t === tab));
  document.querySelectorAll("#teacher-home > .healing-panel").forEach(p => p.classList.toggle("active", p.id === `teacherPanel-${tab.dataset.teacherTab}`));
  const t = tab.dataset.teacherTab;
  if (t === "students") renderStudentsOverview(); if (t === "tests") { renderTeacherRecentTests(); renderMatricesList(); } if (t === "results") { renderTeacherResults(); renderTeacherStats(); } if (t === "speaking") { loadTeacherSpeakingTasks(); loadTeacherSpeakingSubmissions(); }
}));
async function renderTeacherHome() {
  if (!isTeacherLike()) return;
  await loadClassNames();
  renderTeacherStats(); renderStudentsOverview(); renderTeacherRecentTests(); renderMatricesList(); renderTeacherResults(); loadTeacherSpeakingTasks(); loadTeacherSpeakingSubmissions();
}
async function renderTeacherStats() {
  if (!isTeacherLike()) return;
  try {
    const data = await apiRequest("/api/teacher/results/stats"); const stats = data.stats || {};
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("teacherStatStudents", stats.totalStudents || 0); set("teacherStatSubmissions", stats.totalSubmissions || 0); set("teacherStatTests", stats.totalTests || 0);
    set("sumTotalSubmissions", stats.totalSubmissions || 0); set("sumAvgScore", stats.avgScoreOverall ? `${stats.avgScoreOverall}/10` : "--"); set("sumPendingGrading", stats.pendingGrading || 0);
    barChart(document.getElementById("teacherClassChart"), (stats.classSummary || []).map(c => ({ label: c.className, value: c.avgScore, title: `${c.className}: ${c.avgScore}đ (${c.submissions} bài)` })), { max: 10, suffix: "đ" });
  } catch (err) { console.error("teacher stats:", err); }
}
async function renderStudentsOverview() {
  const tbody = document.getElementById("studentsOverviewBody"); if (!tbody || !isTeacherLike()) return;
  const cls = document.getElementById("teacherStudentsClassFilter")?.value || "";
  tbody.innerHTML = '<tr><td colspan="10" class="small muted" style="text-align:center;padding:24px">Đang tổng hợp dữ liệu học sinh...</td></tr>';
  try {
    const data = await apiRequest(`/api/teacher/students-overview${cls ? `?className=${encodeURIComponent(cls)}` : ""}`);
    const list = data.students || [];
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="10" class="small muted" style="text-align:center;padding:24px">Chưa có học sinh.</td></tr>'; return; }
    tbody.innerHTML = list.map((s, i) => `<tr><td>${i + 1}</td><td><strong>${escapeHTML(s.fullName)}</strong><div class="small muted">${escapeHTML(s.email)}</div></td><td><span class="badge blue">${escapeHTML(s.className)}</span></td><td>${s.tests.count ? `<strong class="total-score-badge ${s.tests.avgScore >= 8 ? "high" : s.tests.avgScore >= 5 ? "mid" : "low"}">${s.tests.avgScore}</strong> / ${s.tests.count} bài` : '<span class="small muted">Chưa làm</span>'}</td><td>${s.tests.count >= 2 ? `<span style="color:${s.tests.improvement >= 0 ? "#16a34a" : "#dc2626"};font-weight:700">${s.tests.improvement >= 0 ? "▲ +" : "▼ "}${s.tests.improvement}</span>` : "—"}</td><td>${s.speaking.attempts ? `<b>${s.speaking.stage1}%</b> / <b>${s.speaking.stage2 || "--"}${s.speaking.stage2 ? "%" : ""}</b><div class="small muted">${s.speaking.attempts} lượt</div>` : '<span class="small muted">Chưa luyện</span>'}</td><td>${s.vocab.sets ? `${s.vocab.sets} bộ · ${s.vocab.avg}%` : "—"}</td><td>${s.titles.length ? s.titles.map(t => `<span class="title-chip">${escapeHTML(t)}</span>`).join(" ") : '<span class="small muted">—</span>'}</td><td class="small muted">${s.lastActive ? fmtDate(s.lastActive) : "—"}</td><td><button class="btn btn-light btn-sm view-student-progress" data-id="${s.id}">Chi tiết</button></td></tr>`).join("");
    tbody.querySelectorAll(".view-student-progress").forEach(b => b.addEventListener("click", () => openStudentProgress(b.dataset.id)));
  } catch (err) { tbody.innerHTML = `<tr><td colspan="10" class="small muted" style="color:red;text-align:center;padding:20px">${escapeHTML(err.message)}</td></tr>`; }
}
document.getElementById("teacherStudentsClassFilter")?.addEventListener("change", renderStudentsOverview);
document.getElementById("refreshStudentsOverview")?.addEventListener("click", renderStudentsOverview);
async function openStudentProgress(id) {
  openModal("studentProgressModal");
  const body = document.getElementById("studentProgressBody"); body.innerHTML = '<p class="small muted">Đang tải...</p>';
  try {
    const data = await apiRequest(`/api/teacher/students/${id}/progress`);
    const p = data.progress, s = data.student;
    document.getElementById("studentProgressTitle").textContent = `${s.fullName} · Lớp ${s.className || "—"}`;
    document.getElementById("studentProgressSubtitle").textContent = `${s.email} · Mức thành thạo tổng ${p.overall}% · ${p.activeDays} ngày hoạt động`;
    body.innerHTML = `
      <div class="stage-metrics" style="margin-bottom:14px"><div><b>${p.tests.count ? p.tests.avgScore : "--"}</b><span>Điểm TB (${p.tests.count} bài)</span></div><div><b>${p.speaking.totalAttempts ? p.speaking.avgAccuracy + "%" : "--"}</b><span>Phát âm TB</span></div><div><b>${p.speaking.stages[1]?.avgAccuracy || 0}% / ${p.speaking.stages[2]?.avgAccuracy || 0}%</b><span>GĐ1 / GĐ2</span></div><div><b>${p.vocab.setsCompleted}</b><span>Bộ từ vựng</span></div><div><b>${p.healing.healed}</b><span>Lỗi đã chữa</span></div></div>
      <div class="skill-stat-list">${Object.keys(SKILL_LABELS).map(k => `<div class="skill-stat"><div class="skill-stat-head"><span>${SKILL_LABELS[k]}</span><b>${p.skills[k]}%</b></div><div class="progress"><span style="width:${p.skills[k]}%"></span></div></div>`).join("")}</div>
      ${p.earnedTitles.length ? `<div style="margin:10px 0">${p.earnedTitles.map(titleChip).join(" ")}</div>` : ""}
      <h4 style="margin:14px 0 6px">Lịch sử bài kiểm tra</h4>
      <div class="table-wrap"><table><thead><tr><th>Bài</th><th>Đề</th><th>Điểm</th><th>Trạng thái</th><th>Ngày</th></tr></thead><tbody>${p.tests.history.length ? p.tests.history.slice().reverse().map(h => `<tr><td>${escapeHTML(h.title)}</td><td class="small">${h.variant === "regular" ? "Cơ bản" : h.variant === "advanced" ? "Nâng cao" : "Đầy đủ"}</td><td><strong>${h.scoreOnTen}</strong>${h.speakingScore ? `<div class="small muted">Speaking ${h.speakingScore}</div>` : ""}</td><td><span class="badge ${h.status === "pending_manual" ? "orange" : "green"}">${h.status === "pending_manual" ? "Chờ chấm" : "Xong"}</span>${h.tabViolations ? `<div class="small" style="color:#dc2626">${h.tabViolations} lần rời tab</div>` : ""}</td><td class="small muted">${fmtDate(h.submittedAt)}</td></tr>`).join("") : '<tr><td colspan="5" class="small muted">Chưa làm bài nào.</td></tr>'}</tbody></table></div>
      <h4 style="margin:14px 0 6px">Từ hay phát âm sai</h4><div>${p.speaking.topWords.length ? p.speaking.topWords.map(w => `<span class="word-pill missed">${escapeHTML(w.word)} ×${w.count}</span> `).join("") : '<span class="small muted">Chưa có dữ liệu.</span>'}</div>
      <h4 style="margin:14px 0 6px">Hoạt động gần đây</h4>
      <div class="table-wrap"><table><thead><tr><th>Hoạt động</th><th>Kết quả</th><th>Ngày</th></tr></thead><tbody>${p.events.slice(0, 10).map(e => `<tr><td>${escapeHTML(e.title || e.type)}</td><td>${e.type === "test" ? `${e.maxScore ? ((e.score / e.maxScore) * 10).toFixed(1) : e.score}/10` : e.type === "speaking" ? `${e.score}%` : e.type === "vocab" ? `${e.maxScore ? Math.round((e.score / e.maxScore) * 100) : e.score}%` : "<i class=mi>check</i>"}</td><td class="small muted">${fmtDate(e.createdAt, true)}</td></tr>`).join("") || '<tr><td colspan="3" class="small muted">Chưa có hoạt động.</td></tr>'}</tbody></table></div>`;
  } catch (err) { body.innerHTML = `<p class="small" style="color:red">${escapeHTML(err.message)}</p>`; }
}

let teacherTestsCache = [];
async function renderTeacherRecentTests() {
  const tbody = document.getElementById("teacherRecentTestsBody"); if (!tbody || !isTeacherLike()) return;
  try {
    const data = await apiRequest("/api/tests/latest"); teacherTestsCache = data.tests || [];
    const semF = document.getElementById("teacherTestsSemesterFilter")?.value || "", typeF = document.getElementById("teacherTestsTypeFilter")?.value || "", gradeF = document.getElementById("teacherTestsGradeFilter")?.value || "";
    const visibleTests = teacherTestsCache.filter(t => (!semF || String(t.semester || 1) === semF) && (!typeF || (t.testType || "kttx") === typeF) && (!gradeF || String(t.grade || "") === gradeF));
    const filter = document.getElementById("teacherTestFilter");
    if (filter) { const cur = filter.value; filter.innerHTML = '<option value="">Tất cả bài kiểm tra</option>' + teacherTestsCache.map(t => `<option value="${t.id}" ${t.id == cur ? "selected" : ""}>${escapeHTML(t.title)}</option>`).join(""); }
    const docxMatrix = document.getElementById("docxModalMatrix");
    if (!visibleTests.length) { tbody.innerHTML = '<tr><td colspan="9" class="small muted" style="text-align:center">Chưa có bài kiểm tra nào.</td></tr>'; return; }
    tbody.innerHTML = visibleTests.map(t => {
      const s = t.summary || {};
      const structure = [s.objectiveCount ? `${s.objectiveCount} TN` : "", s.speakingCount ? `${s.speakingCount} Speaking` : "", s.manualCount ? `${s.manualCount} Writing` : ""].filter(Boolean).join(" · ");
      const typeCell = `<select class="role-select test-type-sel" data-test-id="${t.id}" style="padding:5px 26px 5px 8px;font-size:12px"><option value="kttx" ${(t.testType || "kttx") === "kttx" ? "selected" : ""}>KTTX</option><option value="ktgk" ${t.testType === "ktgk" ? "selected" : ""}>KTGK</option><option value="ktck" ${t.testType === "ktck" ? "selected" : ""}>KTCK</option></select> <select class="role-select test-sem-sel" data-test-id="${t.id}" style="padding:5px 26px 5px 8px;font-size:12px"><option value="1" ${Number(t.semester || 1) === 1 ? "selected" : ""}>HK1</option><option value="2" ${Number(t.semester) === 2 ? "selected" : ""}>HK2</option></select>${t.unitNo ? `<div class="small muted">Unit ${t.unitNo}</div>` : ""}`;
      return `<tr><td><strong>${escapeHTML(t.title)}</strong><div class="small muted">${escapeHTML(t.sourceFileName || "")}</div></td><td>${typeCell}</td><td>${t.className ? `<span class="badge blue">${escapeHTML(t.className)}</span>` : '<span class="badge">Tất cả lớp</span>'}</td><td class="small">${structure}</td><td>${difficultyPills(t.difficultyCounts)}</td><td><strong>${t.durationMinutes}'</strong></td><td class="small">${t.matrixId ? `#${t.matrixId}` : '<span class="muted">—</span>'}</td><td class="small muted">${fmtDate(t.createdAt)}</td><td><div style="display:flex;gap:6px"><button class="btn btn-light btn-sm analyze-test-btn" data-test-id="${t.id}" title="AI phân tích lại độ khó & thời gian"><i class=mi>smart_toy</i> Phân tích</button><button class="btn btn-light btn-sm delete-test-btn" data-test-id="${t.id}" style="color:#ef4444"><i class=mi>delete</i></button></div></td></tr>`;
    }).join("");
    tbody.querySelectorAll(".test-type-sel, .test-sem-sel").forEach(sel => sel.addEventListener("change", async () => {
      const id = sel.dataset.testId;
      const body = sel.classList.contains("test-type-sel") ? { testType: sel.value } : { semester: Number(sel.value) };
      try { const res = await apiRequest(`/api/teacher/tests/${id}`, { method: "PATCH", body: JSON.stringify(body) }); showToast(res.message); } catch (err) { showToast(err.message); }
    }));
    tbody.querySelectorAll(".delete-test-btn").forEach(btn => btn.addEventListener("click", async () => {
      const t = teacherTestsCache.find(x => x.id == btn.dataset.testId);
      if (!confirm(`Xóa bài kiểm tra "${t?.title}"? Bài làm của học sinh cũng sẽ bị xóa.`)) return;
      try { const res = await apiRequest(`/api/tests/${btn.dataset.testId}`, { method: "DELETE" }); showToast(res.message); renderTeacherRecentTests(); renderTeacherResults(); renderTeacherStats(); } catch (err) { showToast(err.message); }
    }));
    tbody.querySelectorAll(".analyze-test-btn").forEach(btn => btn.addEventListener("click", async () => {
      btn.disabled = true; btn.textContent = "⏳ AI đang phân tích...";
 try { const res = await apiRequest(`/api/teacher/tests/${btn.dataset.testId}/analyze`, { method:"POST", body: JSON.stringify({}) }); showToast(`${res.message} Dễ ${res.analysis.counts.easy} · TB ${res.analysis.counts.medium} · Khó ${res.analysis.counts.hard}. Thời gian: ${res.analysis.durations.full}' (cơ bản ${res.analysis.durations.regular}')`); renderTeacherRecentTests(); } catch (err) { showToast(err.message); btn.disabled = false; btn.textContent ="Phân tích"; }
    }));
  } catch (err) { tbody.innerHTML = `<tr><td colspan="9" class="small muted">${escapeHTML(err.message)}</td></tr>`; }
}
document.getElementById("refreshTeacherTestsBtn")?.addEventListener("click", () => { renderTeacherRecentTests(); showToast("Đã làm mới danh sách đề."); });
["teacherTestsSemesterFilter", "teacherTestsTypeFilter", "teacherTestsGradeFilter"].forEach(id => document.getElementById(id)?.addEventListener("change", renderTeacherRecentTests));

let matricesCache = [];
function matrixSummaryHtml(m) {
  const levels = (m.levels || []).map(l => `<span class="diff-pill ${l.key}">${escapeHTML(l.name)} ${l.ratio}%</span>`).join(" ");
  const tiers = m.tiers ? `<div class="small" style="margin-top:6px"><i class=mi>school</i> <b>${escapeHTML(m.tiers.advanced?.label || "Tăng cường")}</b>: dễ ${m.tiers.advanced?.easy}% · TB ${m.tiers.advanced?.medium}% · khó ${m.tiers.advanced?.hard}% (thời gian ×${m.tiers.advanced?.timeFactor}) &nbsp; | &nbsp; <b>${escapeHTML(m.tiers.regular?.label || "Thường")}</b>: dễ ${m.tiers.regular?.easy}% · TB ${m.tiers.regular?.medium}% · khó ${m.tiers.regular?.hard}% (×${m.tiers.regular?.timeFactor})</div>` : "";
  const skills = (m.skills || []).length ? `<div class="small muted" style="margin-top:4px">Kỹ năng: ${m.skills.map(s => `${escapeHTML(s.name)} (${s.questions || "?"} câu${s.points ? `, ${s.points}đ` : ""})`).join("; ")}</div>` : "";
  return `${levels}${tiers}${skills}${m.notes ? `<div class="small muted" style="margin-top:4px">${escapeHTML(m.notes)}</div>` : ""}`;
}
async function renderMatricesList() {
  const box = document.getElementById("matricesList"); if (!box || !isTeacherLike()) return;
  try {
    const data = await apiRequest("/api/teacher/test-matrices"); matricesCache = data.matrices || [];
    const sel = document.getElementById("docxModalMatrix");
    if (sel) sel.innerHTML = '<option value="">Mặc định (AI tự phân tầng)</option>' + matricesCache.map(m => `<option value="${m.id}">${escapeHTML(m.title)}</option>`).join("");
    box.innerHTML = matricesCache.length ? matricesCache.map(m => `<div class="matrix-item"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div><strong>#${m.id} · ${escapeHTML(m.title)}</strong><div class="small muted">${escapeHTML(m.sourceFileName || "")} · ${fmtDate(m.createdAt)} · ${m.matrix.source === "ai" ? "AI đọc" : "ước lượng"}</div></div><button class="btn btn-light btn-sm del-matrix" data-id="${m.id}" style="color:#ef4444">Xóa</button></div><div style="margin-top:8px">${matrixSummaryHtml(m.matrix)}</div></div>`).join("") : '<div class="empty-state">Chưa có ma trận nào. Bấm "<i class=mi>straighten</i> Ma trận đề" để upload.</div>';
    box.querySelectorAll(".del-matrix").forEach(b => b.addEventListener("click", async () => { if (!confirm("Xóa ma trận này?")) return; try { await apiRequest(`/api/teacher/test-matrices/${b.dataset.id}`, { method: "DELETE" }); renderMatricesList(); } catch (e) { showToast(e.message); } }));
  } catch (err) { box.innerHTML = `<div class="small" style="color:red">${escapeHTML(err.message)}</div>`; }
}
document.getElementById("refreshMatricesBtn")?.addEventListener("click", renderMatricesList);
document.getElementById("openMatrixModalBtn")?.addEventListener("click", () => { document.getElementById("matrixPreview").classList.add("hidden"); openModal("matrixModal"); });
document.getElementById("matrixUploadForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const file = document.getElementById("matrixFileInput").files[0]; if (!file) return showToast("Chọn file ma trận.");
  const btn = document.getElementById("submitMatrixBtn"); btn.disabled = true; btn.textContent = "⏳ AI đang đọc ma trận...";
  try {
    const res = await apiRequest("/api/teacher/test-matrices", { method: "POST", body: JSON.stringify({ documentBase64: await fileToDataUrl(file), fileName: file.name, title: document.getElementById("matrixTitleInput").value.trim() }) });
    const pv = document.getElementById("matrixPreview"); pv.classList.remove("hidden"); pv.innerHTML = `<div class="notice"><strong><i class=mi>check_circle</i> ${escapeHTML(res.message)}</strong><div style="margin-top:8px">${matrixSummaryHtml(res.matrix)}</div></div>`;
    showToast(res.message); e.target.reset(); renderMatricesList();
  } catch (err) { showToast(err.message); } finally { btn.disabled = false; btn.textContent = "AI đọc ma trận"; }
});

let classSettingsDraft = [];
async function openClassSettings() {
  openModal("classSettingsModal");
  const body = document.getElementById("classSettingsBody"); body.innerHTML = '<p class="small muted">Đang tải...</p>';
  try {
    const data = await apiRequest("/api/class-settings");
    const map = Object.fromEntries((data.settings || []).map(s => [s.className, s.tier]));
    const all = [...new Set([...(data.knownClasses || []), ...Object.keys(map)])].sort();
    classSettingsDraft = all.map(c => ({ className: c, tier: map[c] || "" }));
    renderClassSettingsRows();
  } catch (err) { body.innerHTML = `<p class="small" style="color:red">${escapeHTML(err.message)}</p>`; }
}
function renderClassSettingsRows() {
  const body = document.getElementById("classSettingsBody");
  body.innerHTML = classSettingsDraft.length ? `<div class="class-settings-grid">${classSettingsDraft.map((c, i) => `<div class="class-row"><strong>${escapeHTML(c.className)}</strong><select data-idx="${i}"><option value="" ${c.tier === "" ? "selected" : ""}>Chưa phân loại (đề đầy đủ)</option><option value="advanced" ${c.tier === "advanced" ? "selected" : ""}>Lớp tăng cường (đề nâng cao)</option><option value="regular" ${c.tier === "regular" ? "selected" : ""}>Lớp thường (đề cơ bản)</option></select></div>`).join("")}</div>` : '<p class="small muted">Chưa có lớp nào. Thêm lớp bên dưới.</p>';
  body.querySelectorAll("select[data-idx]").forEach(s => s.addEventListener("change", () => { classSettingsDraft[Number(s.dataset.idx)].tier = s.value; }));
}
document.getElementById("openClassSettingsBtn")?.addEventListener("click", openClassSettings);
document.getElementById("adminClassSettingsBtn")?.addEventListener("click", openClassSettings);
document.getElementById("addClassRowBtn")?.addEventListener("click", () => {
  const input = document.getElementById("newClassNameInput"); const name = input.value.trim().toUpperCase(); if (!name) return;
  if (!classSettingsDraft.some(c => c.className === name)) classSettingsDraft.push({ className: name, tier: "regular" });
  input.value = ""; renderClassSettingsRows();
});
document.getElementById("saveClassSettingsBtn")?.addEventListener("click", async () => {
  try { const res = await apiRequest("/api/teacher/class-settings", { method: "PUT", body: JSON.stringify({ settings: classSettingsDraft }) }); showToast(res.message); closeModal("classSettingsModal"); loadClassNames(); } catch (err) { showToast(err.message); }
});

document.getElementById("createTestBtn")?.addEventListener("click", () => { renderMatricesList(); openModal("createTestModal"); });
function showImportNotes(result) {
  const issues = result.keyIssues || [], dropped = result.dropped || [];
  if (!issues.length && !dropped.length) return;
  const body = document.getElementById("importNotesBody"); if (!body) return;
  body.innerHTML = (issues.length ? `<h4 style="margin:0 0 6px"><i class=mi>warning</i> ${issues.length} câu AI nghi đáp án gốc sai (đã dùng đáp án AI sửa)</h4><ul class="small" style="margin:0 0 12px 18px;line-height:1.6">${issues.map(i => `<li><b>Câu ${i.number}</b>: ${escapeHTML(i.note)}</li>`).join("")}</ul>` : "")
    + (dropped.length ? `<h4 style="margin:0 0 6px"><i class=mi>info</i> Câu bị bỏ qua</h4><ul class="small" style="margin:0 0 0 18px;line-height:1.6">${dropped.map(d => `<li>${escapeHTML(d.reason || "")} ${Array.isArray(d.numbers) && d.numbers.length ? "(câu " + d.numbers.join(", ") + ")" : ""}</li>`).join("")}</ul>` : "");
  openModal("importNotesModal");
}
function openCreateTestForSpec(spec) {
  renderMatricesList();
  const typeSel = document.getElementById("docxModalType"), semSel = document.getElementById("docxModalSemester"), unitSel = document.getElementById("docxModalUnit"), titleIn = document.getElementById("docxModalTitle");
  if (spec) {
    if (typeSel) typeSel.value = String(spec.type || "KTTX").toLowerCase();
    if (semSel) semSel.value = String(spec.term || 1);
    if (unitSel) unitSel.value = spec.type === "KTTX" && spec.units && spec.units.length === 1 ? String(spec.units[0]) : "";
    if (titleIn && !titleIn.value) titleIn.value = spec.name || "";
  }
  openModal("createTestModal");
}
(function fillUnitSelects() { document.querySelectorAll("#docxModalUnit").forEach(sel => { sel.innerHTML = '<option value="">— Không gắn Unit —</option>' + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Unit ${i + 1}</option>`).join(""); }); })();
document.querySelectorAll(".create-close").forEach(btn => btn.addEventListener("click", () => closeModal("createTestModal")));
document.getElementById("uploadDocxForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const file = document.getElementById("docxModalFileInput").files[0]; if (!file) return showToast("Vui lòng chọn file đề (Word hoặc PDF).");
  const submitBtn = document.getElementById("submitDocxBtn"); submitBtn.disabled = true; submitBtn.textContent = "⏳ AI đang đọc đề (30-60 giây)...";
  try {
    const result = await apiRequest("/api/tests/import-docx", { method: "POST", body: JSON.stringify({ documentBase64: await fileToDataUrl(file), fileName: file.name, title: document.getElementById("docxModalTitle").value.trim() || file.name.replace(/\.(docx|pdf)$/i, ""), className: document.getElementById("docxModalClass").value.trim().toUpperCase() || null, grade: document.getElementById("docxModalGrade")?.value || null, matrixId: document.getElementById("docxModalMatrix").value || null, testType: document.getElementById("docxModalType")?.value || "kttx", semester: Number(document.getElementById("docxModalSemester")?.value || 1), unitNo: document.getElementById("docxModalUnit")?.value || null }) });
    const a = result.analysis || {};
    showToast(`${result.message} ${result.summary.objectiveCount} TN, ${result.summary.speakingCount || 0} Speaking, ${result.summary.manualCount} Writing · AI: ${a.counts?.easy || 0} dễ / ${a.counts?.medium || 0} TB / ${a.counts?.hard || 0} khó · ${a.durationMinutes || 45} phút.`);
    showImportNotes(result);
    closeModal("createTestModal"); e.target.reset(); renderTeacherRecentTests(); renderTeacherStats();
  } catch (error) { showToast(error.message); } finally { submitBtn.disabled = false; submitBtn.textContent = "Tạo & Giao bài"; }
});

let teacherSubmissionsCache = [];
async function renderTeacherResults() {
  const tbody = document.getElementById("teacherResultsTableBody"); if (!tbody || !isTeacherLike()) return;
  const params = new URLSearchParams();
  const cf = document.getElementById("teacherClassFilter")?.value, tf = document.getElementById("teacherTestFilter")?.value;
  if (cf) params.append("className", cf); if (tf) params.append("testId", tf);
  try {
    const data = await apiRequest(`/api/teacher/results?${params}`); teacherSubmissionsCache = data.submissions || [];
    if (!teacherSubmissionsCache.length) { tbody.innerHTML = '<tr><td colspan="12" class="empty-state" style="text-align:center;padding:24px">Chưa có kết quả nộp bài nào theo điều kiện lọc.</td></tr>'; return; }
    tbody.innerHTML = teacherSubmissionsCache.map((item, idx) => {
      const isPending = item.status === "pending_manual";
      const writingBtn = item.manualScore !== null ? `<button class="btn btn-sm grade-writing-click" data-submission-id="${item.id}" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;border-radius:8px;font-weight:700;padding:3px 9px"><i class=mi>edit</i> ${Number(item.manualScore).toFixed(2)} đ</button>` : `<button class="btn btn-sm grade-writing-click" data-submission-id="${item.id}" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;border-radius:8px;font-weight:700;padding:3px 9px"><i class=mi>edit</i> Chờ chấm</button>`;
      const cls = item.scoreOnTen >= 8 ? "high" : item.scoreOnTen >= 5 ? "mid" : "low";
      const tabV = Number(item.tabViolations || 0);
      const anti = item.isForcedSubmit || tabV >= 3 ? '<span class="badge red"><i class=mi>block</i> Bị thu bài</span>' : tabV === 2 ? '<span class="badge orange"><i class=mi>warning</i> 2 lần rời tab</span>' : tabV === 1 ? '<span class="badge orange"><i class=mi>warning</i> 1 lần rời tab</span>' : '<span class="badge green"><i class=mi>check</i> Nghiêm túc</span>';
      return `<tr><td>${idx + 1}</td><td><strong>${escapeHTML(item.studentName)}</strong><br><span class="small muted">${escapeHTML(item.studentEmail)}</span></td><td><span class="badge blue">${escapeHTML(item.studentClass)}</span></td><td><strong>${escapeHTML(item.testTitle)}</strong></td><td class="small">${item.variant === "regular" ? "Cơ bản" : item.variant === "advanced" ? "Nâng cao" : "Đầy đủ"}</td><td>${Number(item.objectiveScore).toFixed(2)}${item.speakingScore ? `<div class="small muted">Spk ${Number(item.speakingScore).toFixed(2)}</div>` : ""}</td><td>${writingBtn}</td><td><strong class="total-score-badge ${cls}">${item.scoreOnTen} / 10</strong></td><td>${anti}</td><td><span class="badge ${isPending ? "orange" : "green"}">${isPending ? "Chờ chấm Writing" : "Đã hoàn thành"}</span></td><td class="small">${fmtDate(item.submittedAt, true)}</td><td><div style="display:flex;gap:4px"><button class="btn btn-light btn-sm view-submission-btn" data-submission-id="${item.id}">Chi tiết</button><button class="btn btn-light btn-sm delete-sub-btn" data-sub-id="${item.id}" style="color:#ef4444;padding:4px 7px"><i class=mi>delete</i></button></div></td></tr>`;
    }).join("");
    tbody.querySelectorAll(".view-submission-btn, .grade-writing-click").forEach(btn => btn.addEventListener("click", () => { const sub = teacherSubmissionsCache.find(s => s.id == btn.dataset.submissionId); if (sub) openSubmissionDetail(sub); }));
    tbody.querySelectorAll(".delete-sub-btn").forEach(btn => btn.addEventListener("click", async () => { if (!confirm("Xóa bài nộp này?")) return; try { const res = await apiRequest(`/api/teacher/submissions/${btn.dataset.subId}`, { method: "DELETE" }); showToast(res.message); renderTeacherResults(); renderTeacherStats(); } catch (err) { showToast(err.message); } }));
  } catch (error) { tbody.innerHTML = `<tr><td colspan="12" class="empty-state" style="color:red;padding:20px">${escapeHTML(error.message)}</td></tr>`; }
}
document.getElementById("teacherClassFilter")?.addEventListener("change", renderTeacherResults);
document.getElementById("teacherTestFilter")?.addEventListener("change", renderTeacherResults);
document.getElementById("refreshTeacherResults")?.addEventListener("click", () => { renderTeacherResults(); renderTeacherStats(); showToast("Đã làm mới bảng điểm."); });

function openSubmissionDetail(sub) {
  const modal = document.getElementById("submissionDetailModal"), body = document.getElementById("submissionDetailBody");
  const isTeacher = isTeacherLike();
  const updateHeader = () => {
    document.getElementById("submissionDetailTitle").textContent = isTeacher ? `Bài làm: ${sub.studentName} (${sub.studentClass || "—"})` : `Chi tiết bài làm: ${sub.testTitle}`;
    document.getElementById("submissionDetailSubtitle").textContent = `${sub.testTitle} · Tự động: ${Number(sub.objectiveScore).toFixed(2)} · Writing: ${sub.manualScore !== null ? Number(sub.manualScore).toFixed(2) : "Chờ chấm"} · Tổng: ${sub.scoreOnTen}/10`;
  };
  updateHeader();
  const writingEntries = Object.entries(sub.writingAnswers || {});
  const speakingEntries = Object.entries(sub.speakingAnswers || {});
  const objectiveAnswers = sub.objectiveAnswers || {};
  const objKeys = Object.keys(objectiveAnswers).filter(k => !k.startsWith("__"));
  const gradeBlock = writingEntries.length ? (isTeacher ? `<form id="modalGradeForm" style="margin-top:14px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px"><div style="display:grid;grid-template-columns:160px 1fr;gap:12px"><div><label class="small" style="font-weight:700;display:block;margin-bottom:4px">Điểm Writing:</label><input type="number" min="0" max="10" step="0.25" id="modalScoreInput" value="${sub.manualScore !== null ? sub.manualScore : ""}" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700" required></div><div><label class="small" style="font-weight:700;display:block;margin-bottom:4px">Nhận xét:</label><textarea id="modalFeedbackInput" style="width:100%;min-height:58px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px">${escapeHTML(sub.teacherFeedback || "")}</textarea></div></div><div style="text-align:right;margin-top:12px"><button type="submit" class="btn btn-primary" id="modalSaveGradeBtn"><i class=mi>save</i> Lưu điểm & nhận xét</button></div></form>` : `<div style="margin-top:14px;padding:12px;background:${sub.manualScore !== null ? "#f0fdf4" : "#fffbeb"};border-radius:10px"><strong>Nhận xét của giáo viên:</strong> ${sub.manualScore !== null ? `<span class="badge green">${Number(sub.manualScore).toFixed(2)} đ</span>` : '<span class="badge orange">Chờ chấm</span>'}<p style="margin:6px 0 0">${escapeHTML(sub.teacherFeedback || (sub.manualScore !== null ? "Giáo viên không để lại nhận xét." : "Bài đang được giáo viên chấm."))}</p></div>`) : "";
  body.innerHTML = `<div class="submission-detail-container">
    <div class="submission-summary-header"><div><strong>Học sinh:</strong> ${escapeHTML(sub.studentName || currentUser?.fullName || "")}</div><div><strong>Lớp:</strong> ${escapeHTML(sub.studentClass || currentUser?.className || "—")}</div><div><strong>Nộp lúc:</strong> ${fmtDate(sub.submittedAt, true)}</div><div><strong>Tổng điểm:</strong> <strong id="modalTotalScore10" style="color:var(--primary);font-size:1.2rem">${sub.scoreOnTen} / 10</strong></div>${sub.timeSpentSeconds ? `<div><strong>Thời gian làm:</strong> ${Math.round(sub.timeSpentSeconds / 60)} phút</div>` : ""}</div>
    ${Number(sub.tabViolations) > 0 ? `<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;color:#92400e"><i class=mi>warning</i> Rời tab ${sub.tabViolations} lần · trừ ${sub.violationPenalty} điểm${sub.isForcedSubmit ? " · Bị thu bài tự động" : ""}</div>` : '<div style="padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#166534"><i class=mi>shield</i> Làm bài nghiêm túc, không vi phạm.</div>'}
    ${speakingEntries.length ? `<div class="detail-section"><h4><i class=mi>mic</i> Phần Speaking (AI chấm)</h4>${speakingEntries.map(([k, v]) => `<div class="detail-writing-box"><strong class="small">${escapeHTML(v.prompt || k)}</strong><div class="small">Độ chuẩn: <b>${v.accuracy}%</b> · AI nghe: "${escapeHTML(v.transcript || "")}"</div></div>`).join("")}</div>` : ""}
    ${writingEntries.length ? `<div class="detail-section" style="border:2px solid #818cf8"><h4><i class=mi>edit</i> Bài làm Writing</h4>${writingEntries.map(([k, val]) => `<div class="detail-writing-box"><strong class="small">${escapeHTML(k)}</strong><div class="detail-student-answer">${escapeHTML(val || "Học sinh không nhập nội dung.")}</div></div>`).join("")}${gradeBlock}</div>` : ""}
    ${objKeys.length ? `<div class="detail-section"><h4>Đáp án trắc nghiệm đã chọn</h4><div class="detail-answers-grid">${objKeys.map(k => `<div class="detail-answer-chip"><span>${escapeHTML(k)}:</span><strong>${escapeHTML(String(objectiveAnswers[k] || "—"))}</strong></div>`).join("")}</div></div>` : ""}</div>`;
  const gradeForm = document.getElementById("modalGradeForm");
  gradeForm?.addEventListener("submit", async e => {
    e.preventDefault();
    const scoreVal = Number(document.getElementById("modalScoreInput").value), feedbackVal = document.getElementById("modalFeedbackInput").value.trim();
    try {
      const res = await apiRequest(`/api/teacher/writing-submissions/${sub.id}`, { method: "PATCH", body: JSON.stringify({ score: scoreVal, feedback: feedbackVal }) });
      showToast(res.message); sub.manualScore = scoreVal; sub.teacherFeedback = feedbackVal; sub.status = "graded";
      sub.scoreOnTen = ((Number(sub.objectiveScore) + scoreVal) / Number(sub.maxScore || 10) * 10).toFixed(1);
      updateHeader(); document.getElementById("modalTotalScore10").textContent = `${sub.scoreOnTen} / 10`; renderTeacherResults(); renderTeacherStats();
    } catch (err) { showToast(err.message); }
  });
  modal.classList.remove("hidden");
}
document.querySelectorAll(".detail-close").forEach(btn => btn.addEventListener("click", () => closeModal("submissionDetailModal")));

const createSpeakingTaskModal = document.getElementById("createSpeakingTaskModal");
[document.getElementById("createSpeakingTaskBtn"), document.getElementById("btnOpenSpeakingModalAgain")].forEach(b => b?.addEventListener("click", () => createSpeakingTaskModal.classList.remove("hidden")));
[document.getElementById("closeSpeakingTaskModal"), document.getElementById("cancelSpeakingTaskBtn")].forEach(b => b?.addEventListener("click", () => createSpeakingTaskModal.classList.add("hidden")));
document.getElementById("btnPreviewSpeakingTts")?.addEventListener("click", () => { const first = (document.getElementById("newSpeakingSentence").value.split("\n").map(l => l.trim()).filter(Boolean)[0] || "").replace(/^[AB]\s*:\s*/i, ""); if (first) speakEnglishText(first); });
document.getElementById("createSpeakingTaskForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const title = document.getElementById("newSpeakingTitle").value.trim();
  const stage = document.getElementById("newSpeakingStage").value;
  const className = document.getElementById("newSpeakingClass").value.trim().toUpperCase();
  const lines = document.getElementById("newSpeakingSentence").value.split("\n").map(l => l.trim()).filter(Boolean);
  if (!title || !lines.length) return showToast("Vui lòng nhập tiêu đề và ít nhất một câu.");
  const items = lines.map(l => { const m = l.match(/^([A-Za-z][A-Za-z ]{0,10})\s*:\s*(.+)$/); return m ? { speaker: m[1].trim(), text: m[2].trim() } : { text: l }; });
  const btn = document.getElementById("submitSpeakingTaskBtn"); btn.disabled = true; btn.textContent = "⏳ AI đang tạo IPA & dịch...";
  try {
    const res = await apiRequest("/api/teacher/speaking-assignments", { method: "POST", body: JSON.stringify({ title, className, stage, items }) });
    showToast(res.message); createSpeakingTaskModal.classList.add("hidden"); e.target.reset(); loadTeacherSpeakingTasks(); renderTeacherStats();
  } catch (err) { showToast(err.message); } finally { btn.disabled = false; btn.textContent = "Giao bài cho học sinh"; }
});
document.getElementById("openSpeakingUnitModalBtn")?.addEventListener("click", () => openModal("speakingUnitModal"));
document.getElementById("speakingUnitForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const file = document.getElementById("speakingUnitFile").files[0]; if (!file) return showToast("Chọn file SGK.");
  const stagesVal = document.getElementById("speakingUnitStages").value;
  const btn = document.getElementById("submitSpeakingUnitBtn"); btn.disabled = true; btn.textContent = "⏳ AI đang đọc SGK và soạn bài (30-60s)...";
  try {
    const res = await apiRequest("/api/teacher/speaking-units", { method: "POST", body: JSON.stringify({ documentBase64: await fileToDataUrl(file), fileName: file.name, unitTitle: document.getElementById("speakingUnitTitle").value.trim(), title: document.getElementById("speakingUnitTitle").value.trim(), className: document.getElementById("speakingUnitClass").value.trim().toUpperCase(), stages: stagesVal === "both" ? ["1", "2"] : [stagesVal], count: Number(document.getElementById("speakingUnitCount").value) }) });
    showToast(res.message); closeModal("speakingUnitModal"); e.target.reset();
    document.querySelector('[data-teacher-tab="speaking"]')?.click();
  } catch (err) { showToast(err.message); } finally { btn.disabled = false; btn.textContent = "AI tạo bài luyện nói"; }
});
document.getElementById("tabSpeakingTasksList")?.addEventListener("click", () => { document.getElementById("tabSpeakingTasksList").classList.add("active"); document.getElementById("tabSpeakingSubmissionsList").classList.remove("active"); document.getElementById("panelSpeakingTasksList").style.display = "block"; document.getElementById("panelSpeakingSubmissionsList").style.display = "none"; });
document.getElementById("tabSpeakingSubmissionsList")?.addEventListener("click", () => { document.getElementById("tabSpeakingSubmissionsList").classList.add("active"); document.getElementById("tabSpeakingTasksList").classList.remove("active"); document.getElementById("panelSpeakingTasksList").style.display = "none"; document.getElementById("panelSpeakingSubmissionsList").style.display = "block"; loadTeacherSpeakingSubmissions(); });
document.getElementById("refreshTeacherSpeakingBtn")?.addEventListener("click", () => { loadTeacherSpeakingTasks(); loadTeacherSpeakingSubmissions(); showToast("Đã làm mới."); });
async function loadTeacherSpeakingTasks() {
  const tbody = document.getElementById("teacherSpeakingTasksTableBody"); if (!tbody || !isTeacherLike()) return;
  try {
    const res = await apiRequest("/api/speaking/assignments");
    const list = res.assignments || [];
    document.getElementById("teacherStatSpeaking").textContent = list.length;
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="9" class="small muted" style="text-align:center;padding:24px">Chưa có bài luyện nói. Dùng "<i class=mi>auto_stories</i> SGK → Bài nói AI" hoặc "<i class=mi>mic</i> Giao bài Speaking".</td></tr>'; return; }
    tbody.innerHTML = list.map((item, idx) => `<tr><td>${idx + 1}</td><td><strong>${escapeHTML(item.title)}</strong>${item.unitTitle ? `<div class="small muted">${escapeHTML(item.unitTitle)}</div>` : ""}</td><td><span class="badge ${item.stage === 1 ? "green" : "orange"}">GĐ${item.stage}</span></td><td>${item.className ? `<span class="badge blue">${escapeHTML(item.className)}</span>` : '<span class="badge gray">Toàn khối</span>'}</td><td class="small"><div class="clamp-3">${item.items.slice(0, 3).map(i => `${i.speaker ? `<b>${escapeHTML(i.speaker)}:</b> ` : ""}${escapeHTML(i.text)}`).join("<br>")}${item.items.length > 3 ? `<br>… (+${item.items.length - 3})` : ""}</div></td><td>${item.itemCount}</td><td><span class="badge green">${item.submissionCount || 0}</span></td><td class="small muted">${fmtDate(item.createdAt)}</td><td><div style="display:flex;gap:6px"><button class="btn btn-soft btn-sm btn-spk-listen" data-text="${escapeHTML(item.items[0]?.text || "")}">Nghe</button><button class="btn btn-danger btn-sm btn-spk-del" data-id="${item.id}"><i class=mi>close</i></button></div></td></tr>`).join("");
    tbody.querySelectorAll(".btn-spk-listen").forEach(btn => btn.addEventListener("click", () => speakEnglishText(btn.dataset.text)));
    tbody.querySelectorAll(".btn-spk-del").forEach(btn => btn.addEventListener("click", async () => { if (!confirm("Xóa bài luyện nói này?")) return; try { await apiRequest(`/api/teacher/speaking-assignments/${btn.dataset.id}`, { method: "DELETE" }); showToast("Đã xóa."); loadTeacherSpeakingTasks(); loadTeacherSpeakingSubmissions(); } catch (e) { showToast(e.message); } }));
  } catch (e) { tbody.innerHTML = `<tr><td colspan="9" class="small muted" style="color:#ef4444;text-align:center;padding:20px">${escapeHTML(e.message)}</td></tr>`; }
}
async function loadTeacherSpeakingSubmissions() {
  const tbody = document.getElementById("teacherSpeakingSubmissionsTableBody"); if (!tbody || !isTeacherLike()) return;
  try {
    const res = await apiRequest("/api/teacher/speaking-submissions");
    const list = res.submissions || [];
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="8" class="small muted" style="text-align:center;padding:24px">Chưa có học sinh nào nộp bài Speaking.</td></tr>'; return; }
    tbody.innerHTML = list.map((sub, idx) => { const best = Number(sub.best_accuracy || sub.accuracy_percent || 0); return `<tr><td>${idx + 1}</td><td><strong>${escapeHTML(sub.student_name)}</strong><div class="small muted">${escapeHTML(sub.student_email)}</div></td><td><span class="badge blue">${escapeHTML(sub.student_class || "—")}</span></td><td><div style="font-weight:600">${escapeHTML(sub.task_title)}</div><span class="badge ${sub.stage == 2 ? "orange" : "green"}">GĐ${sub.stage || 1}</span></td><td><span class="badge ${best >= 80 ? "green" : best >= 60 ? "orange" : "red"}" style="font-weight:800">${best}%</span><div class="small muted">Lần cuối ${sub.accuracy_percent}%</div></td><td>${sub.attempts || 1}</td><td class="small">${(sub.items_result || []).length ? sub.items_result.map(r => `<span class="word-pill ${r.accuracy >= 80 ? "correct" : r.accuracy >= 60 ? "near" : "missed"}" title="${escapeHTML(r.transcript || "")}">#${r.index + 1}: ${r.accuracy}%</span>`).join(" ") : `<em>"${escapeHTML(sub.spoken_transcript || "-")}"</em>`}</td><td class="small muted">${fmtDate(sub.submitted_at, true)}</td></tr>`; }).join("");
  } catch (e) { tbody.innerHTML = `<tr><td colspan="8" class="small muted" style="color:#ef4444;text-align:center;padding:20px">${escapeHTML(e.message)}</td></tr>`; }
}

async function renderParentDashboard() {
  if (!currentUser || currentUser.role !== "parent") return;
  const tableBody = document.getElementById("parentSubmissionsTableBody");
  try {
    const res = await apiRequest("/api/parent/student-data");
    const student = res.student, stats = res.stats || {}, submissions = res.submissions || [], p = res.progress;
    document.getElementById("parentStudentBadge").textContent = student ? `Học sinh: ${student.fullName} · Lớp ${student.className}` : "Học sinh: Chưa liên kết";
    const avg = Number(stats.avgScore || 0);
    document.getElementById("parentAvgScoreHero").textContent = avg > 0 ? avg.toFixed(1) : "--";
    document.getElementById("parentAvgScoreRing").style.background = `conic-gradient(#10b981 0 ${Math.min(100, Math.round(avg * 10))}%, rgba(255,255,255,.16) ${Math.min(100, Math.round(avg * 10))}%)`;
    document.getElementById("parentTotalDone").textContent = stats.totalTests || 0;
    document.getElementById("parentSpeakingAvg").textContent = p && p.speaking.totalAttempts ? `${p.speaking.avgAccuracy}%` : "--%";
    const rate = stats.integrityRate ?? 100; const integ = document.getElementById("parentIntegrityRate"); integ.textContent = `${rate}%`; integ.style.color = rate >= 90 ? "#16a34a" : rate >= 70 ? "#d97706" : "#dc2626";
    document.getElementById("parentTotalViolations").textContent = stats.totalViolations || 0;
    document.getElementById("parentTitleChips").innerHTML = p ? p.earnedTitles.map(titleChip).join("") : "";
    tableBody.innerHTML = submissions.length ? submissions.map(item => { const cls = item.scoreOnTen >= 8 ? "high" : item.scoreOnTen >= 5 ? "mid" : "low"; const v = item.isForcedSubmit || item.tabViolations >= 3 ? '<span class="badge red"><i class=mi>block</i> Rời tab 3 lần</span>' : item.tabViolations ? `<span class="badge orange"><i class=mi>warning</i> Rời tab ${item.tabViolations} lần</span>` : '<span class="badge green"><i class=mi>check</i> Nghiêm túc</span>'; return `<tr><td><strong>${escapeHTML(item.testTitle)}</strong></td><td><strong class="total-score-badge ${cls}">${item.scoreOnTen}/10</strong></td><td>${v}</td><td class="small">${escapeHTML(item.teacherFeedback || "Chưa có nhận xét")}</td><td class="small muted">${fmtDate(item.submittedAt)}</td></tr>`; }).join("") : '<tr><td colspan="5" class="small muted" style="text-align:center;padding:24px">Con em chưa có bài kiểm tra nào được nộp.</td></tr>';
    barChart(document.getElementById("parentSkillChart"), p ? Object.keys(SKILL_LABELS).map(k => ({ label: k, value: p.skills[k] })) : [], { suffix: "%" });
  } catch (err) { console.error("renderParentDashboard error:", err); }
}
document.getElementById("refreshParentDataBtn")?.addEventListener("click", () => { renderParentDashboard(); showToast("Đã làm mới dữ liệu."); });

const roleLabels = { student: "Học sinh", teacher: "Giáo viên", parent: "Phụ huynh", admin: "Quản trị viên" };
const statusLabels = { active: "Đang hoạt động", pending: "Chờ duyệt", locked: "Đã khóa" };
let adminUsers = [];
function getAdminLogs() { try { return JSON.parse(localStorage.getItem("engoAdminLogs") || "[]"); } catch { return []; } }
function addAdminLog(title, detail) { const logs = getAdminLogs(); logs.unshift({ title, detail, time: new Date().toISOString() }); localStorage.setItem("engoAdminLogs", JSON.stringify(logs.slice(0, 50))); }
async function renderDataAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;
  const term = (document.getElementById("dataSearch")?.value || "").trim().toLowerCase();
  try { adminUsers = (await apiRequest("/api/admin/users")).users || []; } catch (err) { showToast(err.message); return; }
  document.getElementById("dbUserCount").textContent = adminUsers.length;
  document.getElementById("dbStudentCount").textContent = adminUsers.filter(u => u.role === "student").length;
  document.getElementById("dbTeacherCount").textContent = adminUsers.filter(u => u.role === "teacher").length;
  const users = adminUsers.filter(u => `${u.fullName} ${u.email} ${u.role} ${u.className || ""}`.toLowerCase().includes(term));
  document.getElementById("userTableBody").innerHTML = users.map(u => `<tr><td><strong>${escapeHTML(u.fullName)}</strong></td><td>${escapeHTML(u.email)}</td><td>${u.role === "student" && u.className ? `Học sinh (${escapeHTML(u.className)})` : roleLabels[u.role] || u.role}</td><td><span class="badge ${u.status === "active" ? "green" : u.status === "locked" ? "red" : "orange"}">${statusLabels[u.status] || u.status}</span></td><td><button class="btn btn-light btn-sm user-toggle" data-user-id="${u.id}" data-user-status="${u.status}">${u.status === "locked" ? "Mở khóa" : u.status === "pending" ? "Duyệt" : "Khóa"}</button> <button class="btn btn-danger btn-sm user-delete" data-user-id="${u.id}">Xóa</button></td></tr>`).join("") || '<tr><td colspan="5" class="empty-state">Không tìm thấy tài khoản.</td></tr>';
  try {
    const tests = (await apiRequest("/api/tests/latest")).tests || [];
    document.getElementById("dbTestCount").textContent = tests.length;
    document.getElementById("testTableBody").innerHTML = tests.filter(t => `${t.title} ${t.className || ""}`.toLowerCase().includes(term)).map(t => `<tr><td><strong>${escapeHTML(t.title)}</strong></td><td>${escapeHTML(t.className || "Tất cả")}</td><td>${t.summary?.questionCount || 0}</td><td>${t.durationMinutes}'</td><td class="small muted">${fmtDate(t.createdAt)}</td></tr>`).join("") || '<tr><td colspan="5" class="empty-state">Chưa có bài kiểm tra.</td></tr>';
  } catch (e) {}
  document.getElementById("activityLog").innerHTML = getAdminLogs().filter(l => `${l.title} ${l.detail}`.toLowerCase().includes(term)).map(l => `<div class="log-item"><div class="log-icon">▤</div><div><strong>${escapeHTML(l.title)}</strong><p>${escapeHTML(l.detail)}</p></div><span class="small muted">${fmtDate(l.time, true)}</span></div>`).join("") || '<div class="empty-state">Chưa có nhật ký.</div>';
  try {
    const h = await apiRequest("/api/health");
    document.getElementById("systemHealthBadge").textContent = "Hoạt động tốt";
    document.getElementById("systemHealthList").innerHTML = `<div class="health-row"><strong>Ứng dụng</strong><div class="health-meter"><span style="width:100%"></span></div><b>OK</b></div><div class="health-row"><strong>MySQL</strong><div class="health-meter"><span style="width:100%"></span></div><b>OK</b></div><p class="small muted" style="margin:6px 0 0">Giờ máy chủ CSDL: ${fmtDate(h.databaseTime, true)}</p>`;
  } catch (e) { document.getElementById("systemHealthBadge").textContent = "Lỗi CSDL"; }
  document.querySelectorAll(".user-toggle").forEach(btn => btn.addEventListener("click", async () => {
    const next = btn.dataset.userStatus === "active" ? "locked" : "active";
    try { await apiRequest(`/api/admin/users/${btn.dataset.userId}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) }); addAdminLog("Cập nhật tài khoản", `Đổi trạng thái tài khoản #${btn.dataset.userId} -> ${next}`); showToast(next === "active" ? "Đã kích hoạt tài khoản" : "Đã khóa tài khoản"); renderDataAdmin(); } catch (err) { showToast(err.message); }
  }));
  document.querySelectorAll(".user-delete").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Xóa tài khoản này khỏi MySQL?")) return;
    try { await apiRequest(`/api/admin/users/${btn.dataset.userId}`, { method: "DELETE", body: "{}" }); addAdminLog("Xóa tài khoản", `Đã xóa tài khoản #${btn.dataset.userId}`); showToast("Đã xóa tài khoản"); renderDataAdmin(); } catch (err) { showToast(err.message); }
  }));
}
document.querySelectorAll("[data-data-tab]").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll("[data-data-tab]").forEach(x => x.classList.toggle("active", x === btn)); document.querySelectorAll(".data-panel").forEach(p => p.classList.toggle("active", p.id === `data-${btn.dataset.dataTab}`)); }));
document.getElementById("dataSearch")?.addEventListener("input", () => renderDataAdmin());
document.getElementById("openAddUser")?.addEventListener("click", () => openModal("addUserModal"));
document.querySelectorAll(".add-user-close").forEach(btn => btn.addEventListener("click", () => closeModal("addUserModal")));
document.getElementById("newUserRole")?.addEventListener("change", e => { document.getElementById("newUserClassGroup").style.display = e.target.value === "student" ? "grid" : "none"; });
document.getElementById("addUserForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify({ fullName: document.getElementById("newUserName").value.trim(), email: document.getElementById("newUserEmail").value.trim(), password: document.getElementById("newUserPassword").value, role: document.getElementById("newUserRole").value, className: document.getElementById("newUserClass").value.trim().toUpperCase(), status: document.getElementById("newUserStatus").value }) });
    closeModal("addUserModal"); e.target.reset(); addAdminLog("Thêm tài khoản", "Đã thêm tài khoản mới"); showToast("Đã thêm tài khoản"); renderDataAdmin(); loadClassNames();
  } catch (err) { showToast(err.message); }
});
function downloadJSON(data, filename) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
document.getElementById("exportDataBtn")?.addEventListener("click", async () => { try { const users = (await apiRequest("/api/admin/users")).users; const tests = (await apiRequest("/api/tests/latest")).tests; downloadJSON({ users, tests, exportedAt: new Date().toISOString() }, `engo-data-${dateKey()}.json`); showToast("Đã xuất dữ liệu JSON"); } catch (err) { showToast(err.message); } });
document.getElementById("backupNow")?.addEventListener("click", () => { document.getElementById("exportDataBtn").click(); document.getElementById("lastBackupText").textContent = `Đã sao lưu lúc ${new Date().toLocaleString("vi-VN")}.`; });
document.getElementById("importDataBtn")?.addEventListener("click", () => document.getElementById("jsonImportInput").click());
document.getElementById("jsonImportInput")?.addEventListener("change", e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(reader.result); addAdminLog("Nhập JSON", `Đã đọc file ${file.name} (${(imported.users || []).length} tài khoản)`); showToast("Đã đọc file JSON (chỉ ghi nhật ký; tài khoản MySQL không bị thay đổi)."); renderDataAdmin(); } catch { showToast("File JSON không đúng cấu trúc"); } }; reader.readAsText(file); });

const notificationItems = [
 { id:"speaking2", icon:"", title:"Luyện nói 2 giai đoạn", detail:"Câu đơn → hội thoại. AI chấm thân thiện với mọi giọng đọc.", time:"Mới"},
 { id:"tests", icon:"", title:"Bài kiểm tra theo ma trận", detail:"Đề được AI phân tích độ khó và thời gian phù hợp từng lớp.", time:"Mới"},
 { id:"vocab", icon:"", title:"Vocabulary có kiểm tra", detail:"Hoàn thành bộ thẻ rồi làm trắc nghiệm / nối từ để nhận điểm.", time:"Mới"},
 { id:"titles", icon:"", title:"Danh hiệu mới", detail:"Vua Phát Âm, Vua Ngữ Pháp, Vua Từ Vựng... đang chờ bạn.", time:"Mới"}
];
function getReadNotifications() { try { return JSON.parse(localStorage.getItem(getUserStorageKey("engoNotificationsReadV3")) || "[]"); } catch { return []; } }
function renderNotifications() {
  const read = getReadNotifications();
  document.getElementById("notificationDot").classList.toggle("hidden", notificationItems.every(n => read.includes(n.id)));
  document.getElementById("notificationList").innerHTML = notificationItems.map(n => `<div class="notification-item ${read.includes(n.id) ? "" : "unread"}"><div class="notification-icon">${n.icon}</div><div><strong>${n.title}</strong><p>${n.detail}</p><time>${n.time}</time></div></div>`).join("");
}
const notifBtn = document.getElementById("notificationBtn");
notifBtn?.addEventListener("click", e => { e.stopPropagation(); document.getElementById("notificationPanel").classList.toggle("open"); });
document.getElementById("markNotificationsRead")?.addEventListener("click", () => { localStorage.setItem(getUserStorageKey("engoNotificationsReadV3"), JSON.stringify(notificationItems.map(n => n.id))); renderNotifications(); });
document.addEventListener("click", e => { const panel = document.getElementById("notificationPanel"); if (panel.classList.contains("open") && !panel.contains(e.target) && e.target !== notifBtn) panel.classList.remove("open"); });

const capybaraChatWindow = document.getElementById("capybaraChatWindow");
const capybaraChatInput = document.getElementById("capybaraChatInput");
const capybaraChatMessages = document.getElementById("capybaraChatMessages");
let chatHistory = [];
function toggleCapybaraChat() { const hidden = capybaraChatWindow.classList.contains("hidden"); capybaraChatWindow.classList.toggle("hidden", !hidden); if (hidden) setTimeout(() => capybaraChatInput.focus(), 150); }
document.getElementById("capybaraChatTrigger")?.addEventListener("click", toggleCapybaraChat);
document.getElementById("btnMinimizeChat")?.addEventListener("click", toggleCapybaraChat);
function appendChatMessage(sender, text) {
  const el = document.createElement("div"); el.className = sender === "user" ? "chat-msg user-msg" : "chat-msg capybara-msg";
  const formatted = escapeHTML(text).replace(/### (.*)/g, '<strong style="display:block;font-size:14px;color:#047857;margin-bottom:6px">$1</strong>').replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/\n\* (.*)/g, '<div style="margin-left:8px">• $1</div>').replace(/\n/g, "<br/>");
  el.innerHTML = `<img src="./images/engocircle.png" class="chat-avatar" alt="${sender}" /><div class="chat-bubble"><div>${formatted}</div></div>`;
  capybaraChatMessages.appendChild(el); capybaraChatMessages.scrollTop = capybaraChatMessages.scrollHeight;
  try {
    if (window.renderMathInElement) renderMathInElement(el.querySelector(".chat-bubble"), { delimiters: [{ left: "$", right: "$", display: true }, { left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }, { left: "$", right: "$", display: false }], throwOnError: false });
  } catch (_) {}
}
async function sendCapybaraMessage(textToSend) {
  const text = (textToSend || capybaraChatInput.value).trim(); if (!text) return;
  appendChatMessage("user", text); capybaraChatInput.value = ""; chatHistory.push({ role: "user", content: text });
  const typing = document.createElement("div"); typing.className = "chat-msg capybara-msg"; typing.innerHTML = `<img src="./images/engocircle.png" class="chat-avatar" alt="Capybara" /><div class="chat-bubble"><em class="small muted">Capybara đang suy nghĩ...<i class=mi>chat_bubble</i></em></div>`;
  capybaraChatMessages.appendChild(typing); capybaraChatMessages.scrollTop = capybaraChatMessages.scrollHeight;
  try {
    const res = await apiRequest("/api/ai/chat", { method: "POST", body: JSON.stringify({ message: text, history: chatHistory }) });
    typing.remove(); appendChatMessage("capybara", res.reply || "Capybara đã nhận được câu hỏi!"); chatHistory.push({ role: "assistant", content: res.reply || "" });
    if (currentUser?.role === "student" && Math.random() < 0.3) gainRewards(5, 1, "Hỏi bài cùng Capybara");
  } catch (err) { typing.remove(); appendChatMessage("capybara", "Chào bạn! " + err.message); }
}
document.getElementById("capybaraChatSendBtn")?.addEventListener("click", () => sendCapybaraMessage());
capybaraChatInput?.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); sendCapybaraMessage(); } });
document.querySelectorAll(".chat-chip").forEach(chip => chip.addEventListener("click", () => sendCapybaraMessage(chip.dataset.prompt)));

document.getElementById("globalSearch")?.addEventListener("keydown", e => {
  if (e.key !== "Enter" || !currentUser) return;
  const q = e.target.value.trim().toLowerCase(); if (!q) return;
  if (currentUser.role !== "student") { switchView(ROLE_HOME[currentUser.role]); return; }
  if (/từ vựng|vocab|unit/.test(q)) switchView("vocabulary"); else if (/nói|speak|phát âm/.test(q)) switchView("speaking-lab"); else if (/lỗi|chữa/.test(q)) switchView("errorHealing"); else switchView("tests");
});

renderNotifications();
resetFlashOrder();
renderVocabDecks();
loadClassNames();
restoreSession();
