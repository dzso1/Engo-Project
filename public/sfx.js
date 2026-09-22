/* ============================================================================
 * ENGO — Hiệu ứng âm thanh vui nhộn khi học sinh hoàn thành nhiệm vụ.
 * Tự sinh bằng Web Audio (không cần tải file mp3), tôn trọng Cài đặt → Âm thanh.
 *   playSfx("correct" | "wrong" | "taskDone" | "unitDone" | "levelUp" | "streak"
 *           | "coin" | "record" | "stopRecord" | "countdown" | "perfect")
 * Gọi kèm hiệu ứng nhìn: window.celebrate() bắn pháo giấy nhỏ ở giữa màn hình.
 * ==========================================================================*/
(function () {
  "use strict";
  let ctx = null;
  function audio() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const on = () => !(window.ENGO_SETTINGS && window.ENGO_SETTINGS.sound === false);
  const vol = () => {
    const v = window.ENGO_SETTINGS && window.ENGO_SETTINGS.sfxVolume;
    return v === undefined || v === null ? 0.8 : Math.max(0, Math.min(1, Number(v)));
  };

  // Một nốt nhạc: tần số, thời điểm bắt đầu, độ dài, dáng sóng, âm lượng
  function note(freq, at, dur, type = "sine", gainPeak = 0.16, slideTo) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainPeak * vol()), t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  // Tiếng "xì" ngắn (tiếng vỗ tay / pháo giấy) bằng nhiễu trắng
  function noise(at, dur, gainPeak = 0.1, hp = 900) {
    const c = audio(); if (!c) return;
    const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const filter = c.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = hp;
    const g = c.createGain(); g.gain.setValueAtTime(gainPeak * vol(), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur);
  }

  const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568, C4: 261.63, G4: 392 };
  const SFX = {
    // Trả lời đúng: hai nốt đi lên, gọn
    correct() { note(N.E5, 0, .12, "sine", .15); note(N.A5, .08, .18, "sine", .14); },
    // Trả lời sai: hai nốt đi xuống, nhẹ nhàng (không gây nản)
    wrong() { note(330, 0, .12, "triangle", .1); note(247, .09, .16, "triangle", .09); },
    // Nhặt được cà rốt / cộng điểm
    coin() { note(N.C6, 0, .07, "square", .09); note(N.E6, .06, .12, "square", .08); },
    // Xong một nhiệm vụ (đoạn nghe, câu nói, bộ thẻ): kèn ngắn vui tai
    taskDone() {
      [[N.C5, 0], [N.E5, .1], [N.G5, .2], [N.C6, .3]].forEach(([f, t]) => note(f, t, .28, "triangle", .15));
      noise(.3, .25, .05, 1500);
    },
    // Xong cả unit / cả bài: kèn dài + vỗ tay
    unitDone() {
      [[N.C5, 0, .18], [N.E5, .12, .18], [N.G5, .24, .18], [N.C6, .36, .34], [N.G5, .62, .16], [N.C6, .74, .45]]
        .forEach(([f, t, d]) => note(f, t, d, "triangle", .16));
      for (let i = 0; i < 16; i++) noise(.36 + i * 0.045 + Math.random() * .03, .09, .05, 1200);
    },
    // Làm đúng tuyệt đối
    perfect() {
      [[N.G5, 0], [N.C6, .09], [N.E6, .18], [N.G6, .27]].forEach(([f, t]) => note(f, t, .4, "sine", .16));
      for (let i = 0; i < 20; i++) noise(.25 + i * 0.04, .1, .055, 1000);
    },
    // Lên cấp Capybara
    levelUp() {
      [[N.C5, 0], [N.G5, .1], [N.C6, .2], [N.E6, .3], [N.G6, .42]].forEach(([f, t]) => note(f, t, .45, "square", .1));
      note(N.C4, 0, .7, "sine", .08);
    },
    // Giữ chuỗi ngày học
    streak() { note(N.A5, 0, .12, "sine", .13); note(N.C6, .1, .12, "sine", .13); note(N.E6, .2, .3, "sine", .13); },
    // Bắt đầu / dừng ghi âm
    record() { note(N.G4, 0, .1, "sine", .12, N.C5); },
    stopRecord() { note(N.C5, 0, .1, "sine", .12, N.G4); },
    // Đếm ngược trước khi nói
    countdown() { note(N.E5, 0, .09, "square", .09); },
  };

  window.playSfx = function (name) {
    if (!on()) return;
    try { (SFX[name] || SFX.correct)(); } catch (e) {}
  };

  // Pháo giấy nhẹ ở giữa màn hình (tự tắt sau 1.6 giây, bỏ qua nếu bật "giảm chuyển động")
  window.celebrate = function (count) {
    if (document.body.classList.contains("reduce-motion")) return;
    const n = count || 26;
    const wrap = document.createElement("div");
    wrap.className = "sfx-confetti";
    const colors = ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#ef4444"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.style.setProperty("--x", (Math.random() * 2 - 1).toFixed(2));
      p.style.setProperty("--d", (0.7 + Math.random() * 0.7).toFixed(2) + "s");
      p.style.setProperty("--delay", (Math.random() * 0.25).toFixed(2) + "s");
      p.style.background = colors[i % colors.length];
      p.style.left = (44 + Math.random() * 12) + "%";
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 2200);
  };

  // Hoàn thành nhiệm vụ = âm thanh + pháo giấy, dùng một lệnh
  window.cheer = function (kind) {
    window.playSfx(kind || "taskDone");
    window.celebrate(kind === "unitDone" || kind === "perfect" ? 40 : 22);
  };
})();
