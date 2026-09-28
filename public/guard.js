(function () {
  const host = location.hostname;
  const dev = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost") || host.endsWith(".test");
  const editable = el => el && (el.closest("input, textarea, [contenteditable=true], [contenteditable='']"));

  document.addEventListener("keydown", e => {
    const k = (e.key || "").toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const blocked = e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) || (mod && e.altKey && ["i", "j", "c", "u"].includes(k)) || (mod && ["u", "s"].includes(k) && !e.shiftKey);
    if (blocked) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  document.addEventListener("contextmenu", e => { if (!editable(e.target)) e.preventDefault(); }, true);
  document.addEventListener("dragstart", e => { if (e.target && e.target.tagName === "IMG") e.preventDefault(); }, true);

  const warn = () => {
    try {
      console.log("%cDỪNG LẠI!", "color:#dc2626;font-size:42px;font-weight:900;");
      console.log("%cĐây là khu vực dành cho nhà phát triển. Chạy mã lệnh ở đây để gian lận (tự chọn đáp án, sửa điểm, tự nộp bài) sẽ bị hệ thống phát hiện và TỰ ĐỘNG KHOÁ TÀI KHOẢN. Mọi điểm số và phần thưởng đều do máy chủ ENGO tính.", "font-size:16px;");
    } catch (e) {}
  };
  warn();
  setInterval(warn, 30000);

  if (!dev) {
    const trap = new Function("debugger");
    setInterval(() => { try { trap(); } catch (e) {} }, 400);
  }
})();
