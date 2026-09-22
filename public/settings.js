(function () {
  "use strict";

  const THEMES = [
    { id: "light", name: "Sáng mặc định", desc: "Xanh lá ENGO", group: "light", bg: "#f3f8f5", surface: "#ffffff", primary: "#059669", ink: "#0f291e" },
    { id: "offwhite", name: "Off-White", desc: "Trắng sữa / Trắng mềm", group: "light", bg: "#fafaf7", surface: "#ffffff", primary: "#0f9d76", ink: "#1f2933" },
    { id: "parchment", name: "Warm Beige", desc: "Kem ấm / Giấy da", group: "light", bg: "#f2e9d8", surface: "#fbf6ea", primary: "#b0621a", ink: "#3b2f1e" },
    { id: "coolgray", name: "Cool Gray", desc: "Xám nhạt trung tính", group: "light", bg: "#eef0f3", surface: "#ffffff", primary: "#2f6fed", ink: "#1f2328" },
    { id: "solarized-light", name: "Solarized Light", desc: "Vàng kem dịu mắt", group: "light", bg: "#fdf6e3", surface: "#fffcf2", primary: "#2aa198", ink: "#073642" },
    { id: "dark", name: "Tối mặc định", desc: "Xanh rừng đêm", group: "dark", bg: "#06140e", surface: "#0a2318", primary: "#34d399", ink: "#ecfdf5" },
    { id: "charcoal", name: "Charcoal", desc: "Xám than / Đen tuyền", group: "dark", bg: "#0c0d0f", surface: "#151719", primary: "#34d399", ink: "#ededf0" },
    { id: "midnight", name: "Midnight Blue", desc: "Xanh đêm / Xanh than", group: "dark", bg: "#0a1220", surface: "#111b2f", primary: "#5aa8ff", ink: "#e6edf7" },
    { id: "gunmetal", name: "Space Gray", desc: "Xám không gian", group: "dark", bg: "#191c20", surface: "#22262b", primary: "#6cc4f5", ink: "#e9ebee" },
    { id: "onedark", name: "One Dark", desc: "Atom / VS Code", group: "dark", bg: "#21252b", surface: "#282c34", primary: "#98c379", ink: "#dde1e7" },
    { id: "dracula", name: "Dracula", desc: "Tím huyền bí", group: "dark", bg: "#1e1f29", surface: "#282a36", primary: "#bd93f9", ink: "#f8f8f2" },
    { id: "nord", name: "Nord", desc: "Băng giá Bắc Âu", group: "dark", bg: "#2e3440", surface: "#3b4252", primary: "#88c0d0", ink: "#eceff4" },
    { id: "gruvbox", name: "Gruvbox", desc: "Retro ấm áp", group: "dark", bg: "#1d2021", surface: "#282828", primary: "#b8bb26", ink: "#ebdbb2" },
    { id: "solarized-dark", name: "Solarized Dark", desc: "Xanh biển sâu", group: "dark", bg: "#002b36", surface: "#073642", primary: "#2aa198", ink: "#eee8d5" },
  ];
  const BG_PRESETS = ["#f3f8f5", "#ffffff", "#fdf6e3", "#f2e9d8", "#eef0f3", "#eaf2ff", "#fdf2f8", "#0c0d0f", "#0a1220", "#1e1f29", "#2e3440", "#002b36"];
  const DEFAULTS = { fontScale: 1, sound: true, sfxVolume: 0.8, ttsSpeed: 1, ttsVoice: "", reduceMotion: false, bgColor: "" };
  const KEY = "engoSettings";

  function load() { try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) }; } catch (_) { return { ...DEFAULTS }; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }
  window.ENGO_SETTINGS = load();
  window.ENGO_THEMES = THEMES;

  const themeById = id => THEMES.find(t => t.id === id);

  window.applyTheme = function (id) {
    const theme = themeById(id) || THEMES[0];
    const dark = theme.group === "dark";
    document.body.dataset.theme = theme.id;
    document.body.classList.toggle("dark-mode", dark);
    document.querySelectorAll(".theme-toggle").forEach(button => {
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
      const icon = button.querySelector(".theme-icon"); if (icon) icon.innerHTML = dark ? "<i class=mi>light_mode</i>" : "<i class=mi>dark_mode</i>";
    });
    applyBg();
    document.querySelectorAll(".theme-tile").forEach(t => t.classList.toggle("active", t.dataset.theme === theme.id));
  };
  window.getPreferredTheme = function () {
    const saved = localStorage.getItem("engoTheme");
    return themeById(saved) ? saved : "light";
  };
  window.currentThemeId = () => document.body.dataset.theme || "light";

  const hexToRgb = h => { const m = String(h || "").trim().replace("#", ""); const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m; const n = parseInt(v, 16); return isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbHex = c => "#" + c.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const BG_TOKENS = ["--bg", "--surface", "--surface-2", "--surface-3", "--line", "--line-2", "--ink", "--ink-2", "--muted", "--muted-2", "--sidebar-bg", "--topbar-bg", "--nav-ink", "--nav-hover", "--nav-active-ink", "--heading", "--primary-soft", "--glow-1", "--glow-2", "--glow-3", "--shadow", "color-scheme"];
  function applyBg() {
    const s = window.ENGO_SETTINGS;
    const st = document.body.style;
    const theme = themeById(window.currentThemeId()) || THEMES[0];
    const bg = s.bgColor ? hexToRgb(s.bgColor) : null;
    if (!bg) {
      BG_TOKENS.forEach(t => st.removeProperty(t));
      document.body.classList.remove("custom-bg");
      document.body.classList.toggle("dark-mode", theme.group === "dark");
      return;
    }
    const W = [255, 255, 255], K = [0, 0, 0];
    const dark = lum(bg) < 0.32;
    const primary = hexToRgb(theme.primary) || [5, 150, 105];
    const veryLight = lum(bg) > 0.85;
    const p = dark ? {
      surface: mix(bg, W, 0.07), surface2: mix(bg, W, 0.12), surface3: mix(bg, W, 0.18), line: mix(bg, W, 0.22),
      ink: mix(bg, W, 0.93), ink2: mix(bg, W, 0.82), muted: mix(bg, W, 0.64), muted2: mix(bg, W, 0.56),
      navActive: mix(primary, W, 0.35), heading: mix(bg, W, 0.93), soft: mix(primary, bg, 0.72), shadow: "0 14px 34px rgba(0,0,0,.45)"
    } : {
      surface: veryLight ? W : mix(bg, W, 0.72), surface2: veryLight ? mix(bg, K, 0.03) : mix(bg, W, 0.4), surface3: mix(bg, K, 0.06), line: mix(bg, K, 0.13),
      ink: mix(bg, K, 0.9), ink2: mix(bg, K, 0.76), muted: mix(bg, K, 0.56), muted2: mix(bg, K, 0.5),
      navActive: mix(primary, K, 0.3), heading: mix(primary, K, 0.35), soft: mix(primary, W, 0.86), shadow: "0 14px 34px rgba(0,0,0,.08)"
    };
    const set = (k, v) => st.setProperty(k, v);
    set("--bg", rgbHex(bg)); set("--surface", rgbHex(p.surface)); set("--surface-2", rgbHex(p.surface2)); set("--surface-3", rgbHex(p.surface3));
    set("--line", rgbHex(p.line)); set("--line-2", rgbHex(p.line)); set("--ink", rgbHex(p.ink)); set("--ink-2", rgbHex(p.ink2));
    set("--muted", rgbHex(p.muted)); set("--muted-2", rgbHex(p.muted2));
    set("--sidebar-bg", rgbHex(p.surface)); set("--topbar-bg", rgbHex(dark ? mix(bg, W, 0.03) : mix(bg, W, 0.5)));
    set("--nav-ink", rgbHex(p.ink2)); set("--nav-hover", rgbHex(p.surface2)); set("--nav-active-ink", rgbHex(p.navActive));
    set("--heading", rgbHex(p.heading)); set("--primary-soft", rgbHex(p.soft));
    set("--glow-1", "transparent"); set("--glow-2", "transparent"); set("--glow-3", "transparent"); set("--shadow", p.shadow);
    set("color-scheme", dark ? "dark" : "light");
    document.body.classList.add("custom-bg");
    document.body.classList.toggle("dark-mode", dark);
  }
  function applyAll() {
    const s = window.ENGO_SETTINGS;
    document.documentElement.style.zoom = s.fontScale && s.fontScale !== 1 ? String(s.fontScale) : "";
    document.body.classList.toggle("reduce-motion", Boolean(s.reduceMotion));
    applyBg();
  }
  function update(patch) { window.ENGO_SETTINGS = { ...window.ENGO_SETTINGS, ...patch }; save(window.ENGO_SETTINGS); applyAll(); }

  const esc = s => String(s ?? "").replace(/[&<>'"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[m]));
  function tile(t) {
    return `<button type="button" class="theme-tile${window.currentThemeId() === t.id ? " active" : ""}" data-theme="${t.id}" title="${esc(t.desc)}">
      <div class="theme-preview" style="background:${t.bg}">
        <div class="tp-bar" style="background:${t.primary}"></div>
        <div class="tp-card" style="background:${t.surface}"><div class="tp-btn" style="background:${t.primary}"></div><div class="tp-dot" style="background:${t.ink};opacity:.55"></div><div class="tp-dot" style="background:${t.ink};opacity:.3"></div></div>
      </div>
      <span class="theme-name">${esc(t.name)}<small>${esc(t.desc)}</small></span>
    </button>`;
  }
  function seg(name, options, current) {
    return `<div class="seg" data-seg="${name}">${options.map(o => `<button type="button" data-val="${o.v}" class="${String(o.v) === String(current) ? "active" : ""}">${esc(o.l)}</button>`).join("")}</div>`;
  }
  function voicesEn() { try { return (window.speechSynthesis?.getVoices() || []).filter(v => /^en/i.test(v.lang)); } catch (_) { return []; } }

  window.renderSettings = function () {
    const host = document.getElementById("settingsMount"); if (!host) return;
    const s = window.ENGO_SETTINGS;
    const cu = (() => { try { return typeof currentUser !== "undefined" ? currentUser : null; } catch (_) { return null; } })();
    const voices = voicesEn();
    host.innerHTML = `
      <div class="card panel section">
        <div class="section-head"><div><h3><i class=mi>palette</i> Giao diện</h3><p class="small muted">Chọn bộ màu phù hợp mắt bạn. Lưu trên thiết bị này.</p></div></div>
        <h4 style="margin:6px 0 10px">Sáng</h4>
        <div class="settings-grid">${THEMES.filter(t => t.group === "light").map(tile).join("")}</div>
        <h4 style="margin:18px 0 10px">Tối</h4>
        <div class="settings-grid">${THEMES.filter(t => t.group === "dark").map(tile).join("")}</div>
      </div>

      <div class="card panel section">
        <div class="section-head"><div><h3><i class=mi>format_paint</i> Màu nền</h3><p class="small muted">Đổi riêng màu nền trang; các thẻ và chữ vẫn theo giao diện đã chọn.</p></div></div>
        <div class="bg-swatches">
          <button type="button" class="btn btn-light btn-sm" id="bgReset">${s.bgColor ? "Về mặc định" : "Đang dùng mặc định"}</button>
          ${BG_PRESETS.map(c => `<button type="button" class="bg-swatch${s.bgColor === c ? " active" : ""}" data-bg="${c}" style="background:${c}" title="${c}"></button>`).join("")}
          <label class="bg-swatch custom${s.bgColor && !BG_PRESETS.includes(s.bgColor) ? " active" : ""}" title="Chọn màu khác"><i class=mi>colorize</i><input type="color" id="bgCustom" value="${s.bgColor || "#f3f8f5"}"></label>
          <span class="small muted" id="bgValue">${s.bgColor ? esc(s.bgColor) : ""}</span>
        </div>
      </div>

      <div class="card panel section">
        <div class="section-head"><div><h3><i class=mi>tune</i> Hiển thị</h3></div></div>
        <div class="settings-row"><div class="sr-text"><strong>Cỡ chữ</strong><span>Phóng to toàn bộ giao diện cho dễ đọc</span></div>${seg("fontScale", [{ v: 0.9, l: "Nhỏ" }, { v: 1, l: "Vừa" }, { v: 1.12, l: "Lớn" }, { v: 1.25, l: "Rất lớn" }], s.fontScale)}</div>
        <div class="settings-row"><div class="sr-text"><strong>Giảm chuyển động</strong><span>Tắt hiệu ứng lật thẻ, trượt, mờ dần</span></div><button type="button" class="switch${s.reduceMotion ? " on" : ""}" data-switch="reduceMotion" aria-label="Giảm chuyển động"></button></div>
      </div>

      <div class="card panel section">
        <div class="section-head"><div><h3><i class=mi>volume_up</i> Âm thanh & phát âm</h3></div></div>
        <div class="settings-row"><div class="sr-text"><strong>Tiếng bấm nút</strong><span>Âm "tách" khi bấm nút, chọn đáp án</span></div><button type="button" class="switch${s.sound ? " on" : ""}" data-switch="sound" aria-label="Tiếng bấm nút"></button></div>
        <div class="settings-row"><div class="sr-text"><strong>Âm thanh khi hoàn thành</strong><span>Tiếng reo mừng + pháo giấy khi xong bài nghe, bài nói, bộ từ vựng</span></div>${seg("sfxVolume", [{ v: 0, l: "Tắt" }, { v: 0.5, l: "Nhỏ" }, { v: 0.8, l: "Vừa" }, { v: 1, l: "To" }], s.sfxVolume)}</div>
        <div class="settings-row"><div class="sr-text"><strong>Nghe thử</strong><span>Bấm để nghe âm thanh khi hoàn thành nhiệm vụ</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-light btn-sm" id="sfxTest1"><i class=mi>check_circle</i> Làm đúng</button><button type="button" class="btn btn-light btn-sm" id="sfxTest2"><i class=mi>celebration</i> Xong nhiệm vụ</button><button type="button" class="btn btn-light btn-sm" id="sfxTest3"><i class=mi>emoji_events</i> Xuất sắc</button></div></div>
        <div class="settings-row"><div class="sr-text"><strong>Tốc độ đọc tiếng Anh</strong><span>Áp dụng cho từ vựng, bài nghe, vai B khi luyện nói</span></div>${seg("ttsSpeed", [{ v: 0.8, l: "Chậm" }, { v: 1, l: "Vừa" }, { v: 1.2, l: "Nhanh" }], s.ttsSpeed)}</div>
        <div class="settings-row"><div class="sr-text"><strong>Giọng đọc</strong><span>Giọng tiếng Anh có sẵn trên thiết bị</span></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="role-select" id="ttsVoiceSel" style="max-width:260px"><option value="">Tự động (ưu tiên giọng Mỹ tự nhiên)</option>${voices.map(v => `<option value="${esc(v.name)}" ${s.ttsVoice === v.name ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}</select><button type="button" class="btn btn-light btn-sm" id="ttsTest"><i class=mi>play_arrow</i> Nghe thử</button></div></div>
      </div>

      <div class="card panel section">
        <div class="section-head"><div><h3><i class=mi>manage_accounts</i> Tài khoản & dữ liệu</h3></div></div>
        <div class="settings-row"><div class="sr-text"><strong>${esc(cu?.fullName || "Chưa đăng nhập")}</strong><span>${esc(cu ? [cu.email, cu.className ? "Lớp " + cu.className : "", { student: "Học sinh", teacher: "Giáo viên", parent: "Phụ huynh", admin: "Quản trị" }[cu.role] || cu.role].filter(Boolean).join(" · ") : "")}</span></div></div>
        <div class="settings-row"><div class="sr-text"><strong>Sao lưu dữ liệu học tập</strong><span>Tải file .json (XP, cà rốt, lỗi đang chữa, tiến độ unit) để không mất khi đổi máy / cập nhật</span></div><div style="display:flex;gap:8px"><button type="button" class="btn btn-light btn-sm" id="setExport"><i class=mi>download</i> Sao lưu</button><button type="button" class="btn btn-light btn-sm" id="setImport"><i class=mi>upload</i> Khôi phục</button></div></div>
        <div class="settings-row"><div class="sr-text"><strong>Đặt lại cài đặt</strong><span>Về giao diện sáng, cỡ chữ vừa, bật âm thanh</span></div><button type="button" class="btn btn-light btn-sm" id="setReset"><i class=mi>restart_alt</i> Đặt lại</button></div>
      </div>`;

    host.querySelectorAll(".theme-tile").forEach(b => b.addEventListener("click", () => { localStorage.setItem("engoTheme", b.dataset.theme); window.applyTheme(b.dataset.theme); }));
    host.querySelectorAll(".bg-swatch[data-bg]").forEach(b => b.addEventListener("click", () => { update({ bgColor: b.dataset.bg }); window.renderSettings(); }));
    host.querySelector("#bgCustom")?.addEventListener("input", e => { update({ bgColor: e.target.value }); host.querySelector("#bgValue").textContent = e.target.value; });
    host.querySelector("#bgCustom")?.addEventListener("change", () => window.renderSettings());
    host.querySelector("#bgReset")?.addEventListener("click", () => { update({ bgColor: "" }); window.renderSettings(); });
    host.querySelectorAll("[data-seg]").forEach(sg => sg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      update({ [sg.dataset.seg]: Number(b.dataset.val) });
      sg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
    })));
    host.querySelectorAll("[data-switch]").forEach(sw => sw.addEventListener("click", () => { const v = !window.ENGO_SETTINGS[sw.dataset.switch]; update({ [sw.dataset.switch]: v }); sw.classList.toggle("on", v); }));
    host.querySelector("#ttsVoiceSel")?.addEventListener("change", e => update({ ttsVoice: e.target.value }));
    host.querySelector("#sfxTest1")?.addEventListener("click", () => window.playSfx && window.playSfx("correct"));
    host.querySelector("#sfxTest2")?.addEventListener("click", () => window.cheer && window.cheer("taskDone"));
    host.querySelector("#sfxTest3")?.addEventListener("click", () => window.cheer && window.cheer("perfect"));
    host.querySelector("#ttsTest")?.addEventListener("click", () => { if (window.speakEnglishText) window.speakEnglishText("Hello! This is your English voice. Let's practise together.", { rate: 0.9 }); });
    host.querySelector("#setExport")?.addEventListener("click", () => { if (typeof exportMyData === "function") exportMyData(); });
    host.querySelector("#setImport")?.addEventListener("click", () => document.getElementById("importMyDataInput")?.click());
    host.querySelector("#setReset")?.addEventListener("click", () => { window.ENGO_SETTINGS = { ...DEFAULTS }; save(window.ENGO_SETTINGS); localStorage.setItem("engoTheme", "light"); window.applyTheme("light"); applyAll(); window.renderSettings(); if (window.showToast) window.showToast("Đã đặt lại cài đặt."); });
  };
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => { if (document.getElementById("settings")?.classList.contains("active")) window.renderSettings(); };

  applyAll();
})();
