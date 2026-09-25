(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);

  window.can = function (perm) {
    const u = me();
    return Boolean(u && Array.isArray(u.permissions) && u.permissions.includes(perm));
  };
  window.canAny = (...perms) => perms.some(p => window.can(p));
  window.engoEsc = esc;

  function applyPermissions() {
    const u = me();
    const showPeople = Boolean(u) && window.canAny("users.manage", "students.manage", "parents.manage");
    document.querySelectorAll(".perm-people").forEach(el => el.classList.toggle("hidden", !showPeople));
    document.querySelectorAll("[data-perm]").forEach(el => el.classList.toggle("hidden", !window.canAny(...el.dataset.perm.split(/\s+/))));
  }
  window.applyPermissions = applyPermissions;

  const modal = () => document.getElementById("changePwModal");
  let locked = false;
  function openChangePassword(force) {
    const m = modal();
    if (!m) return;
    locked = Boolean(force);
    document.getElementById("changePwClose")?.classList.toggle("hidden", locked);
    document.getElementById("changePwLogout")?.classList.toggle("hidden", !locked);
    document.getElementById("changePwHint").textContent = locked
      ? "Vì lý do bảo mật, bạn cần đổi mật khẩu mặc định trước khi sử dụng ENGO."
      : "Nhập mật khẩu hiện tại và mật khẩu mới.";
    document.getElementById("changePwForm").reset();
    if (typeof setAuthError === "function") setAuthError(document.getElementById("changePwError"));
    m.classList.remove("hidden");
    setTimeout(() => document.getElementById("changePwCurrent")?.focus(), 50);
  }
  window.openChangePassword = openChangePassword;

  function guardModal() {
    const m = modal();
    if (!m) return;
    new MutationObserver(() => { if (locked && m.classList.contains("hidden")) m.classList.remove("hidden"); }).observe(m, { attributes: true, attributeFilter: ["class"] });
    document.getElementById("changePwForm").addEventListener("submit", async e => {
      e.preventDefault();
      const err = document.getElementById("changePwError");
      const cur = document.getElementById("changePwCurrent").value;
      const next = document.getElementById("changePwNew").value;
      const confirm = document.getElementById("changePwConfirm").value;
      if (next !== confirm) { setAuthError(err, "Hai mật khẩu mới không khớp."); return; }
      const btn = e.submitter; if (btn) btn.disabled = true;
      try {
        const data = await apiRequest("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: cur, newPassword: next }) });
        locked = false;
        m.classList.add("hidden");
        showToast(data.message || "Đã đổi mật khẩu.");
        const u = me();
        if (u) u.mustChangePassword = false;
        const fresh = await apiRequest("/api/auth/me").catch(() => null);
        if (fresh && fresh.user) { updateUserUI(fresh.user); applyRole(fresh.user.role); }
      } catch (ex) {
        setAuthError(err, ex.message);
      } finally { if (btn) btn.disabled = false; }
    });
    document.getElementById("changePwLogout")?.addEventListener("click", () => { locked = false; m.classList.add("hidden"); document.getElementById("logoutBtn")?.click(); });
  }

  function loginLabels() {
    const role = document.getElementById("loginRole");
    const label = document.getElementById("loginEmailLabel");
    const input = document.getElementById("loginEmail");
    if (!role || !label || !input) return;
    const update = () => {
      const parent = role.value === "parent";
      label.textContent = parent ? "Số điện thoại" : "Email hoặc mã tài khoản";
      input.placeholder = parent ? "VD: 0912345678" : "email@example.com";
      input.inputMode = parent ? "tel" : "email";
    };
    role.addEventListener("change", update);
    update();
  }

  async function refreshMe() {
    const u = me();
    if (!u || u.permissions) return;
    try {
      const data = await apiRequest("/api/auth/me");
      if (data.user) Object.assign(u, data.user);
    } catch (e) {}
    applyPermissions();
  }

  window.addEventListener("engo:user", async e => {
    const u = e.detail || {};
    if (u.mustChangePassword) openChangePassword(true);
    applyPermissions();
    if (!u.permissions || (u.role === "teacher" && !u.teacherClasses) || (u.role === "parent" && !u.children)) {
      try {
        const data = await apiRequest("/api/auth/me");
        const cur = me();
        if (cur && data.user && cur.id === data.user.id) {
          Object.assign(cur, data.user);
          if (typeof paintAvatar === "function") paintAvatar(document.getElementById("avatar"), cur.avatar, cur.fullName, cur.role);
        }
      } catch (ex) {}
      applyPermissions();
      window.dispatchEvent(new CustomEvent("engo:user-ready", { detail: me() }));
    } else {
      window.dispatchEvent(new CustomEvent("engo:user-ready", { detail: u }));
    }
  });
  window.addEventListener("engo:must-change-password", () => openChangePassword(true));
  window.addEventListener("engo:logout", () => { locked = false; modal()?.classList.add("hidden"); applyPermissions(); });

  const start = () => { guardModal(); loginLabels(); refreshMe(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
