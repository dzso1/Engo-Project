(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const EMOJI = [
    ["Mặt cười", "😀 😁 😂 🤣 😊 😍 🥰 😘 😎 🤩 🥳 😇 🙂 😉 😋 😜 🤪 🤗 🤔 🤫 😴 😮 😲 😢 😭 😤 😡 🥺 😅 😬"],
    ["Cử chỉ & tim", "👍 👎 👏 🙌 🙏 💪 👋 🤝 ✌️ 🤞 👌 ☝️ ❤️ 🧡 💛 💚 💙 💜 🖤 💯 ✨ 🔥 ⭐ 🌟 💥 🎉 🎊 🎁 🏆 🥇"],
    ["Học tập", "📚 📖 ✏️ 📝 🎒 🏫 🧠 💡 ⏰ 📅 🎯 ✅ ❌ ❓ ❗ 🔤 🗣️ 🎧 🎤 🌏 🇬🇧 🇺🇸 🇻🇳 🥕 🐹 ⚔️ 🎮 ⚽ 🍜 🧋"],
  ];
  const S = { tab: "friends", data: { friends: [], incoming: [], outgoing: [], unread: 0 }, active: null, messages: [], more: false, search: [], q: "", blocked: [] };
  const root = () => document.getElementById("friendsRoot");
  const allowed = () => { const u = me(); return Boolean(u && u.role === "student" && (!window.can || window.can("social.use"))); };
  const inView = () => document.querySelector(".view.active")?.id === "friends";
  const api = (method, url, body) => apiRequest(url, { method, body: body ? JSON.stringify(body) : undefined });

  function avatar(p, cls = "") {
    if (p.avatar && p.avatar.type === "image" && p.avatar.value) return `<span class="fr-av ${cls}"><img src="${esc(p.avatar.value)}" alt="">${p.online ? "<i></i>" : ""}</span>`;
    const ini = String(p.name || "?").trim().split(/\s+/).slice(-2).map(x => x[0]).join("").toUpperCase();
    return `<span class="fr-av ${cls}">${esc(ini)}${p.online ? "<i></i>" : ""}</span>`;
  }
  function timeLabel(v) {
    const d = new Date(v); if (isNaN(d)) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }

  async function refresh() {
    try { S.data = await api("GET", "/api/friends"); } catch (e) {}
    updateBadge();
  }
  async function updateBadge(counts) {
    const btn = document.querySelector('.nav-btn[data-view="friends"]');
    if (!btn) return;
    let n = counts ? counts.messages + counts.requests : (S.data.unread || 0) + (S.data.incoming || []).length;
    let b = btn.querySelector(".fr-badge");
    if (!n) { b?.remove(); return; }
    if (!b) { b = document.createElement("span"); b.className = "fr-badge"; btn.appendChild(b); }
    b.textContent = n > 99 ? "99+" : n;
  }

  function listHtml() {
    const d = S.data;
    if (S.tab === "requests") {
      return `${d.incoming.length ? `<h5>Lời mời đến (${d.incoming.length})</h5>` + d.incoming.map(p => `<div class="fr-row">${avatar(p)}<div class="fr-info"><b>${esc(p.name)}</b><small>${esc(p.className || "")}</small></div><div class="fr-acts"><button type="button" class="btn btn-primary btn-sm" data-accept="${p.id}">Đồng ý</button><button type="button" class="btn btn-light btn-sm" data-remove="${p.id}">Xoá</button></div></div>`).join("") : `<p class="small muted fr-empty">Không có lời mời nào.</p>`}
        ${d.outgoing.length ? `<h5>Đã gửi (${d.outgoing.length})</h5>` + d.outgoing.map(p => `<div class="fr-row">${avatar(p)}<div class="fr-info"><b>${esc(p.name)}</b><small>${esc(p.className || "")} · đang chờ</small></div><div class="fr-acts"><button type="button" class="btn btn-light btn-sm" data-remove="${p.id}">Huỷ</button></div></div>`).join("") : ""}`;
    }
    if (S.tab === "find") {
      return `<input type="search" class="fr-search" id="frQ" placeholder="Tìm theo tên, email hoặc lớp (VD: 9A1)..." value="${esc(S.q)}">
        <p class="small muted">${S.q.length >= 2 ? "Kết quả tìm kiếm" : "Bạn cùng lớp"}</p>
        ${S.search.map(p => `<div class="fr-row">${avatar(p)}<div class="fr-info"><b>${esc(p.name)}</b><small>${esc(p.className || "")}${p.sameClass ? " · cùng lớp" : ""}</small></div><div class="fr-acts">${p.relation === "friend" ? `<button type="button" class="btn btn-soft btn-sm" data-open="${p.id}">Nhắn tin</button>` : p.relation === "outgoing" ? `<span class="badge">Đã gửi</span>` : p.relation === "incoming" ? `<button type="button" class="btn btn-primary btn-sm" data-accept="${p.id}">Đồng ý</button>` : `<button type="button" class="btn btn-primary btn-sm" data-add="${p.id}"><i class=mi>person_add</i> Kết bạn</button>`}</div></div>`).join("") || `<p class="small muted fr-empty">Không tìm thấy ai.</p>`}
        <details class="fr-blocked"><summary>Danh sách đã chặn</summary><div id="frBlocked"><p class="small muted">Đang tải...</p></div></details>`;
    }
    return d.friends.length ? d.friends.map(p => `<button type="button" class="fr-row fr-chat-row ${S.active === p.id ? "on" : ""}" data-open="${p.id}">${avatar(p)}<div class="fr-info"><b>${esc(p.name)}</b><small>${p.last ? `${p.last.mine ? "Bạn: " : ""}${p.last.body ? esc(p.last.body).slice(0, 60) : "📷 Ảnh"}` : esc(p.className || "")}</small></div><div class="fr-meta">${p.last ? `<small>${timeLabel(p.last.at)}</small>` : ""}${p.unread ? `<span class="fr-unread">${p.unread}</span>` : ""}</div></button>`).join("")
      : `<div class="fr-empty"><i class=mi>diversity_3</i><p>Chưa có bạn bè nào.</p><button type="button" class="btn btn-primary btn-sm" data-tab-go="find">Tìm bạn cùng lớp</button></div>`;
  }

  function chatHtml() {
    const f = S.data.friends.find(x => x.id === S.active) || S.activeCard;
    if (!f) return `<div class="fr-chat-empty"><i class=mi>forum</i><p>Chọn một người bạn để bắt đầu trò chuyện.</p><small class="muted">Hãy lịch sự và tôn trọng bạn bè. Tin nhắn có từ ngữ không phù hợp sẽ bị che.</small></div>`;
    return `<div class="fr-chat-head"><button type="button" class="icon-btn fr-back" id="frBack" aria-label="Quay lại"><i class=mi>arrow_back</i></button>${avatar(f)}<div class="fr-info"><b>${esc(f.name)}</b><small>${f.online ? "Đang online" : esc(f.className || "Ngoại tuyến")}</small></div>
        <div class="fr-head-acts"><button type="button" class="btn btn-soft btn-sm" id="frDuel" title="Mời đấu trường"><i class=mi>sports_esports</i> Thách đấu</button>
        <details class="fr-menu"><summary class="icon-btn"><i class=mi>more_vert</i></summary><div><button type="button" id="frUnfriend">Huỷ kết bạn</button><button type="button" id="frBlock" class="danger">Chặn</button></div></details></div></div>
      <div class="fr-msgs" id="frMsgs">${S.more ? `<button type="button" class="btn btn-light btn-sm fr-more" id="frMore">Tải tin cũ hơn</button>` : ""}${msgsHtml()}</div>
      <form class="fr-compose" id="frCompose">
        <div class="fr-quick">${["Chào bạn! 👋", "Đấu 1 trận không? ⚔️", "Học từ vựng cùng nhé 📚", "Cố lên! 💪"].map(t => `<button type="button" data-quick="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        <div class="fr-tools"><button type="button" class="fr-tool" id="frEmojiBtn" aria-label="Chọn emoji" title="Emoji">😊</button><label class="fr-tool" title="Gửi ảnh" aria-label="Gửi ảnh"><i class=mi>image</i><input type="file" id="frImage" accept="image/*" hidden></label></div>
        <input id="frText" maxlength="500" autocomplete="off" placeholder="Nhập tin nhắn...">
        <button type="submit" class="btn btn-primary fr-send" aria-label="Gửi"><i class=mi>send</i></button>
        <div class="fr-emoji hidden" id="frEmoji">${EMOJI.map(([name, list]) => `<div class="fr-emoji-group"><small>${name}</small><div>${list.split(" ").map(e => `<button type="button" data-emo="${e}">${e}</button>`).join("")}</div></div>`).join("")}</div>
      </form>`;
  }

  function msgsHtml() {
    let lastDay = "";
    return S.messages.map((m, i) => {
      const day = new Date(m.at).toDateString();
      const sep = day !== lastDay ? `<div class="fr-day">${new Date(m.at).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</div>` : "";
      lastDay = day;
      const lastMine = m.mine && !S.messages.slice(i + 1).some(x => x.mine);
      return `${sep}<div class="fr-msg ${m.mine ? "mine" : ""}">${m.image ? `<img class="fr-img" src="${esc(m.image)}" alt="Ảnh" loading="lazy" data-zoom>` : ""}${m.body ? `<span>${esc(m.body)}</span>` : ""}<small>${timeLabel(m.at)}${lastMine && m.read ? " · Đã xem" : ""}</small></div>`;
    }).join("");
  }

  function render() {
    const host = root();
    if (!host) return;
    if (!allowed()) { host.innerHTML = `<div class="card panel"><p class="small muted">Tính năng bạn bè dành cho học sinh.</p></div>`; return; }
    const reqN = S.data.incoming.length;
    host.innerHTML = `
      <div class="page-heading"><div><h2>Bạn bè</h2><p>Kết bạn với các bạn trong trường, trò chuyện và rủ nhau thi đấu.</p></div></div>
      <div class="fr-layout ${S.active ? "chatting" : ""}">
        <div class="card fr-side">
          <div class="data-tabs fr-tabs">${[["friends", `Bạn bè (${S.data.friends.length})`], ["requests", `Lời mời${reqN ? ` <b class="fr-dot">${reqN}</b>` : ""}`], ["find", "Tìm bạn"]].map(([k, l]) => `<button type="button" class="data-tab ${S.tab === k ? "active" : ""}" data-tab="${k}">${l}</button>`).join("")}</div>
          <div class="fr-list" id="frList">${listHtml()}</div>
        </div>
        <div class="card fr-chat" id="frChat">${chatHtml()}</div>
      </div>`;
    bindList(host);
    bindChat(host);
    scrollBottom();
  }

  function bindList(host) {
    host.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tab; if (S.tab === "find") doSearch(); render(); }));
    host.querySelectorAll("[data-tab-go]").forEach(b => b.addEventListener("click", () => { S.tab = b.dataset.tabGo; doSearch(); render(); }));
    host.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => openChat(Number(b.dataset.open))));
    host.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => act("POST", `/api/friends/${b.dataset.add}/request`, b)));
    host.querySelectorAll("[data-accept]").forEach(b => b.addEventListener("click", () => act("POST", `/api/friends/${b.dataset.accept}/accept`, b)));
    host.querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => act("DELETE", `/api/friends/${b.dataset.remove}`, b)));
    const q = host.querySelector("#frQ");
    if (q) q.addEventListener("input", e => { S.q = e.target.value; clearTimeout(S.qt); S.qt = setTimeout(async () => { await doSearch(); const list = document.getElementById("frList"); if (list) { list.innerHTML = listHtml(); bindList(root()); const i = document.getElementById("frQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); });
    const bl = host.querySelector(".fr-blocked");
    if (bl) bl.addEventListener("toggle", async () => {
      if (!bl.open) return;
      try { S.blocked = (await api("GET", "/api/friends/blocked")).users || []; } catch (e) { S.blocked = []; }
      const box = document.getElementById("frBlocked");
      box.innerHTML = S.blocked.map(p => `<div class="fr-row">${avatar(p)}<div class="fr-info"><b>${esc(p.name)}</b><small>${esc(p.className || "")}</small></div><button type="button" class="btn btn-light btn-sm" data-unblock="${p.id}">Bỏ chặn</button></div>`).join("") || `<p class="small muted">Chưa chặn ai.</p>`;
      box.querySelectorAll("[data-unblock]").forEach(b => b.addEventListener("click", () => act("DELETE", `/api/friends/${b.dataset.unblock}/block`, b)));
    });
  }

  async function act(method, url, btn) {
    if (btn) btn.disabled = true;
    try { const r = await api(method, url); showToast(r.message || "Xong."); await refresh(); if (S.tab === "find") await doSearch(); render(); }
    catch (e) { showToast(e.message); if (btn) btn.disabled = false; }
  }

  async function doSearch() {
    try { S.search = (await api("GET", `/api/friends/search?q=${encodeURIComponent(S.q)}`)).users || []; } catch (e) { S.search = []; }
  }

  function bindChat(host) {
    const form = host.querySelector("#frCompose");
    if (!form) return;
    const input = form.querySelector("#frText");
    form.addEventListener("submit", e => { e.preventDefault(); send(input.value); });
    form.querySelectorAll("[data-quick]").forEach(b => b.addEventListener("click", () => send(b.dataset.quick)));
    const panel = form.querySelector("#frEmoji");
    form.querySelector("#frEmojiBtn").addEventListener("click", e => { e.stopPropagation(); panel.classList.toggle("hidden"); });
    panel.addEventListener("click", e => {
      const b = e.target.closest("[data-emo]");
      if (!b) return;
      const s = input.selectionStart ?? input.value.length, t = input.selectionEnd ?? input.value.length;
      input.value = (input.value.slice(0, s) + b.dataset.emo + input.value.slice(t)).slice(0, 500);
      const pos = s + b.dataset.emo.length;
      input.focus();
      input.setSelectionRange(pos, pos);
    });
    form.querySelector("#frImage").addEventListener("change", e => { const file = e.target.files[0]; e.target.value = ""; if (file) sendImage(file); });
    input.addEventListener("paste", e => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/"));
      if (item) { e.preventDefault(); sendImage(item.getAsFile()); }
    });
    host.querySelector("#frBack")?.addEventListener("click", () => { S.active = null; render(); });
    host.querySelector("#frMore")?.addEventListener("click", loadMore);
    host.querySelector("#frDuel")?.addEventListener("click", async e => {
      const btn = e.currentTarget;
      try { await api("POST", "/api/pvp/invite", { userId: S.active }); showToast("Đã gửi lời mời thách đấu (30 giây)."); btn.disabled = true; }
      catch (ex) { showToast(ex.message); }
    });
    host.querySelector("#frUnfriend")?.addEventListener("click", async () => { if (!confirm("Huỷ kết bạn với người này?")) return; await act("DELETE", `/api/friends/${S.active}`); S.active = null; render(); });
    host.querySelector("#frBlock")?.addEventListener("click", async () => { if (!confirm("Chặn người này? Hai bạn sẽ không thể nhắn tin hay kết bạn.")) return; await act("POST", `/api/friends/${S.active}/block`); S.active = null; render(); });
    setTimeout(() => input.focus(), 30);
  }

  function scrollBottom() { const box = document.getElementById("frMsgs"); if (box) box.scrollTop = box.scrollHeight; }

  async function openChat(id) {
    S.active = id;
    S.messages = [];
    try {
      const d = await api("GET", `/api/chat/${id}`);
      S.messages = d.messages; S.more = d.more; S.activeCard = d.friend;
      api("POST", `/api/chat/${id}/read`).then(() => { const f = S.data.friends.find(x => x.id === id); if (f) f.unread = 0; S.data.unread = S.data.friends.reduce((s, x) => s + (x.unread || 0), 0); updateBadge(); redrawList(); }).catch(() => {});
    } catch (e) { showToast(e.message); }
    render();
  }

  async function loadMore() {
    if (!S.messages.length) return;
    const box = document.getElementById("frMsgs");
    const h = box.scrollHeight;
    try {
      const d = await api("GET", `/api/chat/${S.active}?before=${S.messages[0].id}`);
      S.messages = [...d.messages, ...S.messages]; S.more = d.more;
      box.innerHTML = `${S.more ? `<button type="button" class="btn btn-light btn-sm fr-more" id="frMore">Tải tin cũ hơn</button>` : ""}${msgsHtml()}`;
      box.querySelector("#frMore")?.addEventListener("click", loadMore);
      box.scrollTop = box.scrollHeight - h;
    } catch (e) { showToast(e.message); }
  }

  async function send(text, image) {
    const body = String(text || "").trim();
    if ((!body && !image) || !S.active) return;
    const input = document.getElementById("frText");
    if (input && !image) input.value = "";
    try {
      const r = await api("POST", `/api/chat/${S.active}`, image ? { body: "", image } : { body });
      if (!S.messages.some(m => m.id === r.message.id)) S.messages.push(r.message);
      const f = S.data.friends.find(x => x.id === S.active);
      if (f) f.last = { body: r.message.body, image: Boolean(r.message.image), mine: true, at: r.message.at };
      redrawMessages();
    } catch (e) { showToast(e.message); if (input && !input.value && !image) input.value = body; }
  }

  function readAsDataUrl(blob) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  }
  async function compressImage(file) {
    if (!/^image\//.test(file.type)) throw new Error("Chỉ gửi được file ảnh.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Ảnh quá lớn (tối đa 20 MB trước khi nén).");
    if (file.type === "image/gif" && file.size <= 1.4 * 1024 * 1024) return readAsDataUrl(file);
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Không đọc được ảnh này.")); i.src = url; });
      const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let q = 0.82, out = c.toDataURL("image/jpeg", q);
      while (out.length * 0.75 > 1.4 * 1024 * 1024 && q > 0.4) { q -= 0.12; out = c.toDataURL("image/jpeg", q); }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  async function sendImage(file) {
    if (!file || !S.active) return;
    const box = document.getElementById("frMsgs");
    const tmp = document.createElement("div");
    tmp.className = "fr-msg mine fr-sending";
    tmp.innerHTML = `<span><i class=mi>hourglass_top</i> Đang gửi ảnh...</span>`;
    box?.appendChild(tmp); scrollBottom();
    try { await send("", await compressImage(file)); }
    catch (e) { showToast(e.message); }
    finally { tmp.remove(); }
  }

  function openLightbox(src) {
    const lb = document.createElement("div");
    lb.className = "fr-lightbox";
    lb.innerHTML = `<img src="${esc(src)}" alt="Ảnh"><button type="button" aria-label="Đóng">×</button>`;
    lb.addEventListener("click", () => lb.remove());
    document.body.appendChild(lb);
  }
  document.addEventListener("click", e => {
    const img = e.target.closest(".fr-img[data-zoom]");
    if (img) openLightbox(img.src);
    if (!e.target.closest("#frEmoji, #frEmojiBtn")) document.getElementById("frEmoji")?.classList.add("hidden");
  });

  function redrawMessages() {
    const box = document.getElementById("frMsgs");
    if (!box) return;
    box.innerHTML = `${S.more ? `<button type="button" class="btn btn-light btn-sm fr-more" id="frMore">Tải tin cũ hơn</button>` : ""}${msgsHtml()}`;
    box.querySelector("#frMore")?.addEventListener("click", loadMore);
    scrollBottom();
  }

  function redrawList() {
    const list = document.getElementById("frList");
    if (!list || S.tab !== "friends") return;
    list.innerHTML = listHtml();
    bindList(root());
  }

  function popup(from, text, onOpen) {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "fr-pop";
    t.innerHTML = `${avatar(from)}<div><b>${esc(from.name)}</b><span>${esc(text).slice(0, 90)}</span></div>`;
    t.addEventListener("click", () => { t.remove(); onOpen && onOpen(); });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 6000);
  }

  window.addEventListener("engo:social", async e => {
    if (!allowed()) return;
    const { type, data } = e.detail || {};
    if (type === "connected") { refresh().then(() => { if (inView()) render(); }); return; }
    if (type === "chat-message") {
      const m = data.message;
      if (inView() && S.active === m.from) {
        if (!S.messages.some(x => x.id === m.id)) S.messages.push(m);
        redrawMessages();
        api("POST", `/api/chat/${m.from}/read`).catch(() => {});
        const f = S.data.friends.find(x => x.id === m.from); if (f) f.last = { body: m.body, image: Boolean(m.image), mine: false, at: m.at };
        redrawList();
        return;
      }
      try { window.playSfx && window.playSfx("coin"); } catch (x) {}
      await refresh();
      if (inView()) redrawList();
      else popup(data.from, m.body || "📷 Đã gửi một ảnh", () => { switchView("friends"); openChat(m.from); });
      return;
    }
    if (type === "chat-sent") {
      if (S.active === data.message.to && !S.messages.some(x => x.id === data.message.id)) { S.messages.push(data.message); redrawMessages(); }
      return;
    }
    if (type === "chat-read") {
      if (S.active === data.by) { S.messages.forEach(m => { if (m.mine) m.read = true; }); redrawMessages(); }
      return;
    }
    if (type === "friend-request") { await refresh(); if (inView()) render(); else popup(data.from, "muốn kết bạn với bạn", () => { S.tab = "requests"; switchView("friends"); }); return; }
    if (type === "friend-accepted") { showToast(`${data.from.name} đã đồng ý kết bạn!`); await refresh(); if (inView()) render(); return; }
    if (type === "friend-removed") { if (S.active === data.id) S.active = null; await refresh(); if (inView()) render(); }
  });

  async function show() {
    if (!allowed()) { render(); return; }
    await refresh();
    if (S.tab === "find") await doSearch();
    render();
    if (S.active) openChat(S.active);
  }

  window.addEventListener("engo:view", e => { const w = document.getElementById("capybaraChatWidget"); if (e.detail === "friends") { if (w) w.style.display = "none"; show(); } });
  window.addEventListener("engo:user-ready", () => { if (!allowed()) return; refresh(); if (inView()) show(); });
  window.addEventListener("engo:logout", () => { S.active = null; S.messages = []; S.data = { friends: [], incoming: [], outgoing: [], unread: 0 }; updateBadge({ messages: 0, requests: 0 }); document.querySelectorAll(".fr-pop").forEach(x => x.remove()); });
  window.ENGO_SOCIAL = { show, openChat };
})();
