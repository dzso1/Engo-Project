(function () {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const me = () => (typeof currentUser !== "undefined" ? currentUser : null);
  const ROLE_VI = { student: "Học sinh", teacher: "Giáo viên", parent: "Phụ huynh", admin: "Quản trị" };
  const STATUS_VI = { active: "Hoạt động", pending: "Chờ duyệt", locked: "Đã khoá" };
  const state = { tab: "users", users: [], scope: null, parents: [], classes: [], available: [], filter: { q: "", role: "", cls: "", status: "" }, importRows: [], importResult: null, rbac: null };
  const root = () => document.getElementById("peopleRoot");
  const sortCls = list => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  const isFull = () => window.can("users.manage");

  function dialog(title, bodyHtml, { wide = false } = {}) {
    const m = document.createElement("div");
    m.className = "modal pp-dialog";
    m.innerHTML = `<div class="modal-card${wide ? " modal-lg" : ""}"><div class="modal-head"><h3>${title}</h3><button class="close-btn" type="button" data-pp-close>×</button></div><div class="pp-dialog-body">${bodyHtml}</div></div>`;
    const close = () => m.remove();
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-pp-close]")) close(); });
    document.body.appendChild(m);
    return { el: m, close };
  }

  async function loadAll() {
    const tasks = [apiRequest("/api/admin/users").then(d => { state.users = d.users || []; state.scope = d.scope || null; })];
    if (window.can("parents.manage")) tasks.push(apiRequest("/api/parents").then(d => { state.parents = d.parents || []; }).catch(() => { state.parents = []; }));
    if (window.canAny("classes.assign_self", "students.manage")) tasks.push(apiRequest("/api/teacher/my-classes").then(d => { state.classes = d.classes || []; state.available = d.available || []; }).catch(() => {}));
    await Promise.all(tasks);
  }

  function scopeLine() {
    if (isFull()) return `<span class="badge green"><i class=mi>public</i> Toàn trường</span>`;
    const list = (state.scope && state.scope.classes) || state.classes || [];
    return list.length ? list.map(c => `<span class="badge blue">${esc(c)}</span>`).join(" ") : `<span class="badge orange">Chưa chọn lớp phụ trách</span>`;
  }

  function tabsHtml() {
    const tabs = [["users", "Tài khoản"]];
    if (window.can("parents.manage")) tabs.push(["parents", "Phụ huynh"]);
    if (window.can("users.import")) tabs.push(["import", "Nhập Excel/CSV"]);
    if (window.can("system.manage")) tabs.push(["rbac", "Phân quyền"]);
    if (!tabs.some(t => t[0] === state.tab)) state.tab = "users";
    return `<div class="data-tabs pp-tabs">${tabs.map(([k, l]) => `<button type="button" class="data-tab ${state.tab === k ? "active" : ""}" data-pp-tab="${k}">${l}</button>`).join("")}</div>`;
  }

  function render() {
    const host = root();
    if (!host) return;
    const teacherNoClass = !isFull() && me()?.role === "teacher" && !(state.classes || []).length;
    host.innerHTML = `
      <div class="page-heading"><div><h2>Tài khoản &amp; lớp</h2><p>${isFull() ? "Quản lý tài khoản học sinh, giáo viên, phụ huynh và phân quyền toàn hệ thống." : "Quản lý học sinh và phụ huynh của các lớp bạn phụ trách."}</p></div></div>
      <div class="card panel section pp-scope">
        <div><strong>Phạm vi quản lý:</strong> ${scopeLine()}</div>
        ${window.can("classes.assign_self") ? `<button type="button" class="btn btn-soft btn-sm" id="ppPickClasses"><i class=mi>edit</i> Chọn lớp phụ trách</button>` : ""}
      </div>
      ${teacherNoClass ? `<div class="notice pp-warn"><strong>Bạn chưa chọn lớp phụ trách.</strong><p>Hãy chọn các lớp mình dạy để xem và quản lý học sinh, phụ huynh, kết quả của các lớp đó.</p></div>` : ""}
      <div class="card panel section">
        <div class="section-head">${tabsHtml()}</div>
        <div id="ppBody"></div>
      </div>`;
    host.querySelectorAll("[data-pp-tab]").forEach(b => b.addEventListener("click", () => { state.tab = b.dataset.ppTab; render(); }));
    host.querySelector("#ppPickClasses")?.addEventListener("click", openClassPicker);
    const body = host.querySelector("#ppBody");
    if (state.tab === "users") renderUsers(body);
    else if (state.tab === "parents") renderParents(body);
    else if (state.tab === "import") renderImport(body);
    else if (state.tab === "rbac") renderRbac(body);
  }

  function classOptions(selected, { allowEmpty = true } = {}) {
    const list = isFull() ? sortCls([...(state.available || []), ...state.users.map(u => u.className)]) : sortCls((state.scope && state.scope.classes) || state.classes || []);
    return (allowEmpty ? `<option value="">— Lớp —</option>` : "") + list.map(c => `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(c)}</option>`).join("");
  }

  function filteredUsers() {
    const f = state.filter;
    const q = f.q.trim().toLowerCase();
    return state.users.filter(u => (!f.status || u.status === f.status) && (!f.role || u.role === f.role) && (!f.cls || u.className === f.cls || (u.children || []).some(c => c.className === f.cls)) && (!q || [u.fullName, u.email, u.phone, u.className].some(v => String(v || "").toLowerCase().includes(q))));
  }

  function renderUsers(body) {
    const f = state.filter;
    const list = filteredUsers();
    const counts = state.users.reduce((m, u) => { m[u.role] = (m[u.role] || 0) + 1; return m; }, {});
    body.innerHTML = `
      <div class="pp-toolbar">
        <input type="search" id="ppQ" placeholder="Tìm tên, email, SĐT..." value="${esc(f.q)}">
        ${isFull() ? `<select id="ppRole"><option value="">Mọi vai trò</option>${Object.keys(ROLE_VI).map(r => `<option value="${r}" ${f.role === r ? "selected" : ""}>${ROLE_VI[r]} (${counts[r] || 0})</option>`).join("")}</select>` : ""}
        <select id="ppCls"><option value="">Mọi lớp</option>${classOptions(f.cls, { allowEmpty: false })}</select>
        <select id="ppStatus"><option value="">Mọi trạng thái</option><option value="locked" ${f.status === "locked" ? "selected" : ""}>Đang bị khoá (${state.users.filter(u => u.status === "locked").length})</option><option value="pending" ${f.status === "pending" ? "selected" : ""}>Chờ duyệt</option></select>
        <span class="small muted">${list.length} tài khoản</span>
        <button type="button" class="btn btn-primary btn-sm" id="ppAdd"><i class=mi>person_add</i> Thêm tài khoản</button>
      </div>
      <div class="table-wrap"><table class="pp-table"><thead><tr><th>Họ tên</th><th>Đăng nhập</th><th>Vai trò</th><th>Lớp / Con</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${list.slice(0, 400).map(u => `<tr>
        <td><strong>${esc(u.fullName)}</strong>${u.mustChangePassword ? ` <span class="badge orange" title="Chưa đổi mật khẩu mặc định">MK mặc định</span>` : ""}</td>
        <td class="small">${esc(u.role === "parent" ? u.phone || u.email : u.email)}</td>
        <td><span class="badge">${ROLE_VI[u.role] || u.role}</span></td>
        <td class="small">${u.role === "parent" ? (u.children || []).map(c => `${esc(c.fullName)} (${esc(c.className || "?")})`).join(", ") || "—" : esc(u.className || "—")}</td>
        <td><span class="badge ${u.status === "active" ? "green" : u.status === "locked" ? "red" : "orange"}">${STATUS_VI[u.status] || u.status}</span>${u.status === "locked" && u.lockReason ? `<small class="pp-lock">${esc(u.lockReason)}</small>` : ""}</td>
        <td><div class="pp-actions">
          <button type="button" class="btn btn-light btn-sm" data-edit="${u.id}" title="Sửa"><i class=mi>edit</i></button>
          ${u.role === "student" && window.can("rewards.manage") ? `<button type="button" class="btn btn-light btn-sm" data-rw="${u.id}" title="Level & cà rốt"><i class=ico-carrot></i></button>` : ""}
          ${Number(u.id) !== Number(me()?.id) ? `<button type="button" class="btn btn-light btn-sm" data-lock="${u.id}" title="${u.status === "locked" ? "Mở khoá" : "Khoá"}"><i class=mi>${u.status === "locked" ? "lock_open" : "lock"}</i></button>
          <button type="button" class="btn btn-light btn-sm pp-danger" data-del="${u.id}" title="Xoá"><i class=mi>delete</i></button>` : ""}
        </div></td></tr>`).join("") || `<tr><td colspan="6" class="small muted" style="text-align:center;padding:20px">Không có tài khoản nào.</td></tr>`}</tbody></table></div>
      ${list.length > 400 ? `<p class="small muted">Đang hiển thị 400/${list.length} tài khoản — hãy lọc thêm.</p>` : ""}`;
    const rerender = () => renderUsers(body);
    body.querySelector("#ppQ").addEventListener("input", e => { state.filter.q = e.target.value; clearTimeout(renderUsers.t); renderUsers.t = setTimeout(() => { rerender(); const i = body.querySelector("#ppQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 200); });
    body.querySelector("#ppRole")?.addEventListener("change", e => { state.filter.role = e.target.value; rerender(); });
    body.querySelector("#ppCls").addEventListener("change", e => { state.filter.cls = e.target.value; rerender(); });
    body.querySelector("#ppStatus").addEventListener("change", e => { state.filter.status = e.target.value; rerender(); });
    body.querySelector("#ppAdd").addEventListener("click", () => openUserForm(null));
    body.querySelectorAll("[data-rw]").forEach(b => b.addEventListener("click", () => openRewards(b.dataset.rw)));
    body.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openUserForm(state.users.find(u => String(u.id) === b.dataset.edit))));
    body.querySelectorAll("[data-lock]").forEach(b => b.addEventListener("click", async () => {
      const u = state.users.find(x => String(x.id) === b.dataset.lock);
      try { await apiRequest(`/api/admin/users/${u.id}/status`, { method: "PATCH", body: JSON.stringify({ status: u.status === "locked" ? "active" : "locked" }) }); await reload(); } catch (e) { showToast(e.message); }
    }));
    body.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
      const u = state.users.find(x => String(x.id) === b.dataset.del);
      if (!confirm(`Xoá vĩnh viễn tài khoản "${u.fullName}"? Toàn bộ bài làm và tiến độ của tài khoản này sẽ bị xoá.`)) return;
      try { const d = await apiRequest(`/api/admin/users/${u.id}`, { method: "DELETE" }); showToast(d.message); await reload(); } catch (e) { showToast(e.message); }
    }));
  }

  async function openRewards(id) {
    let d;
    try { d = await apiRequest(`/api/admin/users/${id}/rewards`); } catch (e) { showToast(e.message); return; }
    const r = d.rewards;
    const ACT = { level: "Đặt level", set_carrots: "Đặt số cà rốt", add_carrots: "Cộng/trừ cà rốt" };
    const dlg = dialog(`Level & cà rốt · ${esc(d.user.fullName)}`, `
      <div class="rw-now"><div><span>Level</span><b>${r.level}</b><small>${r.xp} XP</small></div><div><span>Cà rốt</span><b>${r.carrots} <i class=ico-carrot></i></b><small>Hôm nay nhận ${r.dailyCarrots}/${r.dailyCap}</small></div></div>
      <form class="auth-form" id="rwForm">
        <div class="auth-error" id="rwErr"></div>
        <div class="field"><label>Đặt lại level (để trống nếu không đổi)</label><div class="rw-row"><input name="level" type="number" min="1" max="200" placeholder="Hiện tại: ${r.level}"><button type="button" class="btn btn-light btn-sm" data-lv="1">Về Lv 1</button></div><small class="muted">Level N tương ứng (N−1)×100 XP.</small></div>
        <div class="field"><label>Tặng hoặc trừ cà rốt</label><div class="rw-row"><input name="addCarrots" type="number" min="-10000" max="10000" placeholder="VD: 10 hoặc -5">${[5, 10, 20, 50].map(n => `<button type="button" class="btn btn-soft btn-sm" data-add="${n}">+${n}</button>`).join("")}</div></div>
        <div class="field"><label>Hoặc đặt đúng số cà rốt</label><input name="setCarrots" type="number" min="0" max="100000" placeholder="Hiện tại: ${r.carrots}"></div>
        <div class="field"><label>Ghi chú (tuỳ chọn)</label><input name="note" maxlength="200" placeholder="VD: Thưởng thi đua tuần, xử lý gian lận..."></div>
        <button class="btn btn-primary" type="submit" style="width:100%">Lưu thay đổi</button>
      </form>
      ${d.history.length ? `<h4 class="rw-h">Lịch sử chỉnh sửa</h4><div class="rw-hist">${d.history.map(h => `<div><b>${esc(h.action.split(",").map(a => ACT[a] || a).join(", "))}</b> · Lv ${h.before.level} → ${h.after.level}, 🥕 ${h.before.carrots} → ${h.after.carrots}<small>${esc(h.by || "")} · ${new Date(h.at).toLocaleString("vi-VN")}${h.note ? ` · ${esc(h.note)}` : ""}</small></div>`).join("")}</div>` : ""}`);
    const form = dlg.el.querySelector("#rwForm");
    dlg.el.querySelector("[data-lv]").addEventListener("click", () => { form.level.value = 1; });
    dlg.el.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => { form.addCarrots.value = Number(form.addCarrots.value || 0) + Number(b.dataset.add); }));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const payload = { level: form.level.value, addCarrots: form.addCarrots.value, setCarrots: form.setCarrots.value, note: form.note.value };
      if (payload.setCarrots !== "" && payload.addCarrots !== "") { setAuthError(dlg.el.querySelector("#rwErr"), "Chỉ chọn một: cộng/trừ hoặc đặt đúng số cà rốt."); return; }
      try {
        const res = await apiRequest(`/api/admin/users/${id}/rewards`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast(res.message);
        dlg.close();
        openRewards(id);
      } catch (ex) { setAuthError(dlg.el.querySelector("#rwErr"), ex.message); }
    });
  }

  function openUserForm(user) {
    const editing = Boolean(user);
    const full = isFull();
    const role = editing ? user.role : "student";
    const dlg = dialog(editing ? `Sửa tài khoản` : "Thêm tài khoản", `
      <form class="auth-form" id="ppUserForm">
        <div class="auth-error" id="ppUserErr"></div>
        <div class="form-grid">
          <div class="field full"><label>Họ và tên</label><input name="fullName" required value="${esc(user?.fullName || "")}"></div>
          ${full && !editing ? `<div class="field"><label>Vai trò</label><select name="role">${["student", "teacher", "parent", "admin"].map(r => `<option value="${r}">${ROLE_VI[r]}</option>`).join("")}</select></div>` : ""}
          ${full && editing && user.role !== "parent" ? `<div class="field"><label>Vai trò</label><select name="role">${["student", "teacher", "admin"].map(r => `<option value="${r}" ${r === role ? "selected" : ""}>${ROLE_VI[r]}</option>`).join("")}</select></div>` : ""}
          <div class="field" data-for="student"><label>Lớp</label><select name="className">${classOptions(user?.className || state.filter.cls || "")}</select></div>
          <div class="field full" data-for="login"><label>Email đăng nhập ${editing ? "" : "(để trống để tự tạo theo tên + lớp)"}</label><input name="email" type="email" value="${esc(user?.email || "")}"></div>
          <div class="field full" data-for="parent"><label>Số điện thoại (tên đăng nhập)</label><input name="phone" inputmode="tel" value="${esc(user?.phone || "")}" placeholder="0912345678"></div>
          <div class="field full" data-for="pw"><label>${editing ? "Đặt lại mật khẩu (để trống nếu không đổi)" : "Mật khẩu (mặc định 123456)"}</label><input name="password" type="text" autocomplete="new-password" placeholder="${editing ? "" : "123456"}"></div>
          ${full && editing ? `<div class="field"><label>Trạng thái</label><select name="status">${Object.keys(STATUS_VI).map(s => `<option value="${s}" ${s === user.status ? "selected" : ""}>${STATUS_VI[s]}</option>`).join("")}</select></div>` : ""}
        </div>
        <p class="small muted" data-for="parent">Tài khoản phụ huynh dùng mật khẩu mặc định <b>123</b> và bắt buộc đổi ở lần đăng nhập đầu. Liên kết con ở tab <b>Phụ huynh</b>.</p>
        <button class="btn btn-primary" type="submit" style="width:100%">${editing ? "Lưu thay đổi" : "Tạo tài khoản"}</button>
      </form>`);
    const form = dlg.el.querySelector("#ppUserForm");
    const sync = () => {
      const r = form.role ? form.role.value : role;
      form.querySelectorAll("[data-for=student]").forEach(x => x.classList.toggle("hidden", r !== "student"));
      form.querySelectorAll("[data-for=login]").forEach(x => x.classList.toggle("hidden", r === "parent"));
      form.querySelectorAll("[data-for=parent]").forEach(x => x.classList.toggle("hidden", r !== "parent"));
      form.querySelectorAll("[data-for=pw]").forEach(x => x.classList.toggle("hidden", r === "parent" && !editing));
    };
    form.role?.addEventListener("change", sync);
    sync();
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form).entries());
      const payload = {};
      Object.entries(fd).forEach(([k, v]) => { if (v !== "" || k === "fullName") payload[k] = v; });
      if (!editing && !form.role) payload.role = "student";
      try {
        const d = editing
          ? await apiRequest(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(payload) })
          : await apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
        showToast(d.message || "Đã lưu.");
        dlg.close();
        await reload();
      } catch (ex) { setAuthError(dlg.el.querySelector("#ppUserErr"), ex.message); }
    });
  }

  function renderParents(body) {
    const students = state.users.filter(u => u.role === "student");
    body.innerHTML = `
      <div class="grid two-col pp-parent-grid">
        <form class="card panel pp-parent-form" id="ppParentForm">
          <h4><i class=mi>family_restroom</i> Tạo / liên kết phụ huynh</h4>
          <div class="auth-error" id="ppParentErr"></div>
          <div class="field"><label>Số điện thoại phụ huynh (tên đăng nhập)</label><input name="phone" inputmode="tel" placeholder="0912345678" required></div>
          <div class="field"><label>Họ tên phụ huynh</label><input name="fullName" placeholder="VD: Nguyễn Văn Bình"></div>
          <div class="field"><label>Con (chọn 1 hoặc nhiều học sinh)</label>
            <input type="search" id="ppStuSearch" placeholder="Tìm học sinh theo tên hoặc lớp...">
            <div class="pp-stu-list" id="ppStuList"></div>
          </div>
          <p class="small muted">Mật khẩu mặc định là <b>123</b>. Phụ huynh bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên. Nếu SĐT đã có tài khoản, học sinh được chọn sẽ được liên kết thêm.</p>
          <button type="submit" class="btn btn-primary" style="width:100%">Lưu</button>
        </form>
        <div>
          <div class="pp-toolbar"><input type="search" id="ppParentQ" placeholder="Tìm phụ huynh, SĐT, tên con..."><span class="small muted">${state.parents.length} phụ huynh</span></div>
          <div class="pp-parent-list" id="ppParentList"></div>
        </div>
      </div>`;
    const picked = new Set();
    const stuList = body.querySelector("#ppStuList");
    const drawStudents = q => {
      const qq = String(q || "").toLowerCase();
      const list = students.filter(s => !qq || `${s.fullName} ${s.className}`.toLowerCase().includes(qq)).slice(0, 60);
      stuList.innerHTML = list.map(s => `<label class="pp-stu ${picked.has(s.id) ? "on" : ""}"><input type="checkbox" value="${s.id}" ${picked.has(s.id) ? "checked" : ""}> ${esc(s.fullName)} <span class="small muted">${esc(s.className || "")}</span></label>`).join("") || `<p class="small muted">Không tìm thấy học sinh.</p>`;
      stuList.querySelectorAll("input").forEach(i => i.addEventListener("change", () => { const id = Number(i.value); i.checked ? picked.add(id) : picked.delete(id); i.closest(".pp-stu").classList.toggle("on", i.checked); }));
    };
    drawStudents("");
    body.querySelector("#ppStuSearch").addEventListener("input", e => drawStudents(e.target.value));
    const drawParents = q => {
      const qq = String(q || "").toLowerCase();
      const list = state.parents.filter(p => !qq || `${p.fullName} ${p.phone} ${p.children.map(c => c.fullName + " " + c.className).join(" ")}`.toLowerCase().includes(qq));
      body.querySelector("#ppParentList").innerHTML = list.map(p => `
        <div class="pp-parent card">
          <div class="pp-parent-head"><div><strong>${esc(p.fullName)}</strong> <span class="small muted">· ${esc(p.phone || "")}</span> ${p.mustChangePassword ? `<span class="badge orange">Chưa đổi MK</span>` : `<span class="badge green">Đã kích hoạt</span>`}</div>
            <button type="button" class="btn btn-light btn-sm" data-reset="${p.id}" title="Đặt lại mật khẩu về 123"><i class=mi>lock_reset</i> Đặt lại MK</button></div>
          <div class="pp-kids">${p.children.map(c => `<span class="pp-kid">${esc(c.fullName)} <small>${esc(c.className || "")}</small><button type="button" data-unlink="${p.id}:${c.id}" title="Bỏ liên kết">×</button></span>`).join("")}</div>
        </div>`).join("") || `<p class="small muted">Chưa có phụ huynh nào.</p>`;
      body.querySelectorAll("[data-reset]").forEach(b => b.addEventListener("click", async () => {
        if (!confirm("Đặt lại mật khẩu phụ huynh về 123? Phụ huynh sẽ phải đổi lại khi đăng nhập.")) return;
        try { const d = await apiRequest(`/api/parents/${b.dataset.reset}/reset-password`, { method: "POST", body: "{}" }); showToast(d.message); await reload(); } catch (e) { showToast(e.message); }
      }));
      body.querySelectorAll("[data-unlink]").forEach(b => b.addEventListener("click", async () => {
        const [pid, sid] = b.dataset.unlink.split(":");
        if (!confirm("Bỏ liên kết học sinh này khỏi phụ huynh?")) return;
        try { await apiRequest(`/api/parents/${pid}/students/${sid}`, { method: "DELETE" }); await reload(); } catch (e) { showToast(e.message); }
      }));
    };
    drawParents("");
    body.querySelector("#ppParentQ").addEventListener("input", e => drawParents(e.target.value));
    body.querySelector("#ppParentForm").addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.target;
      try {
        const d = await apiRequest("/api/parents", { method: "POST", body: JSON.stringify({ phone: form.phone.value, fullName: form.fullName.value, studentIds: [...picked] }) });
        showToast(d.message);
        await reload();
      } catch (ex) { setAuthError(body.querySelector("#ppParentErr"), ex.message); }
    });
  }

  const HEADER_MAP = [
    ["fullName", ["ho va ten", "ho ten", "hoten", "ten hoc sinh", "full name", "fullname", "name", "ten"]],
    ["className", ["lop", "class", "classname", "lop hoc"]],
    ["email", ["email", "tai khoan", "e-mail"]],
    ["password", ["mat khau", "password", "mk"]],
    ["role", ["vai tro", "role", "chuc vu"]],
    ["phone", ["sdt", "so dien thoai", "phone", "dien thoai"]],
    ["parentPhone", ["sdt phu huynh", "so dien thoai phu huynh", "parent phone", "sdt ph", "dien thoai phu huynh"]],
    ["parentName", ["ten phu huynh", "ho ten phu huynh", "phu huynh", "parent name", "parent"]],
  ];
  const ROLE_ALIASES = { "hoc sinh": "student", hs: "student", student: "student", "giao vien": "teacher", gv: "teacher", teacher: "teacher", "phu huynh": "parent", ph: "parent", parent: "parent", admin: "admin", "quan tri": "admin" };
  const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

  function mapRows(matrix) {
    const rows = matrix.map(r => (Array.isArray(r) ? r : []).map(c => String(c ?? "").trim())).filter(r => r.some(Boolean));
    if (!rows.length) return [];
    const head = rows[0].map(fold);
    const cols = {};
    const specific = [...HEADER_MAP].sort((a, b) => Math.max(...b[1].map(x => x.length)) - Math.max(...a[1].map(x => x.length)));
    head.forEach((h, i) => {
      const hit = specific.find(([key, names]) => !(key in cols) && names.some(n => h === n)) || specific.find(([key, names]) => !(key in cols) && names.some(n => n.length > 3 && h.includes(n)));
      if (hit) cols[hit[0]] = i;
    });
    let data = rows;
    if ("fullName" in cols) data = rows.slice(1);
    else if (rows[0].length === 1 || head.every(h => !h || /^\d+$/.test(h) || h.split(" ").length >= 2)) { cols.fullName = rows[0].length === 1 ? 0 : rows[0].findIndex(c => /\D/.test(c) && c.trim().split(/\s+/).length >= 2); }
    if (!("fullName" in cols) || cols.fullName < 0) return null;
    return data.map(r => {
      const o = {};
      for (const [k, i] of Object.entries(cols)) o[k] = r[i] || "";
      if (o.role) o.role = ROLE_ALIASES[fold(o.role)] || o.role;
      o.fullName = String(o.fullName || "").replace(/\s+/g, " ").trim();
      return o;
    }).filter(o => o.fullName && !/^\d+$/.test(o.fullName));
  }

  function parseCsv(text) {
    const delim = (text.split("\n")[0].match(/;/g) || []).length > (text.split("\n")[0].match(/,/g) || []).length ? ";" : (text.includes("\t") && !text.includes(",") ? "\t" : ",");
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function loadSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error("Không tải được thư viện đọc Excel. Hãy lưu file dưới dạng CSV rồi thử lại."));
      document.head.appendChild(s);
    });
  }

  async function readFile(file) {
    if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
      const XLSX = await loadSheetJs();
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
    }
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1258").decode(buf);
    return parseCsv(text.replace(/^﻿/, ""));
  }

  function downloadText(name, text, mime = "text/csv;charset=utf-8") {
    const blob = new Blob(["﻿" + text], { type: mime });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const csvCell = v => /[",;\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? "");

  function renderImport(body) {
    const rows = state.importRows;
    const res = state.importResult;
    body.innerHTML = `
      <div class="pp-import">
        <div class="notice"><strong>Nhập danh sách từ Excel (.xlsx) hoặc CSV</strong>
          <p>Dòng đầu là tiêu đề cột: <b>Họ và tên</b> (bắt buộc), <b>Lớp</b>, <b>Email</b>, <b>Mật khẩu</b>, <b>Vai trò</b>, <b>SĐT phụ huynh</b>, <b>Tên phụ huynh</b>. Có thể chỉ có một cột họ tên. Email để trống sẽ tự tạo theo công thức <code>chữ cái đầu họ đệm + tên + lớp@engo.web</code> (VD: Trịnh Minh Khôi, 9A6 → tmkhoi9a6@engo.web). Có SĐT phụ huynh thì tài khoản phụ huynh (mật khẩu 123) được tạo và liên kết tự động.</p></div>
        <div class="pp-toolbar">
          <button type="button" class="btn btn-light btn-sm" id="ppTemplate"><i class=mi>download</i> Tải file mẫu</button>
          <label class="btn btn-primary btn-sm"><i class=mi>upload_file</i> Chọn file Excel/CSV<input type="file" id="ppFile" accept=".xlsx,.xls,.ods,.csv,.txt" hidden></label>
          <label class="small">Lớp mặc định <select id="ppDefCls">${classOptions("")}</select></label>
          <label class="small">Mật khẩu mặc định <input id="ppDefPw" value="123456" style="width:100px"></label>
        </div>
        ${rows.length ? `
          <p><strong>${rows.length}</strong> dòng đọc được. Xem trước:</p>
          <div class="table-wrap"><table class="pp-table"><thead><tr><th>#</th><th>Họ tên</th><th>Lớp</th><th>Email</th><th>Vai trò</th><th>SĐT PH</th></tr></thead>
          <tbody>${rows.slice(0, 50).map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.fullName)}</td><td>${esc(r.className || "")}</td><td class="small">${esc(r.email || "(tự tạo)")}</td><td>${esc(ROLE_VI[r.role] || r.role || "Học sinh")}</td><td>${esc(r.parentPhone || "")}</td></tr>`).join("")}</tbody></table></div>
          ${rows.length > 50 ? `<p class="small muted">… và ${rows.length - 50} dòng nữa.</p>` : ""}
          <button type="button" class="btn btn-primary" id="ppDoImport"><i class=mi>group_add</i> Nhập ${rows.length} tài khoản</button>` : ""}
        ${res ? `
          <div class="notice pp-result"><strong>${esc(res.message)}</strong></div>
          <button type="button" class="btn btn-light btn-sm" id="ppExportLogins"><i class=mi>download</i> Tải danh sách tài khoản (CSV)</button>
          <div class="table-wrap"><table class="pp-table"><thead><tr><th>#</th><th>Họ tên</th><th>Kết quả</th><th>Tên đăng nhập</th><th>Ghi chú</th></tr></thead>
          <tbody>${res.results.map(r => `<tr><td>${r.row}</td><td>${esc(r.fullName)}</td><td><span class="badge ${r.status === "created" ? "green" : r.status === "skipped" ? "" : "red"}">${r.status === "created" ? "Đã tạo" : r.status === "skipped" ? "Bỏ qua" : "Lỗi"}</span></td><td class="small">${esc(r.login || "")}${r.parent ? `<br><span class="muted">PH: ${esc(r.parent)}</span>` : ""}</td><td class="small">${esc(r.message || "")}</td></tr>`).join("")}</tbody></table></div>` : ""}
      </div>`;
    body.querySelector("#ppTemplate").addEventListener("click", () => downloadText("mau-nhap-tai-khoan-engo.csv", ["Họ và tên,Lớp,Email,Mật khẩu,Vai trò,SĐT phụ huynh,Tên phụ huynh", "Trịnh Minh Khôi,9A6,,,Học sinh,0912345678,Trịnh Văn Nam", "Nguyễn Gia An,9A1,,,Học sinh,,"].join("\r\n")));
    body.querySelector("#ppFile").addEventListener("change", async e => {
      const file = e.target.files[0]; e.target.value = "";
      if (!file) return;
      try {
        const matrix = await readFile(file);
        const mapped = mapRows(matrix);
        if (!mapped) { showToast("Không tìm thấy cột Họ và tên trong file."); return; }
        state.importRows = mapped; state.importResult = null;
        renderImport(body);
        showToast(`Đọc được ${mapped.length} dòng.`);
      } catch (ex) { showToast(ex.message || "Không đọc được file."); }
    });
    body.querySelector("#ppDoImport")?.addEventListener("click", async e => {
      const defCls = body.querySelector("#ppDefCls").value;
      const defPw = body.querySelector("#ppDefPw").value.trim() || "123456";
      const payload = state.importRows.map(r => ({ ...r, className: r.className || defCls }));
      e.target.disabled = true; e.target.textContent = "Đang nhập...";
      try {
        state.importResult = await apiRequest("/api/admin/users/import", { method: "POST", body: JSON.stringify({ rows: payload, defaultPassword: defPw }) });
        state.importRows = [];
        showToast(state.importResult.message);
        await loadAll();
        renderImport(body);
      } catch (ex) { showToast(ex.message); e.target.disabled = false; e.target.textContent = "Thử lại"; }
    });
    body.querySelector("#ppExportLogins")?.addEventListener("click", () => {
      const lines = ["STT,Họ tên,Vai trò,Tên đăng nhập,Kết quả,Ghi chú,SĐT phụ huynh"];
      res.results.forEach(r => lines.push([r.row, r.fullName, ROLE_VI[r.role] || r.role, r.login || "", r.status, r.message || "", r.parent || ""].map(csvCell).join(",")));
      downloadText(`tai-khoan-engo-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\r\n"));
    });
  }

  async function renderRbac(body) {
    body.innerHTML = `<p class="small muted">Đang tải...</p>`;
    try { state.rbac = await apiRequest("/api/admin/rbac"); } catch (e) { body.innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
    const { roles, permissions, grants, locked } = state.rbac;
    const groups = [...new Set(permissions.map(p => p.group))];
    body.innerHTML = `
      <p class="small muted">Mỗi vai trò có một tập quyền. Mọi API kiểm tra quyền (không kiểm tra tên vai trò), nên đổi ở đây có hiệu lực ngay cho toàn hệ thống. Phạm vi dữ liệu vẫn giới hạn: giáo viên chỉ thấy lớp phụ trách, phụ huynh chỉ thấy con mình.</p>
      <div class="table-wrap"><table class="pp-table pp-rbac"><thead><tr><th>Quyền</th>${roles.map(r => `<th>${esc(r.label)}</th>`).join("")}</tr></thead>
      <tbody>${groups.map(g => `<tr class="pp-group"><td colspan="${roles.length + 1}">${esc(g)}</td></tr>` + permissions.filter(p => p.group === g).map(p => `<tr><td><strong>${esc(p.label)}</strong><br><code class="small">${esc(p.key)}</code></td>${roles.map(r => { const lk = locked.includes(`${r.key}:${p.key}`); return `<td class="pp-cell"><input type="checkbox" data-role="${r.key}" data-perm="${p.key}" ${(grants[r.key] || []).includes(p.key) ? "checked" : ""} ${lk ? "disabled title=\"Quyền bắt buộc\"" : ""}></td>`; }).join("")}</tr>`).join("")).join("")}</tbody></table></div>
      <button type="button" class="btn btn-primary" id="ppSaveRbac"><i class=mi>save</i> Lưu phân quyền</button>`;
    body.querySelector("#ppSaveRbac").addEventListener("click", async () => {
      const next = {};
      roles.forEach(r => { next[r.key] = [...body.querySelectorAll(`input[data-role="${r.key}"]:checked`)].map(i => i.dataset.perm); });
      try { const d = await apiRequest("/api/admin/rbac", { method: "PUT", body: JSON.stringify({ grants: next }) }); showToast(d.message); } catch (e) { showToast(e.message); }
    });
  }

  async function openClassPicker() {
    try { const d = await apiRequest("/api/teacher/my-classes"); state.classes = d.classes || []; state.available = d.available || []; } catch (e) {}
    const chosen = new Set(state.classes);
    const byGrade = {};
    state.available.forEach(c => { const g = (c.match(/^\d+/) || ["Khác"])[0]; (byGrade[g] = byGrade[g] || []).push(c); });
    const dlg = dialog("Chọn lớp phụ trách", `
      <p class="small muted">Chọn các lớp bạn dạy. Bạn sẽ quản lý học sinh, phụ huynh và xem kết quả của các lớp này.</p>
      ${Object.keys(byGrade).sort((a, b) => a.localeCompare(b, "vi", { numeric: true })).map(g => `<div class="pp-grade"><strong>Khối ${esc(g)}</strong><div class="pp-chips">${byGrade[g].map(c => `<button type="button" class="pp-chip ${chosen.has(c) ? "on" : ""}" data-cls="${esc(c)}">${esc(c)}</button>`).join("")}</div></div>`).join("")}
      <div class="pp-toolbar" style="margin-top:12px"><input id="ppNewCls" placeholder="Lớp khác, VD: 9A14" style="width:160px"><button type="button" class="btn btn-light btn-sm" id="ppAddCls">Thêm</button></div>
      <button type="button" class="btn btn-primary" id="ppSaveCls" style="width:100%;margin-top:10px">Lưu lớp phụ trách</button>`, { wide: true });
    const el = dlg.el;
    const bindChip = b => b.addEventListener("click", () => { const c = b.dataset.cls; chosen.has(c) ? chosen.delete(c) : chosen.add(c); b.classList.toggle("on", chosen.has(c)); });
    el.querySelectorAll(".pp-chip").forEach(bindChip);
    el.querySelector("#ppAddCls").addEventListener("click", () => {
      const v = el.querySelector("#ppNewCls").value.trim().toUpperCase().replace(/\s+/g, "");
      if (!/^[0-9A-Z]{2,10}$/.test(v)) { showToast("Tên lớp không hợp lệ."); return; }
      chosen.add(v);
      const b = document.createElement("button"); b.type = "button"; b.className = "pp-chip on"; b.dataset.cls = v; b.textContent = v; bindChip(b);
      (el.querySelector(".pp-chips") || el.querySelector(".pp-dialog-body")).appendChild(b);
      el.querySelector("#ppNewCls").value = "";
    });
    el.querySelector("#ppSaveCls").addEventListener("click", async () => {
      try {
        const d = await apiRequest("/api/teacher/my-classes", { method: "PUT", body: JSON.stringify({ classes: [...chosen] }) });
        showToast(d.message);
        const u = me(); if (u) u.teacherClasses = d.classes;
        dlg.close();
        await reload();
        window.dispatchEvent(new CustomEvent("engo:classes-changed", { detail: d.classes }));
      } catch (e) { showToast(e.message); }
    });
  }
  window.openClassPicker = openClassPicker;

  async function reload() {
    try { await loadAll(); } catch (e) { showToast(e.message); }
    render();
  }

  async function show() {
    const host = root();
    if (!host) return;
    if (!window.canAny("users.manage", "students.manage", "parents.manage")) {
      if (me()) switchView(ROLE_HOME[me().role] || "student-home");
      return;
    }
    host.innerHTML = `<p class="small muted">Đang tải...</p>`;
    await reload();
  }
  window.ENGO_PEOPLE = { show, openImport: () => { state.tab = "import"; switchView("people"); } };

  window.addEventListener("engo:view", e => { if (e.detail === "people") show(); });
  window.addEventListener("engo:user-ready", () => {
    const u = me();
    if (u && u.role === "teacher" && window.can("classes.assign_self") && !(u.teacherClasses || []).length && !sessionStorage.getItem("engoClassPrompted")) {
      sessionStorage.setItem("engoClassPrompted", "1");
      setTimeout(() => { if (!document.querySelector(".pp-dialog")) openClassPicker(); }, 900);
    }
    const activeView = document.querySelector(".view.active");
    if (activeView && activeView.id === "people") show();
  });

  const bindImportBtn = () => {
    const btn = document.getElementById("importDataBtn");
    if (!btn) return;
    btn.textContent = "Nhập Excel/CSV";
    const clone = btn.cloneNode(true);
    btn.replaceWith(clone);
    clone.addEventListener("click", () => window.ENGO_PEOPLE.openImport());
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindImportBtn); else bindImportBtn();
})();
