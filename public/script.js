    const views = [...document.querySelectorAll(".view")];
    const navButtons = [...document.querySelectorAll("[data-view]")];
    const sidebar = document.getElementById("sidebar");
    const roleSelect = document.getElementById("roleSelect");
    const avatar = document.getElementById("avatar");
    const toast = document.getElementById("toast");

    // ==========================================
    // HỆ THỐNG HIỆU ỨNG ÂM THANH (WEB AUDIO SFX)
    // ==========================================
    let audioCtx = null;
    function getAudioContext() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    // SFX 1: Tock Tock khi bấm nút / tab / option (Crisp Wooden Click)
    function playClickSound() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.035);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.035);
      } catch (e) {}
    }

    // SFX 2: Bắn pháo hoa / Yay khi trả lời đúng / xuất sắc (Joyful Celebration Chime)
    function playSuccessSound() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Hợp âm arpeggio chiến thắng (C5 -> E5 -> G5 -> C6)
        const chord = [523.25, 659.25, 783.99, 1046.50];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + i * 0.065;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + 0.32);
        });

        // Hiệu ứng pháo hoa tí tách lấp lánh (Sparkle crackle)
        const bufferSize = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.05;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2200, now + 0.24);
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.08, now + 0.24);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now + 0.24);
        noise.stop(now + 0.36);
      } catch (e) {}
    }

    // SFX 3: Âm thanh khi trả lời chưa đúng
    function playWrongSound() {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [320, 240];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.09;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.10, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.16);
        });
      } catch (e) {}
    }

    // Lắng nghe toàn cục sự kiện click để phát âm thanh "tock tock"
    document.addEventListener("click", e => {
      const target = e.target.closest("button, .btn, .nav-btn, .auth-tab, .speaking-tab, .option, .plan-item, .quick-action, .modal-close, [data-view]");
      if (target) {
        playClickSound();
      }
    }, true);

    const THEME_STORAGE_KEY="engoTheme";

    function applyTheme(theme){
      const dark=theme==="dark";
      document.body.classList.toggle("dark-mode",dark);
      document.querySelectorAll(".theme-toggle").forEach(button=>{
        button.setAttribute("aria-pressed",String(dark));
        button.title=dark?"Chuyển sang giao diện sáng":"Chuyển sang giao diện tối";
        const icon=button.querySelector(".theme-icon");
        if(icon) icon.textContent=dark?"☀":"☾";
      });
    }

    function getPreferredTheme(){
      const saved=localStorage.getItem(THEME_STORAGE_KEY);
      if(saved==="dark"||saved==="light") return saved;
      return window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
    }

    applyTheme(getPreferredTheme());

    document.querySelectorAll(".theme-toggle").forEach(button=>{
      button.addEventListener("click",()=>{
        const next=document.body.classList.contains("dark-mode")?"light":"dark";
        localStorage.setItem(THEME_STORAGE_KEY,next);
        applyTheme(next);
        showToast(next==="dark"?"Đã bật giao diện tối":"Đã bật giao diện sáng");
      });
    });

    function showToast(message){
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(()=>toast.classList.remove("show"),1800);
    }

    // ==========================================
    // SPA ROUTER & SUB-PATH URL SYNCHRONIZATION
    // ==========================================
    const ROUTE_MAP = {
      "student-home": "/dashboard",
      "quiz": "/contest",
      "achievements": "/rewards",
      "assignments": "/assignments",
      "flashcards": "/flashcards",
      "errorHealing": "/healing",
      "results": "/results",
      "speaking-lab": "/speaking",
      "focus-room": "/focus",
      "smart-review": "/smart-review",
      "teacher-home": "/teacher",
      "parent-home": "/parent",
      "data-admin": "/admin"
    };

    const REVERSE_ROUTE_MAP = {
      "/": "student-home",
      "/dashboard": "student-home",
      "/contest": "quiz",
      "/quiz": "quiz",
      "/rewards": "achievements",
      "/achievements": "achievements",
      "/assignments": "assignments",
      "/flashcards": "flashcards",
      "/healing": "errorHealing",
      "/healing-room": "errorHealing",
      "/results": "results",
      "/speaking": "speaking-lab",
      "/speaking-lab": "speaking-lab",
      "/focus": "focus-room",
      "/focus-room": "focus-room",
      "/smart-review": "smart-review",
      "/teacher": "teacher-home",
      "/parent": "parent-home",
      "/admin": "data-admin"
    };

    function switchView(id, pushHistory = true){
      if(!id) return;
      views.forEach(v=>v.classList.toggle("active",v.id===id));
      document.querySelectorAll(".nav-btn").forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.view===id);
      });
      sidebar.classList.remove("open");
      window.scrollTo({top:0,behavior:"smooth"});

      // Tự động cập nhật đường dẫn URL con (SPA Sub-path: /contest, /rewards, ...)
      const targetPath = ROUTE_MAP[id] || ("/" + id);
      if(pushHistory && window.location.pathname !== targetPath){
        window.history.pushState({ viewId: id }, "", targetPath);
      }

      if(id==="results" && currentUser && currentUser.role==="student"){
        renderStudentResults();
      }
      if(id==="errorHealing"){
        renderHealingRoom();
      }
      if(id==="speaking-lab"){
        loadStudentSpeakingAssignments();
      }
      if(id==="teacher-home" && currentUser && (currentUser.role==="teacher" || currentUser.role==="admin")){
        loadTeacherSpeakingTasks();
        loadTeacherSpeakingSubmissions();
      }
      if(id==="achievements"){
        renderLearningFeatures();
      }
    }

    // Xử lý nút Back / Forward trên trình duyệt
    window.addEventListener("popstate", (e) => {
      const path = (window.location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
      const viewId = (e.state && e.state.viewId) || REVERSE_ROUTE_MAP[path] || "student-home";
      switchView(viewId, false);
    });

    navButtons.forEach(btn=>{
      btn.addEventListener("click",e=>{
        e.preventDefault();
        if(btn.dataset.view) switchView(btn.dataset.view);
      });
    });

    document.getElementById("menuBtn").addEventListener("click",()=>sidebar.classList.toggle("open"));

    function applyRole(role, switchPage=true){
      document.querySelectorAll(".teacher-only").forEach(el=>el.classList.toggle("hidden",role!=="teacher"));
      document.querySelectorAll(".parent-only").forEach(el=>el.classList.toggle("hidden",role!=="parent"));
      document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("hidden",role!=="admin"));
      document.querySelectorAll("#mainNav .nav-btn").forEach(el=>el.classList.toggle("hidden",role!=="student"));
      roleSelect.value=role;
      if(!switchPage) return;

      // Ưu tiên chuyển trực tiếp tới view tương ứng nếu URL hiện tại có sub-path (/contest, /rewards, ...)
      const currentPath = (window.location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
      const targetViewFromUrl = REVERSE_ROUTE_MAP[currentPath];
      if(targetViewFromUrl) {
        switchView(targetViewFromUrl, false);
        return;
      }

      if(role==="teacher") switchView("teacher-home");
      else if(role==="parent") { switchView("parent-home"); renderParentDashboard(); }
      else if(role==="admin"){switchView("data-admin");renderDataAdmin()}
      else switchView("student-home");
    }

    roleSelect.disabled=true;

    function openDashboard(){
      const role=currentUser?.role||roleSelect.value||"student";
      if(role==="teacher") switchView("teacher-home");
      else if(role==="parent") { switchView("parent-home"); renderParentDashboard(); }
      else if(role==="admin"){switchView("data-admin");renderDataAdmin()}
      else switchView("student-home");
    }

    document.getElementById("dashboardBtn").addEventListener("click",openDashboard);


    // Authentication qua Node.js + MySQL
    const authScreen=document.getElementById("authScreen");
    let currentUser=null;

    // Các dữ liệu minh họa khác vẫn được lưu cục bộ; tài khoản người dùng không còn lưu ở localStorage.
    const defaultDatabase={
      questions:[
        {id:"GS9-U1-001",content:"My sister usually ______ to school by bicycle.",type:"Multiple Choice",unit:"Unit 1",status:"Đã duyệt"},
        {id:"GS9-U5-014",content:"The local people are very ______ to visitors. (FRIEND)",type:"Word Form",unit:"Unit 5",status:"Đã duyệt"},
        {id:"GS9-RD-022",content:"According to the passage, why are community events useful?",type:"Reading",unit:"Unit 5",status:"Đã duyệt"},
        {id:"GS9-PR-031",content:"Choose the word whose -ed ending is pronounced differently.",type:"Pronunciation",unit:"Review",status:"Cần kiểm tra"}
      ],
      tests:[
        {id:"t1",name:"Mid-term Practice 01",className:"9A1",questions:30,submitted:"31/42",status:"Đang mở"},
        {id:"t2",name:"Vocabulary – Unit 5",className:"9A2",questions:20,submitted:"28/40",status:"Đang mở"},
        {id:"t3",name:"Reading – Unit 4",className:"9A1",questions:12,submitted:"42/42",status:"Đã đóng"}
      ],
      logs:[
        {icon:"▤",title:"Tạo bài kiểm tra",detail:"Mid-term Practice 01 được giao cho lớp 9A1.",time:"10 phút trước"},
        {icon:"📄",title:"Nhập câu hỏi",detail:"Đã thêm 24 câu từ file DOCX Unit 5.",time:"Hôm qua"}
      ]
    };

    function cloneDefaultDB(){return JSON.parse(JSON.stringify(defaultDatabase))}
    function getDB(){
      try{
        const stored=JSON.parse(localStorage.getItem("engoContentDB"));
        return stored&&stored.questions&&stored.tests&&stored.logs?stored:cloneDefaultDB();
      }catch{return cloneDefaultDB()}
    }
    function saveDB(db){localStorage.setItem("engoContentDB",JSON.stringify(db))}
    if(!localStorage.getItem("engoContentDB")) saveDB(cloneDefaultDB());

    // Xóa dữ liệu đăng nhập giả từ phiên bản cũ.
    localStorage.removeItem("engoSession");
    localStorage.removeItem("engoDB");
    localStorage.removeItem("global9Session");
    localStorage.removeItem("global9DB");
    localStorage.removeItem("global9ContentDB");

    function setAuthError(element,message=""){
      element.textContent=message;
      element.classList.toggle("show",Boolean(message));
    }

    function getInitials(name,role){
      if(role==="teacher") return "GV";
      if(role==="parent") return "PH";
      if(role==="admin") return "QT";
      const parts=String(name||"HS").trim().split(/\s+/).filter(Boolean);
      return parts.slice(-2).map(part=>part[0]).join("").toUpperCase()||"HS";
    }

    function updateUserUI(user){
      currentUser=user;
      roleSelect.value=user.role;
      avatar.textContent=getInitials(user.fullName,user.role);
      const welcome=document.getElementById("welcomeHeading");
      if(welcome&&user.role==="student"){
        const shortName=String(user.fullName||"học sinh").trim().split(/\s+/).slice(-2).join(" ");
        const classBadge=user.className ? ` · Lớp ${escapeHTML(user.className)}` : "";
        welcome.textContent=`Chào ${shortName}${classBadge}, hôm nay cùng hoàn thành Unit 5 nhé!`;
      }
      if(user.role==="student"){
        renderImportedTests();
        renderStudentResults();
        renderDailyPlan();
        renderLearningFeatures();
        renderCapybaraCompanion();
        renderDashboardStats();
        renderCompetency();
        renderSmartReview();
      }
      if(user.role==="teacher"){
        renderTeacherResults();
        renderTeacherStats();
        renderTeacherRecentTests();
      }
    }

    function completeLogin(user){
      updateUserUI(user);
      authScreen.classList.add("hidden");
      applyRole(user.role);
      showToast(`Xin chào, ${user.fullName}`);
    }

    async function apiRequest(url,options={}){
      const response=await fetch(url,{
        credentials:"same-origin",
        ...options,
        headers:{"Content-Type":"application/json",...(options.headers||{})}
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.message||"Không thể thực hiện yêu cầu.");
      return data;
    }

    document.querySelectorAll("[data-auth-tab]").forEach(tab=>tab.addEventListener("click",()=>{
      document.querySelectorAll("[data-auth-tab]").forEach(x=>x.classList.toggle("active",x===tab));
      const login=tab.dataset.authTab==="login";
      document.getElementById("loginPane").classList.toggle("hidden",!login);
      document.getElementById("registerPane").classList.toggle("hidden",login);
      setAuthError(document.getElementById("loginError"));
      setAuthError(document.getElementById("registerError"));
    }));

    document.querySelectorAll("[data-password-target]").forEach(btn=>btn.addEventListener("click",()=>{
      const input=document.getElementById(btn.dataset.passwordTarget);
      input.type=input.type==="password"?"text":"password";
    }));

    // Toggle hiển thị chọn Lớp khi đổi vai trò ở form đăng ký
    const registerRoleSelect=document.getElementById("registerRole");
    const registerClassGroup=document.getElementById("registerClassGroup");
    if(registerRoleSelect && registerClassGroup){
      registerRoleSelect.addEventListener("change",()=>{
        const isStudent=registerRoleSelect.value==="student";
        registerClassGroup.style.display=isStudent?"block":"none";
        if(!isStudent) document.getElementById("registerClass").value="";
      });
    }

    document.getElementById("loginForm").addEventListener("submit",async e=>{
      e.preventDefault();
      const error=document.getElementById("loginError");
      setAuthError(error);
      const submit=e.submitter;
      if(submit) submit.disabled=true;
      try{
        const data=await apiRequest("/api/auth/login",{
          method:"POST",
          body:JSON.stringify({
            email:document.getElementById("loginEmail").value.trim(),
            password:document.getElementById("loginPassword").value,
            role:document.getElementById("loginRole").value
          })
        });
        completeLogin(data.user);
      }catch(err){
        setAuthError(error,err.message);
      }finally{
        if(submit) submit.disabled=false;
      }
    });

    // Xử lý gửi mã OTP và xác thực đăng ký
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const resendOtpLink = document.getElementById("resendOtpLink");
    const otpFieldWrap = document.getElementById("otpFieldWrap");
    const registerOtpInput = document.getElementById("registerOtp");
    const otpCountdownEl = document.getElementById("otpCountdown");
    let otpTimerInterval = null;
    let otpCooldown = 0;

    function startOtpCountdown(seconds = 300) {
      if(otpTimerInterval) clearInterval(otpTimerInterval);
      let left = seconds;
      otpTimerInterval = setInterval(() => {
        left = Math.max(0, left - 1);
        const m = String(Math.floor(left / 60)).padStart(2, "0");
        const s = String(left % 60).padStart(2, "0");
        if(otpCountdownEl) otpCountdownEl.textContent = `${m}:${s}`;
        if(left === 0) {
          clearInterval(otpTimerInterval);
          otpTimerInterval = null;
          if(otpCountdownEl) otpCountdownEl.textContent = "Hết hạn";
        }
      }, 1000);
    }

    async function handleSendOtp() {
      const email = document.getElementById("registerEmail").value.trim();
      const fullName = document.getElementById("registerName").value.trim();
      const error = document.getElementById("registerError");
      setAuthError(error);

      if(!email || !email.includes("@")) {
        setAuthError(error, "Vui lòng nhập địa chỉ email hợp lệ trước khi lấy mã OTP.");
        document.getElementById("registerEmail").focus();
        return false;
      }

      if(otpCooldown > 0) {
        showToast(`Vui lòng đợi ${otpCooldown}s trước khi yêu cầu gửi lại mã.`);
        return false;
      }

      if(sendOtpBtn) {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Đang gửi...";
      }

      try {
        const res = await apiRequest("/api/auth/send-otp", {
          method: "POST",
          body: JSON.stringify({ email, fullName })
        });

        showToast(res.message || "Đã gửi mã OTP về Gmail của bạn!");
        if(otpFieldWrap) otpFieldWrap.style.display = "block";
        if(registerOtpInput) registerOtpInput.focus();

        if(res.devOtp) {
          if(registerOtpInput) registerOtpInput.value = res.devOtp;
          const devBanner = document.getElementById("devOtpBanner");
          if(devBanner) {
            devBanner.style.display = "block";
            devBanner.innerHTML = `🔑 <span>Mã OTP của bạn: <strong style="font-size:17px;color:#4f46e5;letter-spacing:3px">${res.devOtp}</strong></span> <span style="font-size:11px;color:#16a34a;display:block;margin-top:2px">✓ Đã tự động điền vào ô bên dưới</span>`;
          }
        }

        startOtpCountdown(res.expiresInSeconds || 300);

        // Đếm ngược nút gửi lại 60s
        otpCooldown = 60;
        const cooldownTimer = setInterval(() => {
          otpCooldown--;
          if(sendOtpBtn) sendOtpBtn.textContent = otpCooldown > 0 ? `Gửi lại (${otpCooldown}s)` : "Gửi lại OTP";
          if(otpCooldown <= 0) {
            clearInterval(cooldownTimer);
            if(sendOtpBtn) sendOtpBtn.disabled = false;
          }
        }, 1000);

        return true;
      } catch(err) {
        setAuthError(error, err.message);
        if(sendOtpBtn) {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = "Gửi mã OTP";
        }
        return false;
      }
    }

    if(sendOtpBtn) sendOtpBtn.addEventListener("click", handleSendOtp);
    if(resendOtpLink) resendOtpLink.addEventListener("click", (e) => {
      e.preventDefault();
      handleSendOtp();
    });

    document.getElementById("registerForm").addEventListener("submit",async e=>{
      e.preventDefault();
      const error=document.getElementById("registerError");
      setAuthError(error);
      const fullName=document.getElementById("registerName").value.trim();
      const email=document.getElementById("registerEmail").value.trim();
      const password=document.getElementById("registerPassword").value;
      const confirm=document.getElementById("registerConfirm").value;
      const role=document.getElementById("registerRole").value;
      const className=document.getElementById("registerClass")?.value || "";
      const otp=document.getElementById("registerOtp")?.value.trim() || "";

      if(!fullName || !email || !password){
        setAuthError(error,"Vui lòng điền đầy đủ các trường thông tin.");
        return;
      }
      if(password!==confirm){
        setAuthError(error,"Hai mật khẩu chưa trùng khớp.");
        return;
      }
      if(role==="student" && !className){
        setAuthError(error,"Vui lòng chọn lớp học của bạn.");
        return;
      }

      // Nếu chưa nhập mã OTP, tự động kích hoạt gửi OTP và báo học sinh
      if(!otp){
        if(otpFieldWrap && otpFieldWrap.style.display === "none"){
          const sent = await handleSendOtp();
          if(sent){
            setAuthError(error, "Hệ thống đã gửi mã 6 số về Gmail của bạn. Vui lòng mở Gmail, lấy mã và nhập vào ô bên dưới.");
          }
        } else {
          setAuthError(error, "Vui lòng nhập mã xác thực 6 số được gửi về Gmail của bạn.");
          if(registerOtpInput) registerOtpInput.focus();
        }
        return;
      }

      const submit=e.submitter || document.getElementById("registerSubmitBtn");
      if(submit) submit.disabled=true;
      try{
        const data=await apiRequest("/api/auth/register",{
          method:"POST",
          body:JSON.stringify({fullName,email,password,role,className,otp})
        });
        showToast(data.message||"Đăng ký thành công!");
        e.target.reset();
        if(otpFieldWrap) otpFieldWrap.style.display = "none";
        if(otpTimerInterval) clearInterval(otpTimerInterval);
        const emailStatusEl = document.getElementById("emailVerifyStatus");
        if(emailStatusEl) emailStatusEl.style.display = "none";
        if(registerClassGroup) registerClassGroup.style.display="block";
        document.getElementById("loginEmail").value=email;
        document.querySelector('[data-auth-tab="login"]').click();
      }catch(err){
        setAuthError(error,err.message);
      }finally{
        if(submit) submit.disabled=false;
      }
    });

    // Real-time Email Verification on Registration Form
    const regEmailInput = document.getElementById("registerEmail");
    const emailStatusEl = document.getElementById("emailVerifyStatus");
    let emailCheckTimeout = null;

    if (regEmailInput && emailStatusEl) {
      const checkEmailValidity = async (emailVal) => {
        const val = (emailVal || "").trim();
        if (!val) {
          emailStatusEl.style.display = "none";
          return;
        }
        if (!val.includes("@") || !val.includes(".")) {
          emailStatusEl.style.display = "block";
          emailStatusEl.style.color = "#dc2626";
          emailStatusEl.textContent = "⚠️ Vui lòng nhập đúng định dạng email (ví dụ: ten@gmail.com)";
          return;
        }
        emailStatusEl.style.display = "block";
        emailStatusEl.style.color = "#4f46e5";
        emailStatusEl.textContent = "🔍 Đang kiểm tra máy chủ email...";

        try {
          const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(val)}`);
          const data = await res.json();
          if (data.valid) {
            emailStatusEl.style.color = "#16a34a";
            const isGm = data.details?.isGmail;
            emailStatusEl.textContent = isGm ? "✓ Email Gmail hợp lệ và có thật." : "✓ Email hợp lệ và có máy chủ nhận thư (MX Verified).";
          } else {
            emailStatusEl.style.color = "#dc2626";
            emailStatusEl.textContent = `✕ ${data.message || "Email không hợp lệ hoặc không tồn tại."}`;
          }
        } catch (e) {
          emailStatusEl.style.display = "none";
        }
      };

      regEmailInput.addEventListener("input", (e) => {
        clearTimeout(emailCheckTimeout);
        emailCheckTimeout = setTimeout(() => checkEmailValidity(e.target.value), 450);
      });

      regEmailInput.addEventListener("blur", (e) => {
        checkEmailValidity(e.target.value);
      });
    }

    document.getElementById("logoutBtn").addEventListener("click",async()=>{
      try{await apiRequest("/api/auth/logout",{method:"POST",body:"{}"})}catch{}
      currentUser=null;
      renderDailyPlan();
      renderLearningFeatures();
      renderCapybaraCompanion();
      renderDashboardStats();
      authScreen.classList.remove("hidden");
      switchView("student-home");
      document.getElementById("loginForm").reset();
      showToast("Đã đăng xuất");
    });

    async function restoreSession(){
      try{
        const data=await apiRequest("/api/auth/me");
        updateUserUI(data.user);
        authScreen.classList.add("hidden");
        applyRole(data.user.role);
      }catch{
        authScreen.classList.remove("hidden");
      }
    }

    restoreSession();

    // Flashcard module
    const flashDecks={
      community:{name:"Unit 5 · Community",cards:[
        {word:"community",phonetic:"/kəˈmjuːnəti/",meaning:"cộng đồng",example:"Our school works closely with the local community."},
        {word:"neighbourhood",phonetic:"/ˈneɪbəhʊd/",meaning:"khu dân cư",example:"There is a new library in my neighbourhood."},
        {word:"volunteer",phonetic:"/ˌvɒlənˈtɪə(r)/",meaning:"tình nguyện viên",example:"Many students volunteer at the community centre."},
        {word:"facility",phonetic:"/fəˈsɪləti/",meaning:"cơ sở vật chất",example:"The sports facility is open to local residents."},
        {word:"resident",phonetic:"/ˈrezɪdənt/",meaning:"cư dân",example:"Residents joined the clean-up campaign."},
        {word:"crowded",phonetic:"/ˈkraʊdɪd/",meaning:"đông đúc",example:"The market becomes crowded at weekends."},
        {word:"convenient",phonetic:"/kənˈviːniənt/",meaning:"thuận tiện",example:"Public transport is convenient in the city."},
        {word:"preserve",phonetic:"/prɪˈzɜːv/",meaning:"bảo tồn",example:"We should preserve local traditions."}
      ]},
      environment:{name:"Unit 7 · Environment",cards:[
        {word:"pollution",phonetic:"/pəˈluːʃn/",meaning:"ô nhiễm",example:"Air pollution affects our health."},
        {word:"recycle",phonetic:"/ˌriːˈsaɪkl/",meaning:"tái chế",example:"We recycle paper and plastic at school."},
        {word:"renewable",phonetic:"/rɪˈnjuːəbl/",meaning:"có thể tái tạo",example:"Solar power is a renewable energy source."},
        {word:"reduce",phonetic:"/rɪˈdjuːs/",meaning:"giảm",example:"We need to reduce plastic waste."},
        {word:"habitat",phonetic:"/ˈhæbɪtæt/",meaning:"môi trường sống",example:"Forests are the natural habitat of many animals."},
        {word:"conserve",phonetic:"/kənˈsɜːv/",meaning:"bảo tồn, tiết kiệm",example:"Turn off lights to conserve energy."}
      ]},
      pronunciation:{name:"Pronunciation · -ed",cards:[
        {word:"played",phonetic:"/pleɪd/",meaning:"-ed phát âm /d/",example:"The final sound before -ed is voiced."},
        {word:"wanted",phonetic:"/ˈwɒntɪd/",meaning:"-ed phát âm /ɪd/",example:"Use /ɪd/ after /t/ or /d/."},
        {word:"washed",phonetic:"/wɒʃt/",meaning:"-ed phát âm /t/",example:"The final sound /ʃ/ is voiceless."},
        {word:"needed",phonetic:"/ˈniːdɪd/",meaning:"-ed phát âm /ɪd/",example:"The verb ends in /d/."},
        {word:"opened",phonetic:"/ˈəʊpənd/",meaning:"-ed phát âm /d/",example:"The verb ends in a voiced sound."},
        {word:"helped",phonetic:"/helpt/",meaning:"-ed phát âm /t/",example:"The verb ends in the voiceless sound /p/."}
      ]}
    };
    let activeDeck="community",flashOrder=[],flashIndex=0,flashKnown=new Set(),flashReview=new Set();
    function resetFlashOrder(){flashOrder=flashDecks[activeDeck].cards.map((_,i)=>i);flashIndex=0;flashKnown=new Set();flashReview=new Set();renderFlashcard()}
    function currentFlash(){return flashDecks[activeDeck].cards[flashOrder[flashIndex]]}
    function renderFlashcard(){
      const deck=flashDecks[activeDeck],card=currentFlash();
      document.getElementById("flashcardInner").classList.remove("flipped");
      document.getElementById("flashDeckName").textContent=deck.name;
      document.getElementById("flashProgressText").textContent=`Thẻ ${flashIndex+1} / ${deck.cards.length}`;
      document.getElementById("flashProgressBar").style.width=`${(flashIndex+1)/deck.cards.length*100}%`;
      document.getElementById("flashWord").textContent=card.word;document.getElementById("flashPhonetic").textContent=card.phonetic;
      document.getElementById("flashMeaning").textContent=card.meaning;document.getElementById("flashExample").textContent=card.example;
      document.getElementById("knownCards").textContent=flashKnown.size;document.getElementById("reviewCards").textContent=flashReview.size;
    }
    function flipFlash(){document.getElementById("flashcardInner").classList.toggle("flipped")}
    document.getElementById("flashcardShell").addEventListener("click",flipFlash);document.getElementById("flashFlip").addEventListener("click",flipFlash);
    document.getElementById("flashcardShell").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();flipFlash()}});
    document.getElementById("flashPrev").addEventListener("click",()=>{flashIndex=(flashIndex-1+flashOrder.length)%flashOrder.length;renderFlashcard()});
    document.getElementById("flashNext").addEventListener("click",()=>{flashIndex=(flashIndex+1)%flashOrder.length;renderFlashcard()});
    document.getElementById("markKnown").addEventListener("click",()=>{const id=flashOrder[flashIndex];flashKnown.add(id);flashReview.delete(id);flashIndex=(flashIndex+1)%flashOrder.length;renderFlashcard()});
    document.getElementById("markReview").addEventListener("click",()=>{const id=flashOrder[flashIndex];flashReview.add(id);flashKnown.delete(id);flashIndex=(flashIndex+1)%flashOrder.length;renderFlashcard()});
    document.getElementById("shuffleCards").addEventListener("click",()=>{flashOrder.sort(()=>Math.random()-.5);flashIndex=0;renderFlashcard();showToast("Đã trộn thứ tự flashcard")});
    document.getElementById("restartCards").addEventListener("click",resetFlashOrder);
    document.querySelectorAll("[data-deck]").forEach(btn=>btn.addEventListener("click",()=>{activeDeck=btn.dataset.deck;document.querySelectorAll("[data-deck]").forEach(x=>x.classList.toggle("active",x===btn));resetFlashOrder()}));
    resetFlashOrder();

    // Quản lý người dùng bằng MySQL; câu hỏi và bài kiểm tra vẫn là dữ liệu minh họa cục bộ.
    const roleLabels={student:"Học sinh",teacher:"Giáo viên",parent:"Phụ huynh",admin:"Quản trị viên"};
    const statusLabels={active:"Đang hoạt động",pending:"Chờ duyệt",locked:"Đã khóa"};
    let adminUsers=[];

    function escapeHTML(value){return String(value??"").replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[m]))}

    async function loadAdminUsers(){
      const data=await apiRequest("/api/admin/users");
      adminUsers=data.users||[];
      return adminUsers;
    }

    async function renderDataAdmin(){
      if(!currentUser||currentUser.role!=="admin") return;
      const db=getDB();
      const term=(document.getElementById("dataSearch")?.value||"").trim().toLowerCase();
      try{
        await loadAdminUsers();
      }catch(err){
        showToast(err.message);
        return;
      }

      document.getElementById("dbUserCount").textContent=adminUsers.length;
      document.getElementById("dbQuestionCount").textContent=db.questions.length;
      document.getElementById("dbTestCount").textContent=db.tests.length;
      document.getElementById("dbStorageCount").textContent=`${Math.max(1,Math.round(new Blob([JSON.stringify(db)]).size/1024))} KB`;

      const users=adminUsers.filter(u=>`${u.fullName} ${u.email} ${u.role} ${u.className||""}`.toLowerCase().includes(term));
      document.getElementById("userTableBody").innerHTML=users.map(u=>{
        const roleText = u.role === "student" && u.className ? `Học sinh (${escapeHTML(u.className)})` : (roleLabels[u.role]||u.role);
        return `<tr><td><strong>${escapeHTML(u.fullName)}</strong></td><td>${escapeHTML(u.email)}</td><td>${roleText}</td><td><span class="badge ${u.status==="active"?"green":u.status==="locked"?"red":"orange"}">${statusLabels[u.status]||u.status}</span></td><td><button class="btn btn-light btn-sm user-toggle" data-user-id="${u.id}" data-user-status="${u.status}">${u.status==="locked"?"Mở khóa":u.status==="pending"?"Duyệt":"Khóa"}</button> <button class="btn btn-danger btn-sm user-delete" data-user-id="${u.id}">Xóa</button></td></tr>`;
      }).join("")||`<tr><td colspan="5" class="empty-state">Không tìm thấy tài khoản.</td></tr>`;

      const qs=db.questions.filter(q=>`${q.id} ${q.content} ${q.type} ${q.unit}`.toLowerCase().includes(term));
      document.getElementById("questionTableBody").innerHTML=qs.map(q=>`<tr><td><strong>${escapeHTML(q.id)}</strong></td><td>${escapeHTML(q.content)}</td><td>${escapeHTML(q.type)}</td><td>${escapeHTML(q.unit)}</td><td><span class="badge ${q.status==="Đã duyệt"?"green":"orange"}">${escapeHTML(q.status)}</span></td></tr>`).join("")||`<tr><td colspan="5" class="empty-state">Không tìm thấy câu hỏi.</td></tr>`;

      const tests=db.tests.filter(t=>`${t.name} ${t.className} ${t.status}`.toLowerCase().includes(term));
      document.getElementById("testTableBody").innerHTML=tests.map(t=>`<tr><td><strong>${escapeHTML(t.name)}</strong></td><td>${escapeHTML(t.className)}</td><td>${t.questions}</td><td>${escapeHTML(t.submitted)}</td><td><span class="badge ${t.status==="Đang mở"?"green":""}">${escapeHTML(t.status)}</span></td></tr>`).join("")||`<tr><td colspan="5" class="empty-state">Không tìm thấy bài kiểm tra.</td></tr>`;

      document.getElementById("activityLog").innerHTML=db.logs.filter(l=>`${l.title} ${l.detail}`.toLowerCase().includes(term)).map(l=>`<div class="log-item"><div class="log-icon">${escapeHTML(l.icon)}</div><div><strong>${escapeHTML(l.title)}</strong><p>${escapeHTML(l.detail)}</p></div><span class="small muted">${escapeHTML(l.time)}</span></div>`).join("")||`<div class="empty-state">Chưa có nhật ký phù hợp.</div>`;

      document.querySelectorAll(".user-toggle").forEach(btn=>btn.addEventListener("click",async()=>{
        const nextStatus=btn.dataset.userStatus==="locked"?"active":btn.dataset.userStatus==="pending"?"active":"locked";
        try{
          await apiRequest(`/api/admin/users/${btn.dataset.userId}/status`,{method:"PATCH",body:JSON.stringify({status:nextStatus})});
          showToast(nextStatus==="active"?"Đã kích hoạt tài khoản":"Đã khóa tài khoản");
          await renderDataAdmin();
        }catch(err){showToast(err.message)}
      }));

      document.querySelectorAll(".user-delete").forEach(btn=>btn.addEventListener("click",async()=>{
        if(!confirm("Xóa tài khoản này khỏi MySQL?")) return;
        try{
          await apiRequest(`/api/admin/users/${btn.dataset.userId}`,{method:"DELETE",body:"{}"});
          showToast("Đã xóa tài khoản");
          await renderDataAdmin();
        }catch(err){showToast(err.message)}
      }));
    }

    document.querySelectorAll("[data-data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
      document.querySelectorAll("[data-data-tab]").forEach(x=>x.classList.toggle("active",x===btn));
      document.querySelectorAll(".data-panel").forEach(p=>p.classList.toggle("active",p.id===`data-${btn.dataset.dataTab}`));
    }));

    document.getElementById("dataSearch").addEventListener("input",()=>renderDataAdmin());
    document.getElementById("openAddUser").addEventListener("click",()=>document.getElementById("addUserModal").classList.remove("hidden"));
    document.querySelectorAll(".add-user-close").forEach(btn=>btn.addEventListener("click",()=>document.getElementById("addUserModal").classList.add("hidden")));

    const newUserRoleSelect=document.getElementById("newUserRole");
    const newUserClassGroup=document.getElementById("newUserClassGroup");
    if(newUserRoleSelect && newUserClassGroup){
      newUserRoleSelect.addEventListener("change",()=>{
        const isStudent=newUserRoleSelect.value==="student";
        newUserClassGroup.style.display=isStudent?"block":"none";
        if(!isStudent) document.getElementById("newUserClass").value="";
      });
    }

    document.getElementById("addUserForm").addEventListener("submit",async e=>{
      e.preventDefault();
      try{
        await apiRequest("/api/admin/users",{
          method:"POST",
          body:JSON.stringify({
            fullName:document.getElementById("newUserName").value.trim(),
            email:document.getElementById("newUserEmail").value.trim(),
            password:document.getElementById("newUserPassword").value,
            role:document.getElementById("newUserRole").value,
            className:document.getElementById("newUserClass")?.value || "",
            status:document.getElementById("newUserStatus").value
          })
        });
        document.getElementById("addUserModal").classList.add("hidden");
        e.target.reset();
        if(newUserClassGroup) newUserClassGroup.style.display="block";
        showToast("Đã thêm tài khoản vào MySQL");
        await renderDataAdmin();
      }catch(err){showToast(err.message)}
    });

    function downloadJSON(data,filename){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
    document.getElementById("exportDataBtn").addEventListener("click",async()=>{try{await loadAdminUsers();downloadJSON({...getDB(),users:adminUsers},`engo-data-${new Date().toISOString().slice(0,10)}.json`);showToast("Đã xuất dữ liệu JSON")}catch(err){showToast(err.message)}});
    document.getElementById("backupNow").addEventListener("click",async()=>{try{await loadAdminUsers();downloadJSON({...getDB(),users:adminUsers},`engo-backup-${Date.now()}.json`);document.getElementById("lastBackupText").textContent=`Đã sao lưu lúc ${new Date().toLocaleString("vi-VN")}.`;showToast("Đã tạo bản sao lưu")}catch(err){showToast(err.message)}});
    document.getElementById("importDataBtn").addEventListener("click",()=>document.getElementById("jsonImportInput").click());
    document.getElementById("jsonImportInput").addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const imported=JSON.parse(reader.result);if(!imported.questions||!imported.tests||!imported.logs)throw new Error();saveDB({questions:imported.questions,tests:imported.tests,logs:imported.logs});renderDataAdmin();showToast("Đã nhập nội dung; tài khoản MySQL không bị thay đổi")}catch{showToast("File JSON không đúng cấu trúc")}};reader.readAsText(file)});
    document.getElementById("resetDemoData").addEventListener("click",()=>{saveDB(cloneDefaultDB());renderDataAdmin();showToast("Đã khôi phục dữ liệu nội dung mẫu")});

    // 4 Bộ bài tập ngữ pháp trọng tâm hardcoded chuẩn kiến thức THCS
    const healingExercisesBank = {
      "PS_AFF": {
        label: "Hiện tại đơn — Khẳng định (+s/es)",
        rule: "Chủ ngữ ngôi thứ 3 số ít (he, she, it) thì động từ phải thêm -s hoặc -es.",
        mnemonic: "He/She/It thích thêm S. Động từ tận cùng o, s, z, x, ch, sh thì thêm ES.",
        category: "present-simple",
        questions: [
          { prompt: "My brother ________ TV every evening.", options: ["A. watch", "B. watches", "C. watching", "D. is watch"], answer: 1, explanation: "Chủ ngữ 'My brother' (số ít) nên động từ 'watch' phải thêm 'es'." },
          { prompt: "She ________ to school by bus.", options: ["A. goes", "B. go", "C. going", "D. is go"], answer: 0, explanation: "Chủ ngữ 'She' (số ít) nên động từ 'go' thêm 'es'." },
          { prompt: "Nam ________ English very well.", options: ["A. speak", "B. speaking", "C. speaks", "D. is speak"], answer: 2, explanation: "Chủ ngữ 'Nam' (số ít) nên động từ 'speak' thêm 's'." },
          { prompt: "It ________ a lot in summer.", options: ["A. rain", "B. raining", "C. rains", "D. is rain"], answer: 2, explanation: "Chủ ngữ 'It' (số ít) nên động từ 'rain' thêm 's'." },
          { prompt: "My father ________ coffee in the morning.", options: ["A. drink", "B. drinks", "C. drinking", "D. drank"], answer: 1, explanation: "Thói quen (in the morning) + Chủ ngữ số ít 'My father' -> 'drinks'." },
          { prompt: "The sun ________ in the east.", options: ["A. rise", "B. rising", "C. rises", "D. rose"], answer: 2, explanation: "Sự thật hiển nhiên + 'The sun' (số ít) -> 'rises'." },
          { prompt: "He often ________ his grandparents on Sundays.", options: ["A. visit", "B. visits", "C. visiting", "D. to visit"], answer: 1, explanation: "Chủ ngữ 'He' (số ít) -> 'visits'." },
          { prompt: "Mai ________ her teeth twice a day.", options: ["A. brush", "B. brushes", "C. brushing", "D. to brush"], answer: 1, explanation: "Chủ ngữ 'Mai' (số ít) và động từ tận cùng 'sh' -> 'brushes'." },
          { prompt: "The class ________ at 7 a.m.", options: ["A. start", "B. starting", "C. starts", "D. to start"], answer: 2, explanation: "Lịch trình + 'The class' (số ít) -> 'starts'." },
          { prompt: "My cat ________ mice.", options: ["A. catch", "B. catches", "C. catching", "D. to catch"], answer: 1, explanation: "Chủ ngữ 'My cat' (số ít) và động từ tận cùng 'ch' -> 'catches'." }
        ]
      },
      "PS_NEG": {
        label: "Hiện tại đơn — Phủ định (don't/doesn't)",
        rule: "Với chủ ngữ số nhiều/I/you, dùng don't. Với chủ ngữ số ít (he/she/it), dùng doesn't + V (nguyên thể).",
        mnemonic: "Số ít thì mượn 'doesn't', đã mượn rồi thì động từ KHÔNG chia nữa.",
        category: "present-simple",
        questions: [
          { prompt: "He ________ like playing football.", options: ["A. don't", "B. not", "C. doesn't", "D. isn't"], answer: 2, explanation: "Chủ ngữ 'He' (số ít) dùng trợ động từ 'doesn't'." },
          { prompt: "They ________ go to school on Sundays.", options: ["A. doesn't", "B. don't", "C. aren't", "D. not"], answer: 1, explanation: "Chủ ngữ 'They' (số nhiều) dùng trợ động từ 'don't'." },
          { prompt: "My mother ________ cook dinner every day.", options: ["A. don't", "B. not", "C. doesn't", "D. hasn't"], answer: 2, explanation: "Chủ ngữ 'My mother' (số ít) dùng 'doesn't'." },
          { prompt: "I ________ know the answer to this question.", options: ["A. doesn't", "B. don't", "C. am not", "D. not"], answer: 1, explanation: "Chủ ngữ 'I' dùng 'don't'." },
          { prompt: "She doesn't ________ any brothers or sisters.", options: ["A. has", "B. have", "C. having", "D. to have"], answer: 1, explanation: "Sau 'doesn't' động từ phải ở dạng nguyên thể là 'have'." },
          { prompt: "We ________ want to watch that movie.", options: ["A. doesn't", "B. not", "C. don't", "D. aren't"], answer: 2, explanation: "Chủ ngữ 'We' (số nhiều) dùng 'don't'." },
          { prompt: "The dog ________ bark at night.", options: ["A. don't", "B. doesn't", "C. isn't", "D. not"], answer: 1, explanation: "Chủ ngữ 'The dog' (số ít) dùng 'doesn't'." },
          { prompt: "Tom and Jerry ________ fight all the time.", options: ["A. doesn't", "B. don't", "C. aren't", "D. isn't"], answer: 1, explanation: "Chủ ngữ 'Tom and Jerry' (số nhiều) dùng 'don't'." },
          { prompt: "It ________ snow in Ho Chi Minh City.", options: ["A. doesn't", "B. don't", "C. isn't", "D. not"], answer: 0, explanation: "Chủ ngữ 'It' (số ít) dùng 'doesn't'." },
          { prompt: "My sister ________ read comic books.", options: ["A. don't", "B. doesn't", "C. isn't", "D. not"], answer: 1, explanation: "Chủ ngữ 'My sister' (số ít) dùng 'doesn't'." }
        ]
      },
      "PS_QUE": {
        label: "Hiện tại đơn — Nghi vấn (Do/Does)",
        rule: "Đảo Do/Does lên trước chủ ngữ. Do cho số nhiều, Does cho số ít. Động từ chính để nguyên thể.",
        mnemonic: "Hỏi Does thì mượn Does, động từ trả về nguyên gốc.",
        category: "present-simple",
        questions: [
          { prompt: "________ you like listening to music?", options: ["A. Does", "B. Do", "C. Are", "D. Is"], answer: 1, explanation: "Chủ ngữ 'you' dùng trợ động từ 'Do'." },
          { prompt: "________ she work in a hospital?", options: ["A. Do", "B. Does", "C. Is", "D. Are"], answer: 1, explanation: "Chủ ngữ 'she' (số ít) dùng trợ động từ 'Does'." },
          { prompt: "Does your father ________ a car?", options: ["A. drives", "B. drive", "C. driving", "D. to drive"], answer: 1, explanation: "Đã có 'Does' thì động từ phải ở dạng nguyên thể 'drive'." },
          { prompt: "________ they play tennis on weekends?", options: ["A. Does", "B. Are", "C. Do", "D. Have"], answer: 2, explanation: "Chủ ngữ 'they' (số nhiều) dùng 'Do'." },
          { prompt: "What time ________ the train leave?", options: ["A. do", "B. does", "C. is", "D. are"], answer: 1, explanation: "Chủ ngữ 'the train' (số ít) dùng 'does'." },
          { prompt: "________ Nam and Lan study in the same class?", options: ["A. Does", "B. Is", "C. Do", "D. Are"], answer: 2, explanation: "Chủ ngữ 'Nam and Lan' (số nhiều) dùng 'Do'." },
          { prompt: "How often ________ you go to the cinema?", options: ["A. does", "B. do", "C. are", "D. is"], answer: 1, explanation: "Chủ ngữ 'you' dùng 'do'." },
          { prompt: "Where ________ she live?", options: ["A. do", "B. does", "C. is", "D. are"], answer: 1, explanation: "Chủ ngữ 'she' (số ít) dùng 'does'." },
          { prompt: "Do you ________ any pets?", options: ["A. has", "B. have", "C. having", "D. to have"], answer: 1, explanation: "Đã có trợ động từ 'Do', động từ chính ở dạng nguyên thể 'have'." },
          { prompt: "Does it ________ a lot in your country?", options: ["A. rains", "B. rain", "C. raining", "D. to rain"], answer: 1, explanation: "Đã có 'Does' thì động từ chính nguyên thể 'rain'." }
        ]
      },
      "PS_ADV": {
        label: "Hiện tại đơn — Vị trí trạng từ tần suất",
        rule: "Trạng từ tần suất (always, usually, often...) đứng TRƯỚC động từ thường và SAU động từ to be (am/is/are).",
        mnemonic: "To be -> Trạng từ tần suất -> Động từ thường.",
        category: "present-simple",
        questions: [
          { prompt: "He ________ late for school.", options: ["A. always is", "B. is always", "C. always", "D. is"], answer: 1, explanation: "Trạng từ 'always' đứng sau động từ to be 'is'." },
          { prompt: "I ________ my homework in the evening.", options: ["A. usually do", "B. do usually", "C. usually doing", "D. am usually do"], answer: 0, explanation: "Trạng từ 'usually' đứng trước động từ thường 'do'." },
          { prompt: "She ________ goes to bed early.", options: ["A. never", "B. is never", "C. never is", "D. doesn't never"], answer: 0, explanation: "Trạng từ 'never' đứng trước động từ thường 'goes'." },
          { prompt: "They ________ very friendly.", options: ["A. often are", "B. are often", "C. often", "D. do often"], answer: 1, explanation: "Trạng từ 'often' đứng sau động từ to be 'are'." },
          { prompt: "We ________ watch TV after dinner.", options: ["A. sometimes", "B. are sometimes", "C. sometimes are", "D. sometimes do"], answer: 0, explanation: "Trạng từ 'sometimes' đứng trước động từ thường 'watch'." },
          { prompt: "The weather ________ cold in winter.", options: ["A. usually is", "B. is usually", "C. usually", "D. does usually"], answer: 1, explanation: "Trạng từ 'usually' đứng sau động từ to be 'is'." },
          { prompt: "Nam ________ plays video games.", options: ["A. rarely", "B. is rarely", "C. rarely is", "D. rarely does"], answer: 0, explanation: "Trạng từ 'rarely' đứng trước động từ thường 'plays'." },
          { prompt: "You ________ late!", options: ["A. always are", "B. are always", "C. always", "D. do always"], answer: 1, explanation: "Trạng từ 'always' đứng sau to be 'are'." },
          { prompt: "I ________ get up at 6 a.m.", options: ["A. always", "B. always am", "C. am always", "D. do always"], answer: 0, explanation: "Trạng từ 'always' đứng trước động từ thường 'get up'." },
          { prompt: "She ________ tired after work.", options: ["A. often is", "B. is often", "C. often", "D. does often"], answer: 1, explanation: "Trạng từ 'often' đứng sau to be 'is'." }
        ]
      },
      "PAST_REG": {
        label: "Quá khứ đơn — Động từ quy tắc (-ed)",
        rule: "Thêm -ed vào sau động từ quy tắc. Chú ý: gấp đôi phụ âm cuối nếu từ có 1 âm tiết, tận cùng là 1 nguyên âm kẹp giữa 2 phụ âm (stop -> stopped). Đổi y thành i rồi thêm -ed (study -> studied).",
        mnemonic: "Nhớ gấp đôi phụ âm khi cần (stop-stopped). Có 'y' dài biến thành 'i' ngắn (study-studied).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ my grandparents last weekend.", options: ["A. visited", "B. visit", "C. visitted", "D. visiting"], answer: 0, explanation: "'visited' là quá khứ của 'visit', thêm 'ed' bình thường." },
          { prompt: "She ________ very hard for the exam.", options: ["A. studyed", "B. studied", "C. studies", "D. studying"], answer: 1, explanation: "Tận cùng 'y' sau một phụ âm, đổi 'y' thành 'i' và thêm 'ed' -> 'studied'." },
          { prompt: "The car ________ at the red light.", options: ["A. stoped", "B. stopped", "C. stops", "D. stopping"], answer: 1, explanation: "'stop' tận cùng là 1 phụ âm, trước là 1 nguyên âm -> gấp đôi phụ âm cuối 'stopped'." },
          { prompt: "They ________ a new house last year.", options: ["A. planned", "B. planed", "C. plans", "D. planning"], answer: 0, explanation: "'plan' gấp đôi phụ âm cuối thành 'planned'." },
          { prompt: "He ________ the match on TV.", options: ["A. watch", "B. watched", "C. watchhed", "D. watching"], answer: 1, explanation: "'watched' thêm 'ed' bình thường." },
          { prompt: "We ________ English when we were in London.", options: ["A. studyed", "B. studied", "C. studying", "D. studies"], answer: 1, explanation: "Quá khứ của 'study' là 'studied'." },
          { prompt: "The baby ________ all night.", options: ["A. cried", "B. cryed", "C. cries", "D. crying"], answer: 0, explanation: "'cry' tận cùng là 'y', đổi thành 'i' rồi thêm 'ed' -> 'cried'." },
          { prompt: "She ________ to go to the party.", options: ["A. wantted", "B. wanted", "C. want", "D. wanting"], answer: 1, explanation: "Thêm 'ed' bình thường thành 'wanted'." },
          { prompt: "I ________ to music yesterday.", options: ["A. listened", "B. listend", "C. listen", "D. listening"], answer: 0, explanation: "Quá khứ của 'listen' là 'listened'." },
          { prompt: "He ________ the heavy box easily.", options: ["A. droped", "B. dropped", "C. drop", "D. dropping"], answer: 1, explanation: "'drop' gấp đôi phụ âm cuối thành 'dropped'." }
        ]
      },
      "PAST_IRR": {
        label: "Quá khứ đơn — Động từ bất quy tắc (V2)",
        rule: "Động từ bất quy tắc không thêm -ed mà biến đổi dạng theo cột 2 trong bảng động từ bất quy tắc (go -> went, buy -> bought).",
        mnemonic: "Go đi thành went, Buy mua thành bought. Phải học thuộc V2 thui!",
        category: "past-simple",
        questions: [
          { prompt: "I ________ to the cinema yesterday.", options: ["A. goed", "B. went", "C. go", "D. gone"], answer: 1, explanation: "Quá khứ của 'go' là 'went'." },
          { prompt: "She ________ a new dress last week.", options: ["A. buyed", "B. bought", "C. buys", "D. buy"], answer: 1, explanation: "Quá khứ của 'buy' là 'bought'." },
          { prompt: "They ________ a delicious cake.", options: ["A. maked", "B. made", "C. makes", "D. make"], answer: 1, explanation: "Quá khứ của 'make' là 'made'." },
          { prompt: "He ________ a letter to his friend.", options: ["A. writed", "B. wrote", "C. write", "D. written"], answer: 1, explanation: "Quá khứ của 'write' là 'wrote'." },
          { prompt: "We ________ a great time at the party.", options: ["A. haved", "B. had", "C. has", "D. have"], answer: 1, explanation: "Quá khứ của 'have' là 'had'." },
          { prompt: "I ________ him at the supermarket.", options: ["A. seed", "B. saw", "C. seen", "D. see"], answer: 1, explanation: "Quá khứ của 'see' là 'saw'." },
          { prompt: "She ________ me a beautiful gift.", options: ["A. gived", "B. gave", "C. gives", "D. given"], answer: 1, explanation: "Quá khứ của 'give' là 'gave'." },
          { prompt: "They ________ the game.", options: ["A. winned", "B. won", "C. wins", "D. win"], answer: 1, explanation: "Quá khứ của 'win' là 'won'." },
          { prompt: "The boy ________ his bike yesterday.", options: ["A. rided", "B. rode", "C. ridden", "D. ride"], answer: 1, explanation: "Quá khứ của 'ride' là 'rode'." },
          { prompt: "I ________ a glass of milk this morning.", options: ["A. drinked", "B. drank", "C. drunk", "D. drink"], answer: 1, explanation: "Quá khứ của 'drink' là 'drank'." }
        ]
      },
      "PAST_NEG": {
        label: "Quá khứ đơn — Phủ định (didn't)",
        rule: "Câu phủ định quá khứ đơn: Chủ ngữ + didn't + V (nguyên thể). Đã mượn didn't thì không chia V quá khứ nữa.",
        mnemonic: "Đã mượn 'didn't' thì V phải trở về nguyên gốc (không thêm ed, không V2).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ go to school yesterday.", options: ["A. don't", "B. didn't", "C. doesn't", "D. wasn't"], answer: 1, explanation: "Phủ định quá khứ dùng 'didn't'." },
          { prompt: "She didn't ________ the movie.", options: ["A. watched", "B. watch", "C. watching", "D. watches"], answer: 1, explanation: "Sau 'didn't' dùng động từ nguyên thể 'watch'." },
          { prompt: "They ________ play football last Sunday.", options: ["A. weren't", "B. didn't", "C. don't", "D. wasn't"], answer: 1, explanation: "Phủ định quá khứ với động từ thường dùng 'didn't'." },
          { prompt: "He didn't ________ his keys.", options: ["A. found", "B. find", "C. finding", "D. finds"], answer: 1, explanation: "Sau 'didn't' động từ trở về nguyên thể 'find'." },
          { prompt: "We didn't ________ any photos on holiday.", options: ["A. took", "B. take", "C. taking", "D. takes"], answer: 1, explanation: "Động từ 'take' phải ở dạng nguyên thể sau 'didn't'." },
          { prompt: "Mai didn't ________ the homework.", options: ["A. did", "B. do", "C. does", "D. doing"], answer: 1, explanation: "Sau 'didn't' dùng động từ nguyên thể 'do'." },
          { prompt: "It didn't ________ yesterday.", options: ["A. rained", "B. rain", "C. raining", "D. rains"], answer: 1, explanation: "Động từ 'rain' nguyên thể sau 'didn't'." },
          { prompt: "The students didn't ________ the teacher.", options: ["A. understood", "B. understand", "C. understanding", "D. understands"], answer: 1, explanation: "Dùng nguyên thể 'understand' sau 'didn't'." },
          { prompt: "I didn't ________ a bike when I was young.", options: ["A. rode", "B. ride", "C. riding", "D. ridden"], answer: 1, explanation: "Nguyên thể 'ride' đi sau 'didn't'." },
          { prompt: "She didn't ________ early this morning.", options: ["A. woke up", "B. wake up", "C. waking up", "D. woken up"], answer: 1, explanation: "Dùng nguyên thể 'wake up' sau 'didn't'." }
        ]
      },
      "PAST_QUE": {
        label: "Quá khứ đơn — Nghi vấn (Did)",
        rule: "Câu hỏi quá khứ đơn: Đảo Did lên đầu câu + Chủ ngữ + V (nguyên thể). Đã có Did thì V không chia.",
        mnemonic: "Câu hỏi có 'Did' đứng đầu, động từ cũng phải trả về nguyên gốc.",
        category: "past-simple",
        questions: [
          { prompt: "________ you visit Hanoi last year?", options: ["A. Do", "B. Does", "C. Did", "D. Were"], answer: 2, explanation: "Câu hỏi quá khứ với động từ thường mượn trợ động từ 'Did'." },
          { prompt: "Did she ________ a new car?", options: ["A. bought", "B. buy", "C. buys", "D. buying"], answer: 1, explanation: "Đã có 'Did' thì động từ phải nguyên thể 'buy'." },
          { prompt: "What ________ they do yesterday?", options: ["A. did", "B. do", "C. are", "D. were"], answer: 0, explanation: "Từ để hỏi 'What' + trợ động từ quá khứ 'did'." },
          { prompt: "Did he ________ to the party?", options: ["A. went", "B. go", "C. going", "D. goes"], answer: 1, explanation: "Sau 'Did he' là động từ nguyên thể 'go'." },
          { prompt: "Where did you ________ that shirt?", options: ["A. found", "B. find", "C. finding", "D. finds"], answer: 1, explanation: "Động từ nguyên thể 'find' theo sau trợ động từ 'did'." },
          { prompt: "________ it rain last night?", options: ["A. Was", "B. Did", "C. Does", "D. Is"], answer: 1, explanation: "Câu hỏi về động từ 'rain' trong quá khứ dùng 'Did'." },
          { prompt: "Did they ________ the match?", options: ["A. won", "B. win", "C. winning", "D. wins"], answer: 1, explanation: "Động từ nguyên thể 'win' đi sau 'Did'." },
          { prompt: "Why did you ________ early?", options: ["A. left", "B. leave", "C. leaving", "D. leaves"], answer: 1, explanation: "Nguyên thể 'leave' đi sau 'did'." },
          { prompt: "________ Nam play football yesterday?", options: ["A. Did", "B. Was", "C. Does", "D. Do"], answer: 0, explanation: "Câu hỏi ở quá khứ cho động từ thường 'play' dùng 'Did'." },
          { prompt: "Did you ________ the news?", options: ["A. heard", "B. hear", "C. hearing", "D. hears"], answer: 1, explanation: "Động từ nguyên thể 'hear' theo sau 'Did'." }
        ]
      },
      "PAST_BE": {
        label: "Quá khứ đơn — To be (Was/Were)",
        rule: "I/he/she/it (số ít) dùng 'was'. You/we/they (số nhiều) dùng 'were'.",
        mnemonic: "Số ít đi với 'was' (3 chữ). Số nhiều đi với 'were' (4 chữ).",
        category: "past-simple",
        questions: [
          { prompt: "I ________ at home yesterday.", options: ["A. was", "B. were", "C. am", "D. are"], answer: 0, explanation: "Chủ ngữ 'I' đi với 'was'." },
          { prompt: "They ________ happy with the results.", options: ["A. was", "B. were", "C. are", "D. is"], answer: 1, explanation: "Chủ ngữ 'They' (số nhiều) đi với 'were'." },
          { prompt: "The weather ________ terrible last week.", options: ["A. was", "B. were", "C. is", "D. are"], answer: 0, explanation: "Chủ ngữ 'The weather' (số ít) đi với 'was'." },
          { prompt: "________ you at the park on Sunday?", options: ["A. Was", "B. Were", "C. Are", "D. Did"], answer: 1, explanation: "Chủ ngữ 'you' đi với 'Were' trong câu hỏi quá khứ." },
          { prompt: "She ________ not in class yesterday.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'She' đi với 'was'." },
          { prompt: "My parents ________ in London last year.", options: ["A. was", "B. were", "C. are", "D. did"], answer: 1, explanation: "Chủ ngữ 'My parents' (số nhiều) đi với 'were'." },
          { prompt: "The cat ________ on the roof.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'The cat' (số ít) đi với 'was'." },
          { prompt: "________ he a doctor before?", options: ["A. Was", "B. Were", "C. Is", "D. Did"], answer: 0, explanation: "Chủ ngữ 'he' đi với 'Was' trong câu hỏi." },
          { prompt: "We ________ late for the train.", options: ["A. was", "B. were", "C. are", "D. did"], answer: 1, explanation: "Chủ ngữ 'We' đi với 'were'." },
          { prompt: "It ________ a great movie.", options: ["A. was", "B. were", "C. is", "D. did"], answer: 0, explanation: "Chủ ngữ 'It' đi với 'was'." }
        ]
      },
      "CMP_SHORT": {
        label: "So sánh hơn — Tính từ ngắn",
        rule: "Thêm -er vào sau tính từ ngắn (1 âm tiết, hoặc 2 âm tiết tận cùng -y). Cấu trúc: Adj-er + than.",
        mnemonic: "Tính từ ngắn thì mọc thêm đuôi 'er'. Nhớ thêm 'than'. (tall -> taller than).",
        category: "comparatives",
        questions: [
          { prompt: "My house is ________ than yours.", options: ["A. biger", "B. bigger", "C. more big", "D. big"], answer: 1, explanation: "'big' (1 âm tiết), gấp đôi phụ âm cuối thành 'bigger'." },
          { prompt: "She is ________ than her sister.", options: ["A. tall", "B. taller", "C. more tall", "D. talller"], answer: 1, explanation: "'tall' (ngắn) thêm 'er' thành 'taller'." },
          { prompt: "Today is ________ than yesterday.", options: ["A. hoter", "B. hotter", "C. more hot", "D. hot"], answer: 1, explanation: "'hot' gấp đôi phụ âm cuối 'hotter'." },
          { prompt: "Math is ________ than history for me.", options: ["A. easyer", "B. easier", "C. more easy", "D. easy"], answer: 1, explanation: "'easy' tận cùng 'y' đổi thành 'i' rồi thêm 'er' -> 'easier'." },
          { prompt: "A car is ________ than a bicycle.", options: ["A. fast", "B. faster", "C. more fast", "D. fastter"], answer: 1, explanation: "'fast' (ngắn) thêm 'er' thành 'faster'." },
          { prompt: "My dog is ________ than my cat.", options: ["A. heavyer", "B. heavier", "C. more heavy", "D. heavy"], answer: 1, explanation: "'heavy' -> 'heavier'." },
          { prompt: "He is ________ than I am.", options: ["A. old", "B. older", "C. more old", "D. oldder"], answer: 1, explanation: "'old' -> 'older'." },
          { prompt: "The river is ________ than the lake.", options: ["A. deep", "B. deeper", "C. more deep", "D. deepper"], answer: 1, explanation: "'deep' -> 'deeper'." },
          { prompt: "Summer is ________ than spring.", options: ["A. warm", "B. warmer", "C. more warm", "D. warmmer"], answer: 1, explanation: "'warm' -> 'warmer'." },
          { prompt: "This box is ________ than that one.", options: ["A. small", "B. smaller", "C. more small", "D. smalller"], answer: 1, explanation: "'small' -> 'smaller'." }
        ]
      },
      "CMP_LONG": {
        label: "So sánh hơn — Tính từ dài",
        rule: "Tính từ dài (2 âm tiết trở lên, không tận cùng -y) dùng 'more + adj + than'.",
        mnemonic: "Tính từ dài, không thêm đuôi mà thêm 'more' đứng trước. (beautiful -> more beautiful).",
        category: "comparatives",
        questions: [
          { prompt: "This dress is ________ than that one.", options: ["A. beautifuler", "B. more beautiful", "C. most beautiful", "D. beautiful"], answer: 1, explanation: "'beautiful' là tính từ dài, dùng 'more beautiful'." },
          { prompt: "My phone is ________ than his.", options: ["A. expensiver", "B. more expensive", "C. expensive", "D. most expensive"], answer: 1, explanation: "'expensive' (dài) -> 'more expensive'." },
          { prompt: "Reading is ________ than watching TV.", options: ["A. interestinger", "B. more interesting", "C. interesting", "D. most interesting"], answer: 1, explanation: "'interesting' (dài) -> 'more interesting'." },
          { prompt: "She is ________ than her brother.", options: ["A. carefuler", "B. more careful", "C. careful", "D. most careful"], answer: 1, explanation: "'careful' (dài) -> 'more careful'." },
          { prompt: "This problem is ________ than the last one.", options: ["A. difficulter", "B. more difficult", "C. difficult", "D. most difficult"], answer: 1, explanation: "'difficult' (dài) -> 'more difficult'." },
          { prompt: "Health is ________ than money.", options: ["A. importanter", "B. more important", "C. important", "D. most important"], answer: 1, explanation: "'important' (dài) -> 'more important'." },
          { prompt: "City life is ________ than country life.", options: ["A. excitinger", "B. more exciting", "C. exciting", "D. most exciting"], answer: 1, explanation: "'exciting' (dài) -> 'more exciting'." },
          { prompt: "A sofa is ________ than a chair.", options: ["A. comfortabler", "B. more comfortable", "C. comfortable", "D. most comfortable"], answer: 1, explanation: "'comfortable' (dài) -> 'more comfortable'." },
          { prompt: "He is ________ than other students.", options: ["A. intelligenter", "B. more intelligent", "C. intelligent", "D. most intelligent"], answer: 1, explanation: "'intelligent' (dài) -> 'more intelligent'." },
          { prompt: "This book is ________ than the movie.", options: ["A. popularer", "B. more popular", "C. popular", "D. most popular"], answer: 1, explanation: "'popular' (dài) -> 'more popular'." }
        ]
      },
      "CMP_IRR": {
        label: "So sánh hơn — Bất quy tắc",
        rule: "Một số tính từ có dạng so sánh bất quy tắc phải học thuộc: good -> better, bad -> worse, far -> farther/further.",
        mnemonic: "Good thành better, bad thành worse. Thuộc lòng là qua môn!",
        category: "comparatives",
        questions: [
          { prompt: "The weather today is ________ than yesterday.", options: ["A. gooder", "B. better", "C. more good", "D. good"], answer: 1, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "This movie is ________ than the one we saw last week.", options: ["A. badder", "B. worse", "C. more bad", "D. bad"], answer: 1, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "His house is ________ from the city center than mine.", options: ["A. farer", "B. farther", "C. more far", "D. far"], answer: 1, explanation: "So sánh hơn của 'far' là 'farther' hoặc 'further'." },
          { prompt: "She sings ________ than anyone else in the choir.", options: ["A. weller", "B. better", "C. more well", "D. well"], answer: 1, explanation: "Trạng từ 'well' có so sánh hơn là 'better'." },
          { prompt: "I feel ________ today than I did yesterday.", options: ["A. badder", "B. worse", "C. more bad", "D. bad"], answer: 1, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "My test results are ________ than my sister's.", options: ["A. better", "B. gooder", "C. more good", "D. well"], answer: 0, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "The traffic is ________ in the evening than in the morning.", options: ["A. worse", "B. badder", "C. more bad", "D. bad"], answer: 0, explanation: "So sánh hơn của 'bad' là 'worse'." },
          { prompt: "We need to go ________ into the forest.", options: ["A. further", "B. farer", "C. more far", "D. far"], answer: 0, explanation: "So sánh hơn của 'far' là 'further'." },
          { prompt: "This pizza tastes ________ than the other one.", options: ["A. gooder", "B. better", "C. more good", "D. best"], answer: 1, explanation: "So sánh hơn của 'good' là 'better'." },
          { prompt: "The situation got ________ before it got better.", options: ["A. worse", "B. badder", "C. more bad", "D. bad"], answer: 0, explanation: "So sánh hơn của 'bad' là 'worse'." }
        ]
      }
    };
    const grammarTestDecks = {
      "present-simple": {
        id: "present-simple",
        title: "Present Simple Practice (Thì Hiện tại đơn)",
        duration: 15 * 60,
        questions: [
          {
            type: "Present Simple",
            prompt: "Choose the best answer: My brother usually ______ football with his friends every Sunday afternoon.",
            options: ["A. play", "B. plays", "C. played", "D. playing"],
            answer: 1,
            explanation: "Chủ ngữ 'My brother' (ngôi thứ 3 số ít) + dấu hiệu 'usually / every Sunday' -> thì Hiện tại đơn: Verb + s/es (plays)."
          },
          {
            type: "Present Simple (Negative)",
            prompt: "Choose the best answer: He ______ like spicy food, so he never orders chili chicken.",
            options: ["A. don't", "B. doesn't", "C. didn't", "D. isn't"],
            answer: 1,
            explanation: "Thì Hiện tại đơn dạng phủ định với chủ ngữ 'He': He + doesn't + V (nguyên mẫu)."
          },
          {
            type: "Present Simple (Question)",
            prompt: "Choose the correct auxiliary verb: '______ your parents live in Da Nang?' - 'No, they live in Hue.'",
            options: ["A. Do", "B. Does", "C. Are", "D. Is"],
            answer: 0,
            explanation: "Chủ ngữ 'your parents' là danh từ số nhiều -> dùng trợ động từ 'Do': Do + S + V?"
          },
          {
            type: "Present Simple (Spelling Rules)",
            prompt: "Complete the sentence with the correct form of 'STUDY': Linda ______ English at the library every afternoon.",
            textAnswer: "studies",
            accepted: ["studies"],
            explanation: "Động từ kết thúc bằng phụ âm + 'y' (study) khi chia với ngôi thứ 3 số ít chuyển thành '-ies' (studies)."
          },
          {
            type: "Present Simple (Adverb of Frequency)",
            prompt: "Which sentence has the correct word order?",
            options: [
              "A. She always is on time for class.",
              "B. She is always on time for class.",
              "C. Always she is on time for class.",
              "D. She is on time always for class."
            ],
            answer: 1,
            explanation: "Trạng từ chỉ tần suất (always, usually, often...) đứng SAU động từ 'to be' và TRƯỚC động từ thường."
          },
          {
            type: "Present Simple (Facts)",
            prompt: "Choose the best answer: The Sun ______ in the East and sets in the West.",
            options: ["A. rise", "B. rises", "C. rose", "D. is rising"],
            answer: 1,
            explanation: "Diễn tả một chân lý, sự thật hiển nhiên -> dùng thì Hiện tại đơn: The Sun rises."
          },
          {
            type: "Present Simple (Have/Has)",
            prompt: "Choose the best answer: Our school ______ a large swimming pool and a modern computer lab.",
            options: ["A. have", "B. has", "C. is having", "D. had"],
            answer: 1,
            explanation: "Chủ ngữ 'Our school' là danh từ số ít -> dùng 'has'."
          },
          {
            type: "Present Simple (Error Identification)",
            prompt: "Find the error in the sentence: 'Nam and Ba doesn't walk to school every day.'",
            options: ["A. Nam and Ba", "B. doesn't", "C. walk", "D. every day"],
            answer: 1,
            explanation: "Chủ ngữ 'Nam and Ba' là 2 người (số nhiều) nên phải dùng 'don't', không dùng 'doesn't'."
          }
        ]
      },
      "past-simple": {
        id: "past-simple",
        title: "Past Simple Practice (Thì Quá khứ đơn)",
        duration: 15 * 60,
        questions: [
          {
            type: "Past Simple (Regular)",
            prompt: "Choose the best answer: Yesterday, we ______ a very interesting documentary about endangered animals.",
            options: ["A. watch", "B. watches", "C. watched", "D. are watching"],
            answer: 2,
            explanation: "Dấu hiệu 'Yesterday' chỉ thời gian trong quá khứ -> Động từ có quy tắc thêm -ed: watched."
          },
          {
            type: "Past Simple (Irregular)",
            prompt: "Complete the sentence with the past form of 'BUY': My mother ______ a new bicycle for my birthday last week.",
            textAnswer: "bought",
            accepted: ["bought"],
            explanation: "Quá khứ bất quy tắc của 'buy' là 'bought'."
          },
          {
            type: "Past Simple (Negative)",
            prompt: "Choose the best answer: We ______ to the museum last Sunday because it was closed for repairs.",
            options: ["A. didn't go", "B. didn't went", "C. don't go", "D. not go"],
            answer: 0,
            explanation: "Cấu trúc phủ định thì Quá khứ đơn: S + didn't + V (nguyên mẫu) -> didn't go."
          },
          {
            type: "Past Simple (Question)",
            prompt: "Choose the best answer: '______ you meet Lan at the party two days ago?' - 'Yes, I did.'",
            options: ["A. Do", "B. Did", "C. Were", "D. Have"],
            answer: 1,
            explanation: "Câu hỏi quá khứ đơn với động từ thường: Did + S + V (nguyên mẫu)?"
          },
          {
            type: "Past Simple (To be)",
            prompt: "Choose the best answer: The weather ______ wonderful during our trip to Da Lat last month.",
            options: ["A. was", "B. were", "C. is", "D. are"],
            answer: 0,
            explanation: "Chủ ngữ 'The weather' (danh từ không đếm được) đi với 'was' trong quá khứ."
          },
          {
            type: "Past Simple (Time expression)",
            prompt: "Choose the correct past time signal: I graduated from primary school three years ______.",
            options: ["A. ago", "B. before", "C. last", "D. yesterday"],
            answer: 0,
            explanation: "Cụm 'khoảng thời gian + ago' là dấu hiệu đặc trưng của thì Quá khứ đơn."
          },
          {
            type: "Past Simple (Pronunciation -ed)",
            prompt: "Which word has the '-ed' ending pronounced as /ɪd/?",
            options: ["A. played", "B. visited", "C. stopped", "D. watched"],
            answer: 1,
            explanation: "Đuôi -ed phát âm là /ɪd/ khi động từ kết thúc bằng âm /t/ hoặc /d/ (visit -> visited /vɪzɪtɪd/)."
          },
          {
            type: "Past Simple (Irregular)",
            prompt: "Complete the sentence with the past form of 'SEE': We ______ an ancient pagoda when we were in Ninh Binh.",
            textAnswer: "saw",
            accepted: ["saw"],
            explanation: "Dạng quá khứ bất quy tắc của động từ 'see' là 'saw'."
          }
        ]
      },
      "present-vs-past": {
        id: "present-vs-past",
        title: "Present Simple vs. Past Simple Mix (Tổng hợp 2 thì)",
        duration: 20 * 60,
        questions: [
          {
            type: "Present vs Past",
            prompt: "Choose the correct pair of verbs: She usually ______ up early, but yesterday she ______ late because of a headache.",
            options: ["A. wakes / got up", "B. wake / get up", "C. woke / gets up", "D. wakes / gets up"],
            answer: 0,
            explanation: "Vế 1 diễn tả thói quen 'usually' dùng Hiện tại đơn (wakes); vế 2 có 'yesterday' dùng Quá khứ đơn (got up)."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the best answer: 'Where is Peter?' - 'He ______ in the garden now, but this morning he ______ at the library.'",
            options: ["A. is / was", "B. was / is", "C. is / is", "D. was / was"],
            answer: 0,
            explanation: "Vế 1 có 'now' dùng hiện tại (is); vế 2 có 'this morning' đã qua dùng quá khứ (was)."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the best answer: Minh ______ hard every day because he wants to pass the final exam with high scores.",
            options: ["A. study", "B. studies", "C. studied", "D. studying"],
            answer: 1,
            explanation: "Dấu hiệu 'every day' chỉ thói quen hàng ngày -> thì Hiện tại đơn: Minh studies."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the best answer: Last night, I ______ my keys, but fortunately my brother ______ them this morning.",
            options: ["A. lost / found", "B. lose / find", "C. lose / found", "D. lost / finds"],
            answer: 0,
            explanation: "Cả hai hành động đều đã hoàn thành trong quá khứ -> dùng thì Quá khứ đơn: lost / found."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the best answer: We rarely ______ fast food, but last weekend we ______ pizza at a restaurant.",
            options: ["A. eat / ate", "B. ate / eat", "C. eats / ate", "D. eating / eat"],
            answer: 0,
            explanation: "Vế 1 'rarely' diễn tả thói quen (Hiện tại đơn: eat); vế 2 'last weekend' dùng Quá khứ đơn (ate)."
          },
          {
            type: "Present vs Past",
            prompt: "Complete the sentence with the correct form of 'NOT GO': Phong ______ to school yesterday because he was sick.",
            textAnswer: "didn't go",
            accepted: ["didn't go", "did not go"],
            explanation: "Dấu hiệu 'yesterday' dùng phủ định quá khứ đơn: didn't go."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the correct sentence:",
            options: [
              "A. Did you went to the cinema last night?",
              "B. Did you go to the cinema last night?",
              "C. Do you went to the cinema last night?",
              "D. Are you go to the cinema last night?"
            ],
            answer: 1,
            explanation: "Sau trợ động từ 'Did', động từ chính luôn ở dạng nguyên mẫu không 'to' (go)."
          },
          {
            type: "Present vs Past",
            prompt: "Choose the best answer: Water ______ at 100 degrees Celsius.",
            options: ["A. boil", "B. boils", "C. boiled", "D. is boiling"],
            answer: 1,
            explanation: "Sự thật khoa học hiển nhiên luôn dùng thì Hiện tại đơn: Water boils."
          }
        ]
      },
      "comparatives": {
        id: "comparatives",
        title: "Comparatives & Superlatives (So sánh hơn & So sánh nhất)",
        duration: 15 * 60,
        questions: [
          {
            type: "Comparatives (Short adj)",
            prompt: "Choose the best answer: Mount Everest is ______ than Mount Fuji.",
            options: ["A. higher", "B. highest", "C. more high", "D. as high"],
            answer: 0,
            explanation: "Tính từ ngắn 'high' khi so sánh hơn thêm đuôi '-er' + than: higher than."
          },
          {
            type: "Comparatives (Long adj)",
            prompt: "Choose the best answer: Travelling by plane is ______ than travelling by bus.",
            options: ["A. more expensive", "B. expensiver", "C. most expensive", "D. as expensive"],
            answer: 0,
            explanation: "Tính từ dài 'expensive' (3 âm tiết) khi so sánh hơn dùng 'more + adj + than': more expensive than."
          },
          {
            type: "Superlatives (Short adj)",
            prompt: "Choose the best answer: Russia is the ______ country in the world.",
            options: ["A. large", "B. larger", "C. largest", "D. most large"],
            answer: 2,
            explanation: "So sánh nhất với tính từ ngắn 'large' dùng 'the + adj-est': the largest."
          },
          {
            type: "Irregular Comparison",
            prompt: "Complete the sentence with the comparative form of 'GOOD': Practicing speaking every day is ______ than just reading books.",
            textAnswer: "better",
            accepted: ["better"],
            explanation: "Dạng so sánh hơn bất quy tắc của 'good' là 'better'."
          },
          {
            type: "Superlatives (Long adj)",
            prompt: "Choose the best answer: Ha Long Bay is one of the ______ natural wonders in Vietnam.",
            options: ["A. most beautiful", "B. more beautiful", "C. beautifulest", "D. as beautiful"],
            answer: 0,
            explanation: "So sánh nhất với tính từ dài 'beautiful' dùng 'the most + adj': most beautiful."
          },
          {
            type: "Irregular Comparison",
            prompt: "Choose the best answer: His health is getting ______ because he doesn't exercise regularly. (BAD)",
            options: ["A. badder", "B. worse", "C. worst", "D. more bad"],
            answer: 1,
            explanation: "Dạng so sánh hơn bất quy tắc của 'bad' là 'worse'."
          },
          {
            type: "Comparatives (-y ending)",
            prompt: "Complete the sentence with the comparative form of 'HAPPY': Children are usually ______ on weekends than on school days.",
            textAnswer: "happier",
            accepted: ["happier"],
            explanation: "Tính từ 2 âm tiết tận cùng bằng '-y' đổi thành '-ier': happy -> happier."
          },
          {
            type: "Superlatives (Irregular)",
            prompt: "Choose the best answer: Who is the ______ student in your class?",
            options: ["A. goodest", "B. best", "C. better", "D. most good"],
            answer: 1,
            explanation: "Dạng so sánh nhất bất quy tắc của 'good' là 'the best'."
          }
        ]
      }
    };

    const defaultQuestions = grammarTestDecks["present-simple"].questions;
    let questions = defaultQuestions;
    let activeImportedTest = null;

    let currentQuestion=0;
    let answers=JSON.parse(localStorage.getItem("engoAnswers")||localStorage.getItem("global9Answers")||"{}");
    let checked={};
    let secondsLeft=20*60;
    let timerInterval=null;
    let attempts=Number(localStorage.getItem("engoAttempts")||localStorage.getItem("global9Attempts")||"0");

    const questionContent=document.getElementById("questionContent");
    const answerArea=document.getElementById("answerArea");
    const explanationBox=document.getElementById("explanationBox");
    const questionCounter=document.getElementById("questionCounter");
    const questionType=document.getElementById("questionType");
    const questionGrid=document.getElementById("questionGrid");
    const quizProgress=document.getElementById("quizProgress");
    const timer=document.getElementById("timer");

    function saveAnswers(){
      localStorage.setItem("engoAnswers",JSON.stringify(answers));
      const status=document.getElementById("saveStatus");
      status.textContent="Đang lưu...";
      setTimeout(()=>status.textContent="Đã tự lưu",350);
    }

    function normalizeText(v){
      return (v||"").trim().toLowerCase().replace(/\s+/g," ");
    }

    function renderQuestion(){
      const q=questions[currentQuestion];
      questionCounter.textContent=`Câu ${q.number||currentQuestion+1} / ${questions.length}`;
      questionType.textContent=q.type;
      explanationBox.classList.add("hidden");
      explanationBox.innerHTML="";
      let content="";
      if(q.passage) content+=`<div class="reading-passage">${q.passage}</div>`;
      content+=`<h4>${q.prompt}</h4>`;
      questionContent.innerHTML=content;

      if(q.options?.length){
        answerArea.innerHTML=`<div class="option-list">${q.options.map((opt,i)=>`
          <div class="option ${answers[currentQuestion]===i?"selected":""}" data-option="${i}">
            <span class="option-marker">${String.fromCharCode(65+i)}</span>
            <span>${opt.replace(/^[A-D]\.\s*/,"")}</span>
          </div>`).join("")}</div>`;
        answerArea.querySelectorAll(".option").forEach(el=>{
          el.addEventListener("click",()=>{
            answers[currentQuestion]=Number(el.dataset.option);
            saveAnswers();
            renderQuestion();
          });
        });
      }else{
        answerArea.innerHTML=`<textarea class="text-answer" placeholder="Nhập câu trả lời của em...">${answers[currentQuestion]||""}</textarea>`;
        answerArea.querySelector("textarea").addEventListener("input",e=>{
          answers[currentQuestion]=e.target.value;
          saveAnswers();
          renderQuestionGrid();
        });
      }

      if(checked[currentQuestion]) showExplanation();
      renderQuestionGrid();
      quizProgress.style.width=`${((currentQuestion+1)/questions.length)*100}%`;
      document.getElementById("prevQuestion").disabled=currentQuestion===0;
      document.getElementById("nextQuestion").textContent=currentQuestion===questions.length-1?"Hoàn tất":"Câu tiếp →";
    }

    function renderQuestionGrid(){
      questionGrid.innerHTML=questions.map((_,i)=>{
        const answered=answers[i]!==undefined && answers[i]!=="";
        return `<button class="q-btn ${i===currentQuestion?"active":answered?"answered":""}" data-q="${i}">${i+1}</button>`;
      }).join("");
      questionGrid.querySelectorAll(".q-btn").forEach(btn=>{
        btn.addEventListener("click",()=>{currentQuestion=Number(btn.dataset.q);renderQuestion()});
      });
    }

    function isCorrect(index){
      const q=questions[index];
      if(activeImportedTest||q.manual) return false;
      if(q.options?.length) return Number(answers[index])===q.answer;
      const value=normalizeText(answers[index]);
      if(q.accepted) return q.accepted.map(normalizeText).includes(value);
      return value===normalizeText(q.textAnswer);
    }

    function showExplanation(){
      const q=questions[currentQuestion];
      checked[currentQuestion]=true;
      explanationBox.classList.remove("hidden");
      if(activeImportedTest){
        explanationBox.innerHTML=q.manual?"<strong>Phần Writing sẽ được giáo viên chấm thủ công sau khi em nộp bài.</strong>":"<strong>Đáp án sẽ được công bố sau khi giáo viên hoàn tất phiên làm bài.</strong>";
        return;
      }
      const correct=isCorrect(currentQuestion);
      if(correct) {
        playSuccessSound();
      } else {
        playWrongSound();
      }
      explanationBox.innerHTML=`
        <div style="border-left:4px solid ${correct?"#16a34a":"#dc2626"};padding-left:12px;margin-top:6px">
          <strong style="color:${correct?"#166534":"#991b1b"};font-size:14px">${correct?"✓ Chính xác! Tuyệt vời":"✕ Chưa chính xác. Cùng xem phân tích nhé:"}</strong>
          <div style="margin-top:6px;font-size:13px;line-height:1.5">${q.explanation}</div>
          <div style="margin-top:8px;padding:8px 10px;background:${correct?"#f0fdf4":"#fef2f2"};border-radius:8px;font-size:12px">
            💡 <strong>Lời khuyên từ Capybara:</strong> ${correct ? "Bạn đã nắm chắc quy tắc ngữ pháp này!" : "Hãy chú ý dấu hiệu nhận biết thì trong câu để không bị nhầm lẫn nhé."}
          </div>
        </div>
      `;
      if(q.options?.length){
        answerArea.querySelectorAll(".option").forEach(el=>{
          const idx=Number(el.dataset.option);
          if(idx===q.answer) el.classList.add("correct");
          if(idx===answers[currentQuestion] && idx!==q.answer) el.classList.add("wrong");
        });
      }
    }

    function startQuiz(){
      switchView("quiz");
      startAntiCheatGuard();
      renderQuestion();
      document.getElementById("checkAnswer").disabled=Boolean(activeImportedTest);
      if(!timerInterval){
        timerInterval=setInterval(()=>{
          secondsLeft=Math.max(0,secondsLeft-1);
          const m=String(Math.floor(secondsLeft/60)).padStart(2,"0");
          const s=String(secondsLeft%60).padStart(2,"0");
          timer.textContent=`${m}:${s}`;
          if(secondsLeft===0){clearInterval(timerInterval);timerInterval=null;submitQuiz()}
        },1000);
      }
    }

    function startGrammarTest(deckKey){
      const deck = grammarTestDecks[deckKey] || grammarTestDecks["present-simple"];
      activeImportedTest = null;
      questions = deck.questions;
      answers = {};
      checked = {};
      currentQuestion = 0;
      secondsLeft = deck.duration || (15 * 60);
      const heading = document.querySelector("#quiz .page-heading h2");
      if(heading) heading.textContent = deck.title;
      startQuiz();
    }

    function startDefaultQuiz(){
      startGrammarTest("present-simple");
    }

    document.querySelectorAll(".start-quiz").forEach(btn=>btn.addEventListener("click",startDefaultQuiz));
    document.querySelectorAll("[data-grammar-test]").forEach(btn=>{
      btn.addEventListener("click",e=>{
        e.stopPropagation();
        const testKey=btn.dataset.grammarTest;
        startGrammarTest(testKey);
      });
    });

    document.getElementById("prevQuestion").addEventListener("click",()=>{if(currentQuestion>0){currentQuestion--;renderQuestion()}});
    document.getElementById("nextQuestion").addEventListener("click",()=>{
      if(currentQuestion<questions.length-1){currentQuestion++;renderQuestion()} else submitQuiz();
    });
    document.getElementById("checkAnswer").addEventListener("click",showExplanation);
    document.getElementById("submitQuiz").addEventListener("click",submitQuiz);
    document.getElementById("exitQuiz").addEventListener("click",()=>{stopAntiCheatGuard();switchView("student-home")});

    function applyResultScoreUI(scoreVal, isPendingManual = false){
      const ring = document.getElementById("resultScoreRing");
      const verdictEl = document.getElementById("resultVerdict");
      const feedbackEl = document.getElementById("resultFeedback");
      const scoreNum = Number(scoreVal) || 0;
      const percent = Math.min(100, Math.max(0, Math.round((scoreNum / 10) * 100)));

      // Vòng tròn tính điểm: >= 6 là màu xanh, < 6 là màu đỏ
      const isPassGreen = scoreNum >= 6;
      const ringColor = isPassGreen ? "#22c55e" : "#ef4444";

      if (ring) {
        ring.style.background = `conic-gradient(${ringColor} 0 ${percent}%, #e5e7eb ${percent}% 100%)`;
      }

      // Nhận xét theo các mức điểm
      if (verdictEl && feedbackEl) {
        if (scoreNum < 5) {
          verdictEl.textContent = "Chưa tốt!";
          verdictEl.style.color = "#dc2626";
          feedbackEl.textContent = isPendingManual
            ? "Điểm phần trắc nghiệm dưới 5 (chưa tốt). Hãy đợi giáo viên chấm thêm phần Writing và ôn tập lại kiến thức."
            : "Kết quả bài làm dưới 5 điểm (chưa tốt). Bạn cần xem lại lời giải chi tiết và ôn tập thêm kiến thức nhé.";
        } else if (scoreNum < 6) {
          verdictEl.textContent = "Cần cố gắng thêm!";
          verdictEl.style.color = "#d97706";
          feedbackEl.textContent = isPendingManual
            ? "Điểm trắc nghiệm đạt mức trung bình. Hãy chờ điểm Writing từ giáo viên nhé."
            : "Kết quả bài làm ở mức trung bình. Hãy ôn tập lại các câu chưa đúng để nâng điểm lên trên 6 nhé.";
        } else {
          verdictEl.textContent = "Hoàn thành tốt!";
          verdictEl.style.color = "#16a34a";
          feedbackEl.textContent = isPendingManual
            ? "Phần trắc nghiệm làm rất tốt! Điểm tổng kết sẽ được cập nhật sau khi giáo viên chấm xong Writing."
            : "Chúc mừng bạn đã đạt kết quả tốt! Tiếp tục phát huy ở các bài thi tiếp theo nhé.";
        }
      }
    }

    function getViolationPenalty(violations) {
      if (!violations || violations <= 0) return 0;
      if (violations === 1) return 0.50;
      if (violations === 2) return 1.25; // 0.50 + 0.75
      return 2.25; // 0.50 + 0.75 + 1.00
    }

    async function submitQuiz(){
      stopAntiCheatGuard();
      const penalty = getViolationPenalty(examTabSwitches);
      const forced = examTabSwitches >= 3;

      if(activeImportedTest){
        const payload=Object.fromEntries(questions.map((question,index)=>[question.id,question.options?.length&&answers[index]!==undefined?String.fromCharCode(65+Number(answers[index])):(answers[index]??"")]));
        try{
          const result=await apiRequest(`/api/tests/${activeImportedTest.id}/submissions`,{
            method:"POST",
            body:JSON.stringify({
              answers:payload,
              tabViolations: examTabSwitches,
              violationPenalty: penalty,
              isForcedSubmit: forced
            })
          });
          const scoreOnTen=result.objectiveMax?Number(result.objectiveScore/result.objectiveMax*10).toFixed(1):"0.0";
          document.getElementById("finalScore").textContent=result.status==="pending_manual"?`${scoreOnTen}*`:scoreOnTen;
          document.getElementById("correctCount").textContent=`${Number(result.objectiveScore).toFixed(2)}/${Number(result.objectiveMax).toFixed(2)}`;
          document.getElementById("wrongCount").textContent=result.status==="pending_manual"?"Writing chờ chấm":"Đã nộp";
          document.getElementById("attemptCount").textContent=examTabSwitches > 0 ? `${examTabSwitches} vi phạm (-${penalty}đ)` : "Nghiêm túc (0 vi phạm)";
          applyResultScoreUI(Number(scoreOnTen), result.status==="pending_manual");
          // Ghi nhận các câu trắc nghiệm sai vào Phòng Chữa Lỗi
          questions.forEach((q, i) => {
            if (q.options?.length && !isCorrect(i)) {
              const selectedText = answers[i] !== undefined ? q.options[answers[i]] : "Chưa chọn";
              const correctText = q.answer !== undefined ? q.options[q.answer] : "";
              recordErrorForHealing(q.prompt, selectedText, correctText, q.type || q.section);
            }
          });
          document.getElementById("resultModal").classList.remove("hidden");
          showToast(result.message);
          return;
        }catch(error){showToast(error.message);return}
      }
      const correct=questions.reduce((sum,_,i)=>sum+(isCorrect(i)?1:0),0);
      const rawScore=(correct/questions.length*10);
      const netScore=Math.max(0, Number((rawScore - penalty).toFixed(1)));
      attempts++;
      localStorage.setItem("engoAttempts",String(attempts));
      saveLearningStats(correct,netScore);
      completeDailyPlanTask("quiz");
      document.getElementById("finalScore").textContent=netScore.toFixed(1);
      document.getElementById("correctCount").textContent=correct;
      document.getElementById("wrongCount").textContent=questions.length-correct;
      document.getElementById("attemptCount").textContent=examTabSwitches > 0 ? `${examTabSwitches} vi phạm (-${penalty}đ)` : attempts;
      applyResultScoreUI(netScore, false);
      // Ghi nhận các câu sai vào Phòng Chữa Lỗi
      questions.forEach((q, i) => {
        if (!isCorrect(i)) {
          const selectedText = q.options && answers[i] !== undefined ? q.options[answers[i]] : (answers[i] || "Chưa chọn");
          const correctText = q.options && q.answer !== undefined ? q.options[q.answer] : (q.textAnswer || q.answer || "");
          recordErrorForHealing(q.prompt, selectedText, correctText, q.type);
        }
      });

      document.getElementById("resultModal").classList.remove("hidden");
      if(penalty > 0){
        showToast(`Đã nộp bài. Bị trừ ${penalty}đ do có ${examTabSwitches} lần rời tab thi!`);
      }
    }

    document.getElementById("gotoHealingRoomBtn")?.addEventListener("click", () => {
      document.getElementById("resultModal")?.classList.add("hidden");
      switchView("errorHealing");
    });

    document.getElementById("retryQuiz").addEventListener("click",()=>{
      answers={};checked={};currentQuestion=0;secondsLeft=20*60;
      localStorage.removeItem("engoAnswers");
      localStorage.removeItem("global9Answers");
      document.getElementById("resultModal").classList.add("hidden");
      renderQuestion();
      showToast("Đã tạo lượt làm mới");
    });

    document.querySelectorAll(".modal-close").forEach(btn=>btn.addEventListener("click",()=>{
      document.getElementById("resultModal").classList.add("hidden");
      switchView("student-home");
    }));

    // QR modal
    const qrGrid=document.getElementById("qrGrid");
    function buildFakeQR(){
      qrGrid.innerHTML="";
      const pattern=(r,c)=>{
        const finder=(rr,cc)=>(
          (r>=rr&&r<rr+7&&c>=cc&&c<cc+7) &&
          (r===rr||r===rr+6||c===cc||c===cc+6 || (r>=rr+2&&r<=rr+4&&c>=cc+2&&c<=cc+4))
        );
        if(finder(0,0)||finder(0,14)||finder(14,0)) return true;
        return ((r*7+c*11+r*c)%5===0)||((r+c)%7===0);
      };
      for(let r=0;r<21;r++) for(let c=0;c<21;c++){
        const cell=document.createElement("span");
        if(pattern(r,c)) cell.className="qr-cell on"; else cell.className="qr-cell";
        qrGrid.appendChild(cell);
      }
    }
    buildFakeQR();
    document.querySelectorAll(".qr-open").forEach(btn=>btn.addEventListener("click",()=>document.getElementById("qrModal").classList.remove("hidden")));
    document.querySelectorAll(".qr-close").forEach(btn=>btn.addEventListener("click",()=>document.getElementById("qrModal").classList.add("hidden")));
    document.getElementById("copyLink").addEventListener("click",async()=>{
      const value=document.getElementById("shareLink").value;
      try{await navigator.clipboard.writeText(value);showToast("Đã sao chép đường link")}
      catch{showToast("Hãy sao chép đường link thủ công")}
    });

    async function fileToDataUrl(file){
      return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Không thể đọc file DOCX."));reader.readAsDataURL(file)});
    }

    async function importDocxTest(file, className = "", title = ""){
      const dataUrl=await fileToDataUrl(file);
      return apiRequest("/api/tests/import-docx",{
        method:"POST",
        body:JSON.stringify({
          documentBase64:dataUrl,
          fileName:file.name,
          title:title || file.name.replace(/\.docx$/i,""),
          className:className || null
        })
      });
    }

    async function renderImportedTests(){
      const list=document.getElementById("importedTestList");if(!list||!currentUser||currentUser.role!=="student") return;
      try{
        const data=await apiRequest("/api/tests/latest");
        if(!data.tests.length){list.innerHTML='<p class="small muted">Chưa có bài kiểm tra DOCX nào được giao cho lớp của bạn.</p>';return}
        list.innerHTML=data.tests.map(test=>{
          const classTag = test.className ? `<span class="badge blue">Lớp ${escapeHTML(test.className)}</span>` : '<span class="badge">Toàn khối</span>';
          return `<article class="imported-test-item"><div><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h4>${escapeHTML(test.title)}</h4> ${classTag}</div><p>${test.summary.objectiveCount} câu chấm tự động · ${test.summary.manualCount} câu Writing chấm thủ công · Tổng ${test.summary.totalPoints} điểm</p><div class="test-section-pills">${test.sections.map(section=>`<span>${escapeHTML(section.name)} (${section.questions.length})</span>`).join("")}</div></div><button class="btn btn-primary btn-sm" data-imported-test="${test.id}">Làm bài</button></article>`;
        }).join("");
        list.querySelectorAll("[data-imported-test]").forEach(button=>button.addEventListener("click",()=>startImportedTest(button.dataset.importedTest)));
      }catch(error){list.innerHTML=`<p class="small muted">${escapeHTML(error.message)}</p>`}
    }

    async function startImportedTest(testId){
      try{
        const data=await apiRequest(`/api/tests/${testId}`);activeImportedTest=data.test;
        questions=data.test.sections.flatMap(section=>section.questions).map(question=>({...question,type:question.section,passage:question.context||"",options:question.options?.map(option=>`${option.key}. ${option.text}`)||[]}));
        answers={};checked={};currentQuestion=0;secondsLeft=45*60;
        document.querySelector("#quiz .page-heading h2").textContent=data.test.title;
        startQuiz();
      }catch(error){showToast(error.message)}
    }

    let teacherSubmissionsCache = [];

    async function renderTeacherResults(){
      const tbody=document.getElementById("teacherResultsTableBody");
      if(!tbody||!currentUser||currentUser.role!=="teacher") return;
      const classFilter=document.getElementById("teacherClassFilter")?.value || "";
      const testFilter=document.getElementById("teacherTestFilter")?.value || "";

      try{
        const params = new URLSearchParams();
        if(classFilter) params.append("className", classFilter);
        if(testFilter) params.append("testId", testFilter);

        const data=await apiRequest(`/api/teacher/results?${params.toString()}`);
        teacherSubmissionsCache = data.submissions || [];

        if(!teacherSubmissionsCache.length){
          tbody.innerHTML='<tr><td colspan="10" class="empty-state" style="text-align:center;padding:24px">Chưa có kết quả nộp bài nào theo điều kiện lọc.</td></tr>';
          return;
        }

        tbody.innerHTML=teacherSubmissionsCache.map((item, idx)=>{
          const dateStr = item.submittedAt ? new Date(item.submittedAt).toLocaleString("vi-VN") : "—";
          const isPending = item.status === "pending_manual";
          const statusBadge = isPending 
            ? '<span class="badge orange">Chờ chấm Writing</span>' 
            : '<span class="badge green">Đã hoàn thành</span>';
          
          const writingBtn = item.manualScore !== null 
            ? `<button class="btn btn-sm grade-writing-click" data-submission-id="${item.id}" title="Bấm để xem/sửa điểm Writing" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;border-radius:8px;font-weight:700;cursor:pointer;padding:3px 9px">✏️ ${Number(item.manualScore).toFixed(2)} đ</button>`
            : `<button class="btn btn-sm grade-writing-click" data-submission-id="${item.id}" title="Bấm để chấm Writing ngay" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;border-radius:8px;font-weight:700;cursor:pointer;padding:3px 9px">✍️ Chờ chấm</button>`;

          const score10 = Number(item.scoreOnTen);
          const scoreClass = score10 >= 8 ? "high" : score10 >= 5 ? "mid" : "low";

          let antiCheatBadge = '<span class="badge green" style="background:#ecfdf5;color:#059669;font-weight:700">✓ Nghiêm túc</span>';
          const tabV = Number(item.tabViolations || 0);
          if (item.isForcedSubmit || tabV >= 3) {
            antiCheatBadge = '<span class="badge red" style="background:#fef2f2;color:#dc2626;font-weight:800" title="Bị hệ thống tự động thu bài do rời tab 3 lần">⛔ Bị thu bài (3 lần -2.25đ)</span>';
          } else if (tabV === 2) {
            antiCheatBadge = '<span class="badge orange" style="background:#fff1f2;color:#e11d48;font-weight:800">⚠️ 2 lần rời tab (-1.25đ)</span>';
          } else if (tabV === 1) {
            antiCheatBadge = '<span class="badge orange" style="background:#fffbeb;color:#d97706;font-weight:700">⚠️ 1 lần rời tab (-0.5đ)</span>';
          }

          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${escapeHTML(item.studentName)}</strong><br><span class="small muted">${escapeHTML(item.studentEmail)}</span></td>
              <td><span class="badge ${item.studentClass !== 'Chưa phân lớp' ? 'blue' : ''}">${escapeHTML(item.studentClass)}</span></td>
              <td><strong>${escapeHTML(item.testTitle)}</strong></td>
              <td>${Number(item.objectiveScore).toFixed(2)}</td>
              <td>${writingBtn}</td>
              <td><strong class="total-score-badge ${scoreClass}">${item.scoreOnTen} / 10</strong></td>
              <td>${antiCheatBadge}</td>
              <td>${statusBadge}</td>
              <td><span class="small">${escapeHTML(dateStr)}</span></td>
              <td>
                <div style="display:flex;gap:4px;align-items:center">
                  <button class="btn btn-light btn-sm view-submission-btn" data-submission-id="${item.id}">Chi tiết</button>
                  <button class="btn btn-light btn-sm delete-sub-btn" data-sub-id="${item.id}" title="Xóa bài nộp này" style="color:#ef4444;padding:4px 7px">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join("");

        tbody.querySelectorAll(".view-submission-btn, .grade-writing-click").forEach(btn=>{
          btn.addEventListener("click",()=>{
            const sub = teacherSubmissionsCache.find(s=>s.id == btn.dataset.submissionId);
            if(sub) openSubmissionDetail(sub);
          });
        });

        tbody.querySelectorAll(".delete-sub-btn").forEach(btn=>{
          btn.addEventListener("click", async ()=>{
            const subId = btn.dataset.subId;
            const sub = teacherSubmissionsCache.find(s=>s.id == subId);
            const studentName = sub ? sub.studentName : "học sinh này";
            if(!confirm(`Bạn có chắc chắn muốn xóa bài nộp của ${studentName}?`)) return;

            try {
              const res = await apiRequest(`/api/teacher/submissions/${subId}`, { method: "DELETE" });
              showToast(res.message || "Đã xóa bài nộp thành công.");
              renderTeacherResults();
              renderTeacherStats();
            } catch(err) {
              showToast(err.message);
            }
          });
        });

      }catch(error){
        tbody.innerHTML=`<tr><td colspan="10" class="empty-state" style="color:red;padding:20px">${escapeHTML(error.message)}</td></tr>`;
      }
    }

    async function renderTeacherStats(){
      if(!currentUser||currentUser.role!=="teacher") return;
      try{
        const data=await apiRequest("/api/teacher/results/stats");
        const stats=data.stats || {};

        const elStudents=document.getElementById("teacherStatStudents");
        const elSubmissions=document.getElementById("teacherStatSubmissions");
        const elTests=document.getElementById("teacherStatTests");
        const elSumSub=document.getElementById("sumTotalSubmissions");
        const elSumAvg=document.getElementById("sumAvgScore");
        const elSumPending=document.getElementById("sumPendingGrading");

        if(elStudents) elStudents.textContent = stats.totalStudents || 0;
        if(elSubmissions) elSubmissions.textContent = stats.totalSubmissions || 0;
        if(elTests) elTests.textContent = stats.totalTests || 0;
        if(elSumSub) elSumSub.textContent = stats.totalSubmissions || 0;
        if(elSumAvg) elSumAvg.textContent = stats.avgScoreOverall ? `${stats.avgScoreOverall}/10` : "--";
        if(elSumPending) elSumPending.textContent = stats.pendingGrading || 0;

        // Biểu đồ theo lớp
        const chart=document.getElementById("teacherClassChart");
        if(chart && stats.classSummary){
          const maxAvg = 10;
          chart.innerHTML = stats.classSummary.map(c=>{
            const percent = Math.min(100, Math.round((c.avgScore / maxAvg) * 100));
            const displayVal = c.submissions > 0 ? `${c.avgScore}đ (${c.submissions} bài)` : "0 bài";
            return `
              <div class="bar-wrap">
                <div class="bar" data-value="${escapeHTML(displayVal)}" style="height:${Math.max(12, percent)}%"></div>
                ${escapeHTML(c.className)}
              </div>
            `;
          }).join("");
        }
      }catch(err){
        console.error("Lỗi cập nhật thống kê giáo viên:", err);
      }
    }

    async function renderTeacherRecentTests(){
      const tbody=document.getElementById("teacherRecentTestsBody");
      const filter=document.getElementById("teacherTestFilter");
      if(!tbody||!currentUser||currentUser.role!=="teacher") return;

      try{
        const data=await apiRequest("/api/tests/latest");
        const tests=data.tests || [];

        if(filter){
          const currentVal = filter.value;
          filter.innerHTML = '<option value="">Tất cả bài kiểm tra</option>' + 
            tests.map(t=>`<option value="${t.id}" ${t.id == currentVal ? 'selected' : ''}>${escapeHTML(t.title)}</option>`).join("");
        }

        if(!tests.length){
          tbody.innerHTML='<tr><td colspan="5" class="small muted" style="text-align:center">Chưa có bài kiểm tra nào.</td></tr>';
          return;
        }

        tbody.innerHTML=tests.map(t=>{
          const totalQ = (t.summary?.objectiveCount || 0) + (t.summary?.manualCount || 0);
          const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "—";
          const classTag = t.className ? `<span class="badge blue">Lớp ${escapeHTML(t.className)}</span>` : '<span class="badge">Tất cả lớp</span>';
          return `
            <tr>
              <td><strong>${escapeHTML(t.title)}</strong></td>
              <td>${classTag}</td>
              <td>${totalQ} câu</td>
              <td><span class="small muted">${escapeHTML(dateStr)}</span></td>
              <td>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="btn btn-light btn-sm qr-open">Mã QR</button>
                  <button class="btn btn-light btn-sm delete-test-btn" data-test-id="${t.id}" title="Xóa đề thi này" style="color:#ef4444;padding:4px 8px">🗑️ Xóa</button>
                </div>
              </td>
            </tr>
          `;
        }).join("");

        tbody.querySelectorAll(".delete-test-btn").forEach(btn=>{
          btn.addEventListener("click", async ()=>{
            const testId = btn.dataset.testId;
            const testObj = tests.find(t=>t.id == testId);
            const title = testObj ? testObj.title : "bài kiểm tra này";
            if(!confirm(`Bạn có chắc chắn muốn xóa bài kiểm tra "${title}"? Tất cả bài làm liên quan của học sinh cũng sẽ bị xóa.`)) return;

            try {
              const res = await apiRequest(`/api/tests/${testId}`, { method: "DELETE" });
              showToast(res.message || "Đã xóa bài kiểm tra thành công.");
              renderTeacherRecentTests();
              renderTeacherResults();
              renderTeacherStats();
            } catch(err) {
              showToast(err.message);
            }
          });
        });

      }catch(err){
        tbody.innerHTML=`<tr><td colspan="5" class="small muted">${escapeHTML(err.message)}</td></tr>`;
      }
    }

    function openSubmissionDetail(sub){
      const modal = document.getElementById("submissionDetailModal");
      const title = document.getElementById("submissionDetailTitle");
      const subtitle = document.getElementById("submissionDetailSubtitle");
      const body = document.getElementById("submissionDetailBody");

      if(!modal || !body) return;

      const isTeacher = currentUser && currentUser.role === "teacher";

      const updateHeaderInfo = () => {
        title.textContent = isTeacher 
          ? `Bài làm: ${sub.studentName} (${sub.studentClass || "Chưa phân lớp"})`
          : `Chi tiết bài làm: ${sub.testTitle}`;
        subtitle.textContent = `Bài kiểm tra: ${sub.testTitle} · Điểm TN: ${Number(sub.objectiveScore).toFixed(2)} · Điểm Writing: ${sub.manualScore !== null ? Number(sub.manualScore).toFixed(2) : "Chờ chấm"} · Tổng: ${sub.scoreOnTen}/10`;
      };

      updateHeaderInfo();

      const writingAnswers = sub.writingAnswers || {};
      const objectiveAnswers = sub.objectiveAnswers || {};

      // Tìm tất cả các câu Writing (từ writingAnswers hoặc tìm trong objectiveAnswers có key chứa writing/paragraph)
      const writingEntries = Object.entries(writingAnswers);
      if(!writingEntries.length){
        Object.entries(objectiveAnswers).forEach(([k, v]) => {
          if(k.includes("writing") || k.includes("paragraph") || k.startsWith("q-21") || k.startsWith("q-22") || k.startsWith("q-23") || k.startsWith("q-24")){
            writingEntries.push([k, v]);
          }
        });
      }

      let writingHTML = "";
      if(writingEntries.length){
        let gradeBlock = "";
        if(isTeacher){
          gradeBlock = `
            <form id="modalGradeForm" style="margin-top:16px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px">
              <div style="display:grid; grid-template-columns: 180px 1fr; gap:12px; align-items:start">
                <div>
                  <label class="small" style="font-weight:700; display:block; margin-bottom:4px">Điểm Writing (0 – 3):</label>
                  <input type="number" min="0" max="3" step="0.25" id="modalScoreInput" value="${sub.manualScore !== null ? sub.manualScore : ''}" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-weight:700; font-size:15px; color:#4338ca" placeholder="0.0 - 3.0" required>
                </div>
                <div>
                  <label class="small" style="font-weight:700; display:block; margin-bottom:4px">Nhận xét của giáo viên:</label>
                  <textarea id="modalFeedbackInput" style="width:100%; min-height:58px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; resize:vertical" placeholder="Nội dung, ngữ pháp, cấu trúc câu, từ vựng...">${escapeHTML(sub.teacherFeedback || "")}</textarea>
                </div>
              </div>
              <div style="text-align:right; margin-top:12px">
                <button type="submit" class="btn btn-primary" id="modalSaveGradeBtn" style="padding:8px 20px; font-weight:700">💾 Lưu điểm & Đánh giá Writing</button>
              </div>
            </form>
          `;
        } else {
          gradeBlock = `
            <div style="margin-top:14px; padding:14px; background:${sub.manualScore !== null ? '#f0fdf4' : '#fffbeb'}; border:1px solid ${sub.manualScore !== null ? '#bbf7d0' : '#fef3c7'}; border-radius:10px">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                <strong style="color:${sub.manualScore !== null ? '#15803d' : '#b45309'}">Đánh giá & Nhận xét của giáo viên:</strong>
                ${sub.manualScore !== null ? `<span class="badge green">${Number(sub.manualScore).toFixed(2)} / 3.0 điểm</span>` : '<span class="badge orange">Chờ giáo viên chấm</span>'}
              </div>
              <p style="margin:4px 0 0; color:#334155; font-size:13.5px; line-height:1.5">${sub.teacherFeedback ? escapeHTML(sub.teacherFeedback) : (sub.manualScore !== null ? "Giáo viên không để lại lời nhận xét." : "Bài viết đang được giáo viên chấm điểm. Điểm số sẽ được cập nhật sau khi hoàn tất.")}</p>
            </div>
          `;
        }

        writingHTML = `
          <div class="detail-section" style="border: 2px solid #818cf8; border-radius: 12px; padding: 16px; background: #fdfefe;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
              <h4 style="margin:0; font-size:16px; color:#4338ca">✍️ Bài làm Writing (Tự luận)</h4>
              ${sub.manualScore !== null ? `<span class="badge green">Điểm: ${Number(sub.manualScore).toFixed(2)} đ</span>` : '<span class="badge orange">Đang chờ chấm</span>'}
            </div>
            
            ${writingEntries.map(([k, val])=>`
              <div class="detail-writing-box" style="margin-bottom:12px; padding:12px; background:#f8fafc; border:1px solid var(--line); border-radius:8px">
                <strong style="color:#1e293b; font-size:13px">Nội dung câu hỏi: ${escapeHTML(k)}</strong>
                <div class="detail-student-answer" style="margin-top:8px; padding:12px; background:#ffffff; border-left:4px solid #6366f1; border-radius:6px; font-size:14px; line-height:1.6; white-space:pre-wrap">${escapeHTML(val || "Học sinh không nhập nội dung.")}</div>
              </div>
            `).join("")}

            ${gradeBlock}
          </div>
        `;
      } else {
        writingHTML = `
          <div class="detail-section" style="padding:14px; border:1px solid var(--line); border-radius:10px">
            <h4 style="margin:0 0 8px; color:var(--primary)">✍️ Phần Writing (Tự luận)</h4>
            <p class="small muted">Bài thi không có phần Writing hoặc học sinh không nộp nội dung tự luận.</p>
          </div>
        `;
      }

      // Đáp án trắc nghiệm
      let objectiveHTML = "";
      const objKeys = Object.keys(objectiveAnswers).filter(k => !k.includes("writing") && !k.includes("paragraph") && !k.startsWith("q-21") && !k.startsWith("q-22") && !k.startsWith("q-23") && !k.startsWith("q-24"));
      if(objKeys.length){
        objectiveHTML = `
          <div class="detail-section" style="margin-top:16px; padding:14px; border:1px solid var(--line); border-radius:10px">
            <h4 style="margin:0 0 10px; color:var(--text)">Đáp án trắc nghiệm học sinh đã chọn</h4>
            <div class="detail-answers-grid">
              ${objKeys.map(k=>`
                <div class="detail-answer-chip">
                  <span>${escapeHTML(k)}:</span>
                  <strong>${escapeHTML(objectiveAnswers[k] || "—")}</strong>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }

      let antiCheatDetailBox = "";
      const tabV = Number(sub.tabViolations || 0);
      const penaltyV = Number(sub.violationPenalty || 0);
      if (sub.isForcedSubmit || tabV >= 3) {
        antiCheatDetailBox = `
          <div style="margin-bottom:14px; padding:12px 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; color:#991b1b; font-size:13.5px">
            <strong style="color:#dc2626; font-size:14px">⛔ Cảnh báo giám sát thi: BỊ HỆ THỐNG THU BÀI TỰ ĐỘNG!</strong>
            <div style="margin-top:4px">Học sinh đã rời khỏi màn hình bài thi <strong>3 lần</strong> và bị tự động thu bài. Đã trừ phạt: <strong>-${penaltyV > 0 ? penaltyV : 2.25} điểm</strong> vào kết quả bài thi.</div>
          </div>
        `;
      } else if (tabV > 0) {
        antiCheatDetailBox = `
          <div style="margin-bottom:14px; padding:12px 16px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; color:#92400e; font-size:13.5px">
            <strong style="color:#d97706; font-size:14px">⚠️ Giám sát thi cử: Có vi phạm rời tab (${tabV} lần)</strong>
            <div style="margin-top:4px">Học sinh đã rời khỏi màn hình bài thi <strong>${tabV} lần</strong> trong lúc làm bài. Đã trừ phạt: <strong>-${penaltyV} điểm</strong> vào kết quả bài thi.</div>
          </div>
        `;
      } else {
        antiCheatDetailBox = `
          <div style="margin-bottom:14px; padding:10px 14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; color:#166534; font-size:13px">
            <strong>🛡️ Giám sát thi cử: Hoàn toàn nghiêm túc</strong> — Không ghi nhận vi phạm rời tab nào trong quá trình làm bài.
          </div>
        `;
      }

      body.innerHTML = `
        <div class="submission-detail-container">
          <div class="submission-summary-header">
            <div><strong>Học sinh:</strong> ${escapeHTML(sub.studentName || currentUser?.fullName || "")}</div>
            <div><strong>Lớp:</strong> ${escapeHTML(sub.studentClass || currentUser?.className || "Toàn khối")}</div>
            <div><strong>Thời gian nộp bài:</strong> ${new Date(sub.submittedAt).toLocaleString("vi-VN")}</div>
            <div><strong>Tổng điểm hệ 10:</strong> <strong id="modalTotalScore10" style="font-size:1.25rem; color:var(--primary)">${sub.scoreOnTen} / 10</strong></div>
          </div>
          ${antiCheatDetailBox}
          ${writingHTML}
          ${objectiveHTML}
        </div>
      `;

      // Gắn sự kiện submit cho form chấm điểm nếu là giáo viên
      const gradeForm = document.getElementById("modalGradeForm");
      if(gradeForm && isTeacher){
        gradeForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const scoreInput = document.getElementById("modalScoreInput");
          const feedbackInput = document.getElementById("modalFeedbackInput");
          const saveBtn = document.getElementById("modalSaveGradeBtn");

          const scoreVal = Number(scoreInput.value);
          const feedbackVal = feedbackInput.value.trim();

          if(saveBtn) saveBtn.disabled = true;
          try {
            const res = await apiRequest(`/api/teacher/writing-submissions/${sub.id}`, {
              method: "PATCH",
              body: JSON.stringify({ score: scoreVal, feedback: feedbackVal })
            });
            showToast(res.message || "Đã lưu điểm Writing thành công!");
            
            // Cập nhật dữ liệu đối tượng cục bộ
            sub.manualScore = scoreVal;
            sub.teacherFeedback = feedbackVal;
            sub.status = "graded";
            const maxScore = Number(sub.maxScore || 10);
            const totalRaw = Number(sub.objectiveScore || 0) + scoreVal;
            sub.scoreOnTen = maxScore > 0 ? (totalRaw / maxScore * 10).toFixed(1) : totalRaw.toFixed(1);

            updateHeaderInfo();
            const total10El = document.getElementById("modalTotalScore10");
            if(total10El) total10El.textContent = `${sub.scoreOnTen} / 10`;

            // Làm mới lại bảng điểm và thống kê
            renderTeacherResults();
            renderTeacherStats();
          } catch(err) {
            showToast(err.message);
          } finally {
            if(saveBtn) saveBtn.disabled = false;
          }
        });
      }

      modal.classList.remove("hidden");
    }

    let studentSubmissionsCache = [];

    async function renderStudentResults(){
      const tbody = document.getElementById("studentResultsTableBody");
      if(!tbody) return;

      try {
        const data = await apiRequest("/api/student/results");
        studentSubmissionsCache = data.submissions || [];
        const stats = data.stats || {};

        const elAvg = document.getElementById("studentAvgScore");
        const elAcc = document.getElementById("studentAccuracy");
        const elTotal = document.getElementById("studentTotalTests");
        const elPending = document.getElementById("studentPendingWriting");

        if(elAvg) elAvg.textContent = stats.avgScore ? `${stats.avgScore}/10` : "--";
        if(elAcc) elAcc.textContent = stats.accuracy ? `${stats.accuracy}%` : "--%";
        if(elTotal) elTotal.textContent = stats.totalTests || 0;
        if(elPending) elPending.textContent = stats.pendingWriting || 0;

        if(!studentSubmissionsCache.length){
          tbody.innerHTML = '<tr><td colspan="6" class="small muted" style="text-align:center;padding:24px">Bạn chưa có bài làm nào do giáo viên giao. Hãy làm bài ở mục Đề kiểm tra DOCX nhé!</td></tr>';
          return;
        }

        tbody.innerHTML = studentSubmissionsCache.map(item => {
          const dateStr = item.submittedAt ? new Date(item.submittedAt).toLocaleString("vi-VN") : "—";
          const isPending = item.status === "pending_manual";
          const statusBadge = isPending 
            ? '<span class="badge orange">Chờ chấm Writing</span>' 
            : '<span class="badge green">Đã hoàn thành</span>';

          const writingDisplay = item.manualScore !== null
            ? `<div><strong style="color:#059669">${Number(item.manualScore).toFixed(2)} đ</strong>${item.teacherFeedback ? `<div class="small" style="color:#64748b;font-style:italic;margin-top:2px">"${escapeHTML(item.teacherFeedback)}"</div>` : ''}</div>`
            : '<span class="badge orange">Chờ GV chấm</span>';

          const score10 = Number(item.scoreOnTen);
          const scoreClass = score10 >= 8 ? "high" : score10 >= 5 ? "mid" : "low";

          return `
            <tr>
              <td>
                <strong>${escapeHTML(item.testTitle)}</strong>
                <br><span class="small muted">Nộp lúc: ${escapeHTML(dateStr)}</span>
              </td>
              <td><strong>${Number(item.objectiveScore).toFixed(2)}</strong> / ${Number(item.objectiveMax).toFixed(2)} đ</td>
              <td>${writingDisplay}</td>
              <td><strong class="total-score-badge ${scoreClass}">${item.scoreOnTen} / 10</strong></td>
              <td>${statusBadge}</td>
              <td>
                <button class="btn btn-light btn-sm view-student-sub-btn" data-sub-id="${item.id}">Xem bài</button>
              </td>
            </tr>
          `;
        }).join("");

        tbody.querySelectorAll(".view-student-sub-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const sub = studentSubmissionsCache.find(s => s.id == btn.dataset.subId);
            if(sub) openSubmissionDetail(sub);
          });
        });

        // Cập nhật bảng kết quả gần đây trên trang chủ học sinh (#recentHomeSubmissionsBody)
        const recentHomeTbody = document.getElementById("recentHomeSubmissionsBody");
        if(recentHomeTbody){
          if(!studentSubmissionsCache.length){
            recentHomeTbody.innerHTML = '<tr><td colspan="4" class="small muted" style="text-align:center;padding:20px">Chưa có kết quả làm bài nào. Hãy chọn một bài luyện để bắt đầu!</td></tr>';
          } else {
            const top3 = studentSubmissionsCache.slice(0, 3);
            recentHomeTbody.innerHTML = top3.map(item => {
              const dateStr = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("vi-VN") : "Hôm nay";
              const isPending = item.status === "pending_manual";
              return `
                <tr>
                  <td><strong>${escapeHTML(item.testTitle)}</strong></td>
                  <td>${escapeHTML(dateStr)}</td>
                  <td><span class="score-pill" style="font-weight:800">${item.scoreOnTen}</span></td>
                  <td><span class="badge ${isPending ? 'orange' : 'green'}">${isPending ? 'Chờ chấm' : 'Đã nộp'}</span></td>
                </tr>
              `;
            }).join("");
          }
        }

        // Cập nhật biểu đồ kỹ năng của học sinh
        const chart = document.getElementById("studentSkillChart");
        if(chart && stats.avgScore !== undefined){
          const avg = stats.avgScore;
          const p1 = Math.min(100, Math.round(avg * 10));
          chart.innerHTML = `
            <div class="bar-wrap"><div class="bar" data-value="${Math.min(100, Math.round(p1 * 0.95))}%" style="height:${Math.max(12, Math.round(p1 * 0.95))}%"></div>Phonetics</div>
            <div class="bar-wrap"><div class="bar" data-value="${Math.min(100, Math.round(p1 * 0.92))}%" style="height:${Math.max(12, Math.round(p1 * 0.92))}%"></div>Grammar</div>
            <div class="bar-wrap"><div class="bar" data-value="${Math.min(100, Math.round(p1 * 1.02))}%" style="height:${Math.max(12, Math.round(p1 * 1.02))}%"></div>Reading</div>
            <div class="bar-wrap"><div class="bar" data-value="${Math.min(100, Math.round(p1 * 0.98))}%" style="height:${Math.max(12, Math.round(p1 * 0.98))}%"></div>Writing</div>
            <div class="bar-wrap"><div class="bar" data-value="${p1}%" style="height:${Math.max(12, p1)}%"></div>Tổng quan</div>
          `;
        }

      } catch(err) {
        tbody.innerHTML = `<tr><td colspan="6" class="small muted" style="color:red;text-align:center">${escapeHTML(err.message)}</td></tr>`;
      }
    }

    // Modal tạo đề kiểm tra DOCX (Nút xanh to + Tạo bài kiểm tra)
    const createTestBtn = document.getElementById("createTestBtn");
    const createTestModal = document.getElementById("createTestModal");
    if(createTestBtn && createTestModal){
      createTestBtn.addEventListener("click", ()=>createTestModal.classList.remove("hidden"));
    }

    document.querySelectorAll(".create-close").forEach(btn=>btn.addEventListener("click",()=>{
      if(createTestModal) createTestModal.classList.add("hidden");
    }));

    document.querySelectorAll(".detail-close").forEach(btn=>btn.addEventListener("click",()=>{
      const m = document.getElementById("submissionDetailModal");
      if(m) m.classList.add("hidden");
    }));

    const uploadDocxForm = document.getElementById("uploadDocxForm");
    if(uploadDocxForm){
      uploadDocxForm.addEventListener("submit", async e=>{
        e.preventDefault();
        const fileInput = document.getElementById("docxModalFileInput");
        const titleInput = document.getElementById("docxModalTitle");
        const classSelect = document.getElementById("docxModalClass");
        const submitBtn = document.getElementById("submitDocxBtn");

        const file = fileInput.files[0];
        if(!file){
          showToast("Vui lòng chọn file DOCX.");
          return;
        }

        if(submitBtn) submitBtn.disabled = true;
        try{
          showToast("Đang đọc DOCX và tạo bài kiểm tra...");
          const result = await importDocxTest(file, classSelect.value, titleInput.value.trim());
          showToast(`${result.message} ${result.summary.objectiveCount} câu tự động, ${result.summary.manualCount} câu Writing.`);
          if(createTestModal) createTestModal.classList.add("hidden");
          uploadDocxForm.reset();
          renderTeacherResults();
          renderTeacherStats();
          renderTeacherRecentTests();
        }catch(error){
          showToast(error.message);
        }finally{
          if(submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // Bộ lọc kết quả học tập cho giáo viên
    const teacherClassFilter = document.getElementById("teacherClassFilter");
    const teacherTestFilter = document.getElementById("teacherTestFilter");
    const refreshTeacherResults = document.getElementById("refreshTeacherResults");
    const refreshTeacherTestsBtn = document.getElementById("refreshTeacherTestsBtn");
    const btnScrollToResults = document.getElementById("btnScrollToResults");

    if(teacherClassFilter) teacherClassFilter.addEventListener("change", renderTeacherResults);
    if(teacherTestFilter) teacherTestFilter.addEventListener("change", renderTeacherResults);
    if(refreshTeacherResults) refreshTeacherResults.addEventListener("click", ()=>{
      renderTeacherResults();
      renderTeacherStats();
      showToast("Đã làm mới bảng điểm.");
    });
    if(refreshTeacherTestsBtn) refreshTeacherTestsBtn.addEventListener("click", ()=>{
      renderTeacherRecentTests();
      showToast("Đã làm mới danh sách đề.");
    });
    if(btnScrollToResults){
      btnScrollToResults.addEventListener("click", ()=>{
        const sec = document.getElementById("teacherResultsSection");
        if(sec) sec.scrollIntoView({ behavior: "smooth" });
      });
    }

    document.getElementById("refreshImportedTests")?.addEventListener("click",renderImportedTests);
    document.getElementById("refreshStudentResultsBtn")?.addEventListener("click", ()=>{
      renderStudentResults();
      showToast("Đã làm mới kết quả học tập.");
    });

    async function renderParentDashboard(){
      const badgeEl = document.getElementById("parentStudentBadge");
      const heroRingEl = document.getElementById("parentAvgScoreRing");
      const heroScoreEl = document.getElementById("parentAvgScoreHero");
      const totalDoneEl = document.getElementById("parentTotalDone");
      const avgScoreEl = document.getElementById("parentAvgScore");
      const integrityEl = document.getElementById("parentIntegrityRate");
      const totalViolationsEl = document.getElementById("parentTotalViolations");
      const tableBody = document.getElementById("parentSubmissionsTableBody");
      if (!tableBody) return;

      try {
        const res = await apiRequest("/api/parent/student-data");
        const student = res.student;
        const stats = res.stats || {};
        const submissions = res.submissions || [];

        if (student) {
          if (badgeEl) badgeEl.textContent = `Học sinh: ${student.fullName} · Lớp ${student.className}`;
        } else {
          if (badgeEl) badgeEl.textContent = `Học sinh: Chưa liên kết`;
        }

        const avg = Number(stats.avgScore || 0);
        if (heroScoreEl) heroScoreEl.textContent = avg > 0 ? avg.toFixed(1) : "--";
        if (heroRingEl) {
          const pct = Math.min(100, Math.round(avg * 10));
          heroRingEl.style.background = `conic-gradient(#10b981 0 ${pct}%, rgba(255,255,255,.16) ${pct}%)`;
        }
        if (totalDoneEl) totalDoneEl.textContent = stats.totalTests || 0;
        if (avgScoreEl) avgScoreEl.textContent = avg > 0 ? `${avg.toFixed(1)}/10` : "--";
        if (integrityEl) {
          const rate = stats.integrityRate !== undefined ? stats.integrityRate : 100;
          integrityEl.textContent = `${rate}%`;
          integrityEl.style.color = rate >= 90 ? "#16a34a" : rate >= 70 ? "#d97706" : "#dc2626";
        }
        if (totalViolationsEl) {
          totalViolationsEl.textContent = stats.totalViolations || 0;
        }

        if (!submissions.length) {
          tableBody.innerHTML = '<tr><td colspan="5" class="small muted" style="text-align:center;padding:24px">Con em chưa có bài kiểm tra nào được nộp.</td></tr>';
        } else {
          tableBody.innerHTML = submissions.map(item => {
            const dateStr = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("vi-VN") : "—";
            const score = Number(item.scoreOnTen);
            const scoreClass = score >= 8 ? "high" : score >= 5 ? "mid" : "low";

            let vBadge = '<span class="badge green" style="background:#ecfdf5;color:#059669;font-weight:700">✓ Nghiêm túc</span>';
            if (item.isForcedSubmit || item.tabViolations >= 3) {
              vBadge = `<span class="badge red" style="background:#fef2f2;color:#dc2626;font-weight:800">⛔ Rời tab 3 lần (-2.25đ)</span>`;
            } else if (item.tabViolations === 2) {
              vBadge = `<span class="badge orange" style="background:#fff1f2;color:#e11d48;font-weight:800">⚠️ Rời tab 2 lần (-1.25đ)</span>`;
            } else if (item.tabViolations === 1) {
              vBadge = `<span class="badge orange" style="background:#fffbeb;color:#d97706;font-weight:700">⚠️ Rời tab 1 lần (-0.5đ)</span>`;
            }

            return `
              <tr>
                <td><strong>${escapeHTML(item.testTitle)}</strong></td>
                <td><strong class="total-score-badge ${scoreClass}">${item.scoreOnTen}/10</strong></td>
                <td>${vBadge}</td>
                <td><span class="small" style="color:#334155">${item.teacherFeedback ? escapeHTML(item.teacherFeedback) : "Chưa có nhận xét"}</span></td>
                <td><span class="small muted">${escapeHTML(dateStr)}</span></td>
              </tr>
            `;
          }).join("");
        }

        // Cập nhật biểu đồ kỹ năng 6 trục của con
        const pAvg = Math.min(100, Math.round(avg * 10));
        const setBar = (id, val) => {
          const el = document.getElementById(id);
          if (el) {
            el.style.height = `${Math.max(10, Math.min(100, val))}%`;
            el.setAttribute("data-value", `${val}%`);
          }
        };
        setBar("parentBarListening", Math.round(pAvg * 0.95));
        setBar("parentBarSpeaking", Math.round(pAvg * 0.90));
        setBar("parentBarVocab", Math.round(pAvg * 0.98));
        setBar("parentBarGrammar", Math.round(pAvg * 0.92));
        setBar("parentBarReading", Math.round(pAvg * 1.02));
        setBar("parentBarWriting", Math.round(pAvg * 0.96));

      } catch (err) {
        console.error("renderParentDashboard error:", err);
      }
    }

    document.getElementById("refreshParentDataBtn")?.addEventListener("click", () => {
      renderParentDashboard();
      showToast("Đã làm mới dữ liệu học tập của con.");
    });

    // Close modal when clicking backdrop
    document.querySelectorAll(".modal").forEach(modal=>{
      modal.addEventListener("click",e=>{if(e.target===modal) modal.classList.add("hidden")});
    });


    // ENGO v3: Dữ liệu học tập và Gamification được phân tách riêng biệt theo từng tài khoản (User Storage Isolation)
    function getUserStorageKey(baseKey){
      if(currentUser && currentUser.id){
        return `${baseKey}_user_${currentUser.id}`;
      }
      return `${baseKey}_guest`;
    }

    const defaultLearningStats={quizCount:0,bestScore:0,totalScore:0,totalCorrect:0,totalQuestions:0,focusSessions:0,focusMinutes:0,points:0,streak:1,lastStudyDate:"",skillErrors:{},carrots:15,speakingAttempts:0,bestSpeakingScore:0,capybaraLevel:1};

    function getLearningStats(){
      const key = getUserStorageKey("engoLearningStatsV3");
      try{
        let raw = localStorage.getItem(key);
        // Tự động giữ nguyên dữ liệu cho tài khoản cũ (id: 1)
        if (!raw && currentUser && currentUser.id === 1) {
          const legacy = localStorage.getItem("engoLearningStatsV3");
          if (legacy) {
            localStorage.setItem(key, legacy);
            raw = legacy;
          }
        }
        if (!raw) return { ...defaultLearningStats };
        return { ...defaultLearningStats, ...JSON.parse(raw) };
      } catch{
        return { ...defaultLearningStats };
      }
    }

    function setLearningStats(stats){
      const key = getUserStorageKey("engoLearningStatsV3");
      localStorage.setItem(key, JSON.stringify(stats));
    }

    function dateKey(){return new Date().toISOString().slice(0,10)}
    function updateStudyStreak(stats){
      const today=dateKey();
      if(!stats.lastStudyDate){stats.streak=1;stats.lastStudyDate=today;return}
      if(stats.lastStudyDate===today) return;
      const previous=new Date(stats.lastStudyDate+"T00:00:00");
      const current=new Date(today+"T00:00:00");
      const days=Math.round((current-previous)/86400000);
      stats.streak=days===1?Math.max(1,stats.streak+1):1;
      stats.lastStudyDate=today;
    }
    function saveLearningStats(correct,score){
      const stats=getLearningStats();
      updateStudyStreak(stats);
      const xpGain = Math.round(30 * getXPMultiplier());
      stats.quizCount+=1;stats.bestScore=Math.max(stats.bestScore,score);stats.totalScore+=score;
      stats.totalCorrect+=correct;stats.totalQuestions+=questions.length;stats.points+=xpGain;
      questions.forEach((q,i)=>{if(!isCorrect(i)) stats.skillErrors[q.type]=(stats.skillErrors[q.type]||0)+1});
      setLearningStats(stats);renderLearningFeatures();
    }

    function getDailyPlan(){
      const key = getUserStorageKey("engoDailyPlanV3");
      try{
        const data=JSON.parse(localStorage.getItem(key)||"{}");
        return data.date===dateKey()?data:{date:dateKey(),tasks:{}}
      } catch{
        return {date:dateKey(),tasks:{}}
      }
    }
    function setDailyPlan(data){
      const key = getUserStorageKey("engoDailyPlanV3");
      localStorage.setItem(key,JSON.stringify(data));
    }
    function completeDailyPlanTask(task){
      const plan=getDailyPlan();
      if(!plan.tasks[task]){
        plan.tasks[task]=true;setDailyPlan(plan);
        const stats=getLearningStats();
        const baseXP = task==="quiz"?30:task==="focus"?20:10;
        stats.points+=Math.round(baseXP * getXPMultiplier());
        updateStudyStreak(stats);
        setLearningStats(stats);
        showToast(`🎉 Hoàn thành nhiệm vụ ngày: +${Math.round(baseXP * getXPMultiplier())} XP!`);
      }
      renderDailyPlan();renderLearningFeatures();
    }
    function renderDailyPlan(){
      const plan=getDailyPlan();
      const labels={flashcard:"flashcard",quiz:"quiz",focus:"focus"};
      Object.keys(labels).forEach(task=>{
        const checkbox=document.querySelector(`[data-plan="${task}"]`);
        const item=document.querySelector(`[data-plan-item="${task}"]`);
        if(checkbox){
          checkbox.checked=Boolean(plan.tasks[task]);
          checkbox.disabled=true; // Khóa không cho học sinh tự tích gian lận
          checkbox.style.cursor="default";
        }
        if(item) item.classList.toggle("done",Boolean(plan.tasks[task]));
      });
      const done=Object.values(plan.tasks).filter(Boolean).length;
      const percent=Math.round(done/3*100);
      document.getElementById("dailyPlanBadge").textContent=`${done}/3 hoàn thành`;
      document.getElementById("dailyGoalPercent").textContent=`${percent}%`;
      document.getElementById("dailyGoalRing").style.setProperty("--goal-progress",`${percent}%`);
      document.getElementById("dailyGoalMessage").textContent=done===3?"Tuyệt vời! Bạn đã hoàn thành toàn bộ mục tiêu hôm nay.":done?"Đang tiến bộ tốt — hoàn thành nốt các nhiệm vụ còn lại nhé.":"Hãy thực hiện các hoạt động học tập để tự động hoàn thành nhiệm vụ.";
      document.getElementById("dailyPlanDate").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit"});
    }

    // Học sinh bấm vào hàng nhiệm vụ ngày sẽ được chuyển hướng trực tiếp đến chức năng đó
    document.querySelectorAll("[data-plan-item]").forEach(item=>{
      item.style.cursor="pointer";
      item.addEventListener("click",()=>{
        const task=item.dataset.planItem;
        const plan=getDailyPlan();
        if(plan.tasks[task]){
          showToast("✓ Nhiệm vụ này đã được hệ thống ghi nhận hoàn thành hôm nay!");
          return;
        }
        if(task==="flashcard"){
          switchView("flashcards");
          showToast("📖 Hãy lật mở học ít nhất 5 thẻ từ vựng để hoàn thành nhiệm vụ!");
        } else if(task==="quiz"){
          switchView("student-home");
          showToast("📝 Hãy hoàn thành 1 bài luyện tập ngữ pháp để hoàn thành nhiệm vụ!");
        } else if(task==="focus"){
          switchView("focus-room");
          showToast("⏱️ Hãy hoàn thành 1 phiên tập trung Pomodoro để hoàn thành nhiệm vụ!");
        }
      });
    });

    function renderSmartReview(){
      const stats=getLearningStats();
      const accuracy=stats.totalQuestions?Math.round(stats.totalCorrect/stats.totalQuestions*100):0;
      document.getElementById("smartAccuracy").textContent=`${accuracy}%`;
      document.getElementById("smartBest").textContent=Number(stats.bestScore||0).toFixed(1);
      document.getElementById("smartAttempts").textContent=stats.quizCount;
      const entries=Object.entries(stats.skillErrors||{}).sort((a,b)=>b[1]-a[1]);
      const fallback=[["Vocabulary",0],["Pronunciation",0],["Reading",0]];
      const list=(entries.length?entries:fallback).slice(0,4);
      document.getElementById("weakSkillList").innerHTML=list.map(([skill,count],index)=>{
        const max=Math.max(1,...list.map(x=>x[1]));const risk=count?Math.max(22,Math.round(count/max*100)):0;
        const labels=count?`${count} lỗi đã ghi nhận`:"Chưa đủ dữ liệu";
        return `<div class="weak-skill"><div class="weak-skill-head"><div><strong>${escapeHTML(skill)}</strong><br><span>${labels}</span></div><span class="badge ${index===0&&count?"red":"orange"}">${count?"Cần ôn":"Chưa có lỗi"}</span></div><div class="progress"><span style="width:${risk}%"></span></div></div>`;
      }).join("");
      const top=entries[0];
      document.getElementById("smartRecommendationTitle").textContent=top?`Ưu tiên ${top[0]}`:"Làm bài chẩn đoán ngắn";
      document.getElementById("smartRecommendation").textContent=top?`Bạn đang có nhiều lỗi nhất ở nhóm ${top[0]}. Hãy làm một bài ngắn, xem lời giải và ghi lại quy tắc thường nhầm.`:"Bạn chưa có đủ dữ liệu. Hãy hoàn thành một bài luyện để ENGO xác định kỹ năng cần ưu tiên.";
    }

    const achievementDefs=[
      {icon:"🎯",name:"Bước đầu tiên",desc:"Hoàn thành bài luyện đầu tiên",rule:s=>s.quizCount>=1},
      {icon:"⭐",name:"Điểm số nổi bật",desc:"Đạt ít nhất 8 điểm",rule:s=>s.bestScore>=8},
      {icon:"💯",name:"Bài làm hoàn hảo",desc:"Đạt điểm 10",rule:s=>s.bestScore>=10},
      {icon:"🔥",name:"Người học bền bỉ",desc:"Hoàn thành 3 lượt luyện",rule:s=>s.quizCount>=3},
      {icon:"⏱",name:"Tập trung cao độ",desc:"Hoàn thành một phiên tập trung",rule:s=>s.focusSessions>=1},
      {icon:"✅",name:"Trọn vẹn một ngày",desc:"Hoàn thành cả 3 mục tiêu ngày",rule:()=>Object.values(getDailyPlan().tasks).filter(Boolean).length===3},
      {icon:"⚡",name:"Tích lũy 100 XP",desc:"Đạt tổng cộng 100 XP",rule:s=>s.points>=100},
      {icon:"🏆",name:"Chuỗi 7 ngày",desc:"Học liên tục trong 7 ngày",rule:s=>s.streak>=7}
    ];
    function renderAchievements(){
      const stats=getLearningStats();const level=Math.floor(stats.points/100)+1;const within=stats.points%100;
      document.getElementById("achievementLevel").textContent=level;
      document.getElementById("achievementPoints").textContent=`${stats.points} XP`;
      document.getElementById("achievementLevelName").textContent=level>=5?"Bậc thầy ENGO":level>=3?"Người học kiên trì":level>=2?"Người học tiến bộ":"Người học khởi động";
      document.getElementById("achievementProgress").style.width=`${within}%`;
      document.getElementById("achievementProgressText").textContent=`${within}/100 XP đến cấp tiếp theo`;
      let unlocked=0;
      document.getElementById("achievementGrid").innerHTML=achievementDefs.map(a=>{const ok=a.rule(stats);if(ok)unlocked++;return `<article class="card achievement-card ${ok?"unlocked":""}"><div class="achievement-icon">${a.icon}</div><h4>${a.name}</h4><p>${a.desc}</p><span class="achievement-state">${ok?"Đã mở khóa":"Chưa mở khóa"}</span></article>`}).join("");
      document.getElementById("achievementCount").textContent=`${unlocked}/${achievementDefs.length} đã mở khóa`;
    }

    function renderDashboardStats(){
      const stats=getLearningStats();const avg=stats.quizCount?stats.totalScore/stats.quizCount:0;
      document.getElementById("dashboardCompleted").textContent=stats.quizCount;
      document.getElementById("dashboardAverage").textContent=avg.toFixed(1);
      document.getElementById("dashboardStreak").textContent=`${stats.streak||1} ngày`;
      document.getElementById("dashboardStudyTime").textContent=`${stats.focusMinutes||0} phút`;
      document.getElementById("focusSessions").textContent=stats.focusSessions||0;
      document.getElementById("focusMinutes").textContent=stats.focusMinutes||0;
    }
    const grammarProgressKey="engoGrammarProgressV1";
    const grammarCourses=[
      {id:"present-simple",icon:"☀️",name:"Present Simple",level:"Cơ bản",formula:"S + V(s/es) · do/does + not · Do/Does + S + V?",summary:"Diễn tả thói quen, sự thật hiển nhiên và thời gian biểu.",exercises:["Chọn đáp án đúng (do/does, V/V-s)","Chia động từ trong ngoặc","Sắp xếp từ thành câu","Tìm và sửa lỗi sai", "Viết câu theo tranh / từ gợi ý"]},
      {id:"present-continuous",icon:"⏳",name:"Present Continuous",level:"Cơ bản",formula:"S + am/is/are + V-ing",summary:"Mô tả hành động đang diễn ra tại thời điểm nói hoặc quanh hiện tại.",exercises:["Nhận biết dấu hiệu thời gian", "Chia động từ V-ing", "Phân biệt với Present Simple", "Điền từ vào đoạn hội thoại"]},
      {id:"past-simple",icon:"🕰️",name:"Past Simple",level:"Nền tảng",formula:"S + V2/ed · did not + V · Did + S + V?",summary:"Kể lại hành động đã hoàn thành trong quá khứ.",exercises:["Động từ có quy tắc / bất quy tắc", "Đổi câu khẳng định - phủ định - nghi vấn", "Hoàn thành mốc thời gian", "Viết đoạn nhật ký ngắn"]},
      {id:"comparatives",icon:"⚖️",name:"Comparatives & Superlatives",level:"Mở rộng",formula:"adj-er / more + adj · the adj-est / the most + adj",summary:"So sánh người, vật và sự việc trong ngữ cảnh quen thuộc.",exercises:["Chọn dạng so sánh đúng", "Viết lại câu không đổi nghĩa", "Sắp xếp bảng so sánh", "Miêu tả biểu đồ ngắn"]}
    ];
    let activeGrammarCourse = "present-simple";

    function getGrammarProgress(){
      const key = getUserStorageKey("engoGrammarProgressV1");
      try{return JSON.parse(localStorage.getItem(key)||"{}")}catch{return {}}
    }
    function setGrammarProgress(progress){
      const key = getUserStorageKey("engoGrammarProgressV1");
      localStorage.setItem(key,JSON.stringify(progress))
    }
    function grammarProgressTotal(){const progress=getGrammarProgress();return Math.round(grammarCourses.reduce((sum,course)=>sum+Number(progress[course.id]||0),0)/grammarCourses.length)}

    function getCompetencyScores(){
      const stats=getLearningStats();
      // Nếu là tài khoản mới tinh chưa làm bài nào -> hiển thị 0%
      if(!stats.quizCount && !stats.focusMinutes && !stats.speakingAttempts && !stats.totalQuestions){
        return {Listening:0,Speaking:0,Vocabulary:0,Grammar:0,Writing:0,Reading:0};
      }
      const accuracy=stats.totalQuestions?Math.round(stats.totalCorrect/stats.totalQuestions*100):0;
      const grammar=grammarProgressTotal();
      const speaking=stats.bestSpeakingScore || (stats.speakingAttempts ? Math.min(100, stats.speakingAttempts * 20) : 0);
      const listening=Math.min(100, Math.round((stats.focusMinutes * 4) + (stats.quizCount * 8)));
      const vocabulary=accuracy;
      const grammarScore=Math.min(100, Math.round(grammar + (stats.quizCount * 10)));
      const writing=Math.min(100, stats.quizCount ? Math.round(accuracy * 0.9) : 0);
      const reading=accuracy;

      return {
        Listening: listening,
        Speaking: speaking,
        Vocabulary: vocabulary,
        Grammar: grammarScore,
        Writing: writing,
        Reading: reading
      };
    }

    function renderCompetency(){
      const scores=getCompetencyScores();const order=["Listening","Speaking","Vocabulary","Grammar","Writing","Reading"];const center={x:160,y:134},radius=92;
      const stats=getLearningStats();
      const hasData = Boolean(stats.quizCount || stats.focusMinutes || stats.speakingAttempts || stats.totalQuestions);

      const points=order.map((name,index)=>{
        const angle=(-90+index*60)*Math.PI/180;
        const factor=hasData ? Math.max(0.08, scores[name]/100) : 0.05;
        return {x:center.x+Math.cos(angle)*radius*factor,y:center.y+Math.sin(angle)*radius*factor};
      });
      const polygon=document.getElementById("radarPolygon");if(polygon) polygon.setAttribute("points",points.map(point=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "));
      order.forEach((name,index)=>{const dot=document.getElementById(`radarDot${name}`);if(dot){dot.setAttribute("cx",points[index].x.toFixed(1));dot.setAttribute("cy",points[index].y.toFixed(1))}});
      const values=Object.values(scores);
      const overall=hasData ? Math.round(values.reduce((sum,value)=>sum+value,0)/values.length) : 0;
      const strongest=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];

      document.getElementById("overallProgress").textContent=`${overall}%`;
      document.querySelector(".score-orbit")?.style.setProperty("--overall-progress",`${overall}%`);
      document.getElementById("overallLevel").textContent=overall>=80?"Người học vững vàng":overall>=50?"Đang tiến bộ tốt":hasData?"Người học khởi động":"Chưa có dữ liệu";
      document.getElementById("overallHint").textContent=hasData?`Điểm mạnh hiện tại: ${strongest[0]} (${strongest[1]}%).` : "Hoàn thành bài luyện đầu tiên để cá nhân hóa số liệu.";
      document.getElementById("competencyMessage").textContent=hasData?`Nổi bật: ${strongest[0]} đang ở mức ${strongest[1]}%.` : "Hoàn thành bài luyện để ENGO đánh giá chính xác hơn.";
      document.getElementById("progressStatus").textContent=overall>=80?"Năng lực tốt":overall>=50?"Đang tiến bộ":hasData?"Đang khởi động":"Chưa đánh giá";
      document.getElementById("skillStatList").innerHTML=order.map(name=>`<div class="skill-stat"><div class="skill-stat-head"><span>${{Listening:"🎧 Nghe",Speaking:"🗣️ Nói",Vocabulary:"🔤 Từ vựng",Grammar:"📘 Ngữ pháp",Writing:"✍️ Viết",Reading:"📖 Đọc"}[name]}</span><b>${scores[name]}%</b></div><div class="progress"><span style="width:${scores[name]}%"></span></div></div>`).join("");
      document.getElementById("progressStreak").textContent=`${stats.streak||1} ngày`;document.getElementById("progressPoints").textContent=`${stats.points||0} XP`;document.getElementById("progressQuizzes").textContent=stats.quizCount||0;
    }
    function renderGrammarCourses(){
      const progress=getGrammarProgress();const active=grammarCourses.find(course=>course.id===activeGrammarCourse)||grammarCourses[0];
      document.getElementById("grammarCourseGrid").innerHTML=grammarCourses.map(course=>{const value=Math.min(100,Number(progress[course.id]||0));return `<article class="card grammar-course ${course.id===active.id?"active":""}" data-grammar-course="${course.id}"><div class="grammar-course-top"><div class="grammar-course-icon">${course.icon}</div><span class="badge ${value===100?"green":""}">${course.level}</span></div><h4>${course.name}</h4><p>${course.summary}</p><div class="progress"><span style="width:${value}%"></span></div><div class="grammar-course-footer"><span>${value}% hoàn thành</span><span>${value===100?"✓ Hoàn tất":"Xem lộ trình →"}</span></div></article>`}).join("");
      const value=Math.min(100,Number(progress[active.id]||0));document.getElementById("grammarDetail").innerHTML=`<span class="badge">${active.level}</span><h3>${active.icon} ${active.name}</h3><p class="small muted">${active.summary}</p><div class="grammar-formula">${active.formula}</div><strong class="small">Các dạng bài tập phổ biến</strong><div class="exercise-list">${active.exercises.map((exercise,index)=>`<div class="exercise-item"><b>${index+1}</b><span>${exercise}</span></div>`).join("")}</div><div class="section-head" style="margin:2px 0 0"><span class="small muted">Tiến độ khóa học: ${value}%</span><strong class="small">${value>=100?"Đã hoàn thành":"Bài tiếp theo"}</strong></div><div class="progress"><span style="width:${value}%"></span></div><button class="btn btn-primary" id="completeGrammarLesson" style="width:100%;margin-top:14px">${value>=100?"Ôn lại khóa học":"Hoàn thành bài tiếp theo"}</button>`;
      document.querySelectorAll("[data-grammar-course]").forEach(card=>card.addEventListener("click",()=>{activeGrammarCourse=card.dataset.grammarCourse;renderGrammarCourses()}));
      document.getElementById("completeGrammarLesson").addEventListener("click",()=>{
        const next=getGrammarProgress();
        const before=Number(next[active.id]||0);
        next[active.id]=before>=100?0:Math.min(100,before+25);
        setGrammarProgress(next);
        if(before<100){
          const stats=getLearningStats();
          const xpGain = Math.round(10 * getXPMultiplier());
          stats.points+=xpGain;
          updateStudyStreak(stats);
          setLearningStats(stats);
          showToast(`Đã hoàn thành một bài ${active.name}. +${xpGain} XP`);
        }else showToast(`Đã mở lại lộ trình ${active.name}`);
        renderGrammarCourses();renderCompetency();renderDashboardStats();
      });
    }
    document.getElementById("resetGrammarProgress").addEventListener("click",()=>{setGrammarProgress({});activeGrammarCourse="present-simple";renderGrammarCourses();renderCompetency();showToast("Đã đặt lại tiến độ khóa ngữ pháp")});
    function renderLearningFeatures(){
      renderDashboardStats();
      renderSmartReview();
      renderAchievements();
      renderCompetency();
      renderGrammarCourses();
      renderCapybaraCompanion();
      renderSpeakingLab();
    }

    // ============================================================
    // MODULE 1: GIÁM SÁT THI AN TOÀN & CHỐNG GIAN LẬN (SMART ANTI-CHEAT)
    // ============================================================
    let examTabSwitches = 0;
    let antiCheatActive = false;

    function startAntiCheatGuard(){
      examTabSwitches = 0;
      antiCheatActive = true;
      updateAntiCheatUI();
    }

    function stopAntiCheatGuard(){
      antiCheatActive = false;
      const modal = document.getElementById("antiCheatModal");
      if(modal) modal.classList.add("hidden");
    }

    function updateAntiCheatUI(){
      const counter = document.getElementById("tabSwitchCounter");
      if(counter){
        counter.innerHTML = `Lần rời tab: <strong style="color:${examTabSwitches > 0 ? '#dc2626' : '#059669'}">${examTabSwitches}</strong>/3`;
      }
    }

    let lastViolationTime = 0;

    function handleAntiCheatViolation(){
      if(!antiCheatActive) return;
      const quizView = document.getElementById("quiz");
      if(!quizView || !quizView.classList.contains("active")) return;
      
      const now = Date.now();
      // Ngăn chặn bắt trùng lặp cả 2 sự kiện visibilitychange và blur cùng lúc (cooldown 1.5s)
      if(now - lastViolationTime < 1500) return;
      lastViolationTime = now;

      examTabSwitches++;
      updateAntiCheatUI();
      const penalty = getViolationPenalty(examTabSwitches);

      const modal = document.getElementById("antiCheatModal");
      const countEl = document.getElementById("modalViolationCount");
      const penaltyEl = document.getElementById("modalPenaltyText");
      const titleEl = document.getElementById("antiCheatModalTitle");
      const descEl = document.getElementById("antiCheatModalDesc");
      const dismissBtn = document.getElementById("dismissAntiCheatModal");

      if(countEl) countEl.textContent = examTabSwitches;

      if(examTabSwitches === 1){
        if(titleEl) titleEl.textContent = "⚠️ CẢNH BÁO VI PHẠM PHÒNG THI (LẦN 1)";
        if(penaltyEl) penaltyEl.textContent = "Bị trừ phạt: -0.50 điểm vào kết quả bài thi";
        if(descEl) descEl.textContent = "Hệ thống phát hiện bạn vừa chuyển tab hoặc rời khỏi màn hình bài thi!";
        if(dismissBtn) {
          dismissBtn.textContent = "Tôi đã hiểu, tiếp tục làm bài";
          dismissBtn.disabled = false;
        }
        showToast("⚠️ VI PHẠM LẦN 1: Bị trừ -0.50 điểm vào bài thi!");
      } else if(examTabSwitches === 2){
        if(titleEl) titleEl.textContent = "⚠️ CẢNH BÁO NGHIÊM TRỌNG (LẦN 2)";
        if(penaltyEl) penaltyEl.textContent = "Bị trừ phạt: -1.25 điểm (Phạt thêm -0.75đ)";
        if(descEl) descEl.textContent = "CẢNH BÁO: Nếu bạn rời tab thêm 1 lần nữa (Lần 3), bài thi sẽ bị TỰ ĐỘNG THU NGAY LẬP TỨC!";
        if(dismissBtn) {
          dismissBtn.textContent = "Tôi cam kết không chuyển tab nữa";
          dismissBtn.disabled = false;
        }
        showToast("⚠️ VI PHẠM LẦN 2: Bị trừ tổng cộng -1.25 điểm!");
      } else {
        // Lần 3: TỰ ĐỘNG THU BÀI NGAY LẬP TỨC!
        if(titleEl) titleEl.textContent = "⛔ ĐÃ ĐẠT GIỚI HẠN VI PHẠM (LẦN 3)";
        if(penaltyEl) penaltyEl.textContent = "Bị trừ phạt: -2.25 điểm & HỆ THỐNG ĐANG TỰ ĐỘNG THU BÀI!";
        if(descEl) descEl.textContent = "Bạn đã vi phạm quy chế rời tab 3 lần. Hệ thống tự động khóa và nộp bài thi ngay bây giờ.";
        if(dismissBtn) {
          dismissBtn.textContent = "Đang nộp bài tự động...";
          dismissBtn.disabled = true;
        }
        showToast("⛔ ĐÃ VI PHẠM 3 LẦN: Tự động thu bài thi và trừ -2.25 điểm!");
        
        if(modal) modal.classList.remove("hidden");

        // Tự động thu bài sau 1.2s
        setTimeout(() => {
          if(modal) modal.classList.add("hidden");
          submitQuiz();
        }, 1200);
        return;
      }

      if(modal) modal.classList.remove("hidden");
    }

    document.addEventListener("visibilitychange", () => {
      if(document.hidden) handleAntiCheatViolation();
    });
    window.addEventListener("blur", () => {
      handleAntiCheatViolation();
    });

    const dismissModalBtn = document.getElementById("dismissAntiCheatModal");
    if(dismissModalBtn){
      dismissModalBtn.addEventListener("click", () => {
        const modal = document.getElementById("antiCheatModal");
        if(modal && examTabSwitches < 3) modal.classList.add("hidden");
      });
    }

    // Chống sao chép câu hỏi trong khi thi
    const quizCardEl = document.getElementById("quizExamCard");
    if(quizCardEl){
      quizCardEl.addEventListener("copy", e => {
        if(document.getElementById("quiz").classList.contains("active")){
          e.preventDefault();
          showToast("⛔ Không được phép sao chép nội dung bài thi!");
        }
      });
      quizCardEl.addEventListener("contextmenu", e => {
        if(document.getElementById("quiz").classList.contains("active")){
          e.preventDefault();
          showToast("⛔ Chuột phải đã bị khóa trong phòng thi an toàn!");
        }
      });
    }

    // Xáo trộn đề thi ngẫu nhiên (Fisher-Yates Shuffle)
    function shuffleArray(array) {
      const copy = [...array];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    const shuffleBtn = document.getElementById("shuffleQuizBtn");
    if(shuffleBtn){
      shuffleBtn.addEventListener("click", () => {
        if(activeImportedTest){
          showToast("Bài thi của giáo viên giữ nguyên thứ tự chuẩn.");
          return;
        }
        questions = shuffleArray(defaultQuestions);
        answers = {};
        checked = {};
        currentQuestion = 0;
        renderQuestion();
        renderQuestionGrid();
        showToast("🔀 Đã đổi mã đề & xáo trộn thứ tự câu hỏi!");
      });
    }


    // ============================================================
    // MODULE 2: BẠN ĐỒNG HÀNH CAPYBARA & GAMIFICATION
    // ============================================================
    const capybaraQuotesByLevel = {
      1: [
        "Chào bạn mới! Cùng mình bắt đầu hành trình chinh phục tiếng Anh từ những câu đơn giản nhé! 🌱",
        "Đừng ngại ngùng khi phát âm nhé, mình luôn ở đây lắng nghe bạn! 🎙️",
        "Mỗi ngày học 5 từ vựng mới là bạn đã giỏi hơn hôm qua rồi! ✨",
        "Cho mình ăn 10 củ Cà rốt để chúng mình cùng tiến hóa lên Capybara Chăm Chỉ nha! 🥕"
      ],
      2: [
        "Thì Hiện tại đơn (Present Simple) diễn tả thói quen lặp đi lặp lại. Nhớ thêm s/es cho ngôi thứ 3 số ít nhé! ☀️",
        "Tuyệt vời! Bạn đang duy trì chuỗi học tập rất tốt, tiếp tục phát huy nào! 🎒",
        "Luyện nói mỗi ngày 5 phút sẽ giúp bạn nói trôi chảy và tự tin hơn rất nhiều! 🗣️",
        "Cần thêm 20 củ Cà rốt nữa là chúng mình sẽ thăng cấp thành Capybara Học Giả rồi! 🥕"
      ],
      3: [
        "Thì Quá khứ đơn (Past Simple) nhớ thêm đuôi -ed hoặc học thuộc bảng động từ bất quy tắc nha! 🕰️",
        "Bạn đã nắm vững nhiều cấu trúc ngữ pháp rồi đấy, hãy thử sức với các bài tập vận dụng cao nhé! 🎓",
        "Kỹ năng nghe và phát âm của bạn đang tiến bộ vượt bậc! Tự tin lên nhé! 🎧",
        "Chỉ còn 35 củ Cà rốt nữa thôi, vinh quang Capybara Thông Thái đang chờ đón chúng mình! 🎋"
      ],
      4: [
        "Cấu trúc so sánh hơn và so sánh nhất: tính từ ngắn thêm -er/-est, tính từ dài dùng more/most nhé bạn hiền! ⚖️",
        "Sắp chạm tới đỉnh cao Bậc Thầy rồi! Bạn là một trong những học sinh chăm chỉ và xuất sắc nhất! 🌟",
        "Hãy chú ý các 'bẫy' ngữ pháp trong đề thi: mạo từ a/an/the, giới từ chỉ thời gian in/on/at! 🔍",
        "50 củ Cà rốt cuối cùng để mở khóa Vương Miện Bậc Thầy và toàn bộ đặc quyền tối thượng! 👑"
      ],
      5: [
        "👑 Xin chào Bậc Thầy ENGO! Bạn đã mở khóa toàn bộ đặc quyền Hoàng Gia và nhân 1.5 lần XP vĩnh viễn! ✨",
        "Đỉnh cao ngữ pháp và phát âm! Bạn hoàn toàn đủ tự tin để đạt điểm 9-10 trong kỳ thi sắp tới! 💯",
        "Phong độ là nhất thời, đẳng cấp Bậc Thầy là mãi mãi! Hãy tiếp tục duy trì hào quang rực rỡ nhé! 🏆",
        "Kiến thức của bạn giờ đã vững như bàn thạch! Cùng mình truyền cảm hứng cho các bạn khác nào! 🦫🌟"
      ]
    };

    function getCapybaraProgress(fedCarrots = 0){
      let remaining = Number(fedCarrots) || 0;
      if (remaining < 10) {
        // Level 1 -> 2: Cần 10 cà rốt
        const percent = Math.min(100, Math.round((remaining / 10) * 100));
        return { lv: 1, name: "Capybara Mầm Non", currentInLevel: remaining, neededForNext: 10, percent, nextName: "Capybara Chăm Chỉ", isMax: false };
      }
      remaining -= 10;
      if (remaining < 20) {
        // Level 2 -> 3: Cần 20 cà rốt
        const percent = Math.min(100, Math.round((remaining / 20) * 100));
        return { lv: 2, name: "Capybara Chăm Chỉ", currentInLevel: remaining, neededForNext: 20, percent, nextName: "Capybara Học Giả", isMax: false };
      }
      remaining -= 20;
      if (remaining < 35) {
        // Level 3 -> 4: Cần 35 cà rốt
        const percent = Math.min(100, Math.round((remaining / 35) * 100));
        return { lv: 3, name: "Capybara Học Giả", currentInLevel: remaining, neededForNext: 35, percent, nextName: "Capybara Thông Thái", isMax: false };
      }
      remaining -= 35;
      if (remaining < 50) {
        // Level 4 -> 5: Cần 50 cà rốt
        const percent = Math.min(100, Math.round((remaining / 50) * 100));
        return { lv: 4, name: "Capybara Thông Thái", currentInLevel: remaining, neededForNext: 50, percent, nextName: "Capybara Bậc Thầy", isMax: false };
      }
      // Level 5: MAX LEVEL (115+ Cà rốt)
      return { lv: 5, name: "Capybara Bậc Thầy", currentInLevel: remaining, neededForNext: 0, percent: 100, nextName: "", isMax: true };
    }

    function getXPMultiplier(){
      const stats = getLearningStats();
      const progress = getCapybaraProgress(stats.fedCarrots || 0);
      return progress.isMax ? 1.5 : 1.0;
    }

    function getCapybaraLevelInfo(points){
      const stats = getLearningStats();
      return getCapybaraProgress(stats.fedCarrots || 0);
    }

    function getVietnameseVoice() {
      if (!('speechSynthesis' in window)) return null;
      const voices = window.speechSynthesis.getVoices();
      // Ưu tiên voice tiếng Việt tự nhiên/trẻ trung
      const viVoice = voices.find(v => (v.lang === "vi-VN" || v.lang.startsWith("vi")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("HoaiMy") || v.name.includes("Online")));
      if (viVoice) return viVoice;
      return voices.find(v => v.lang === "vi-VN" || v.lang.startsWith("vi")) || null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Voice list ready
      };
    }

    let currentCapyAudio = null;

    function capybaraSpeak(text) {
      if (currentCapyAudio) {
        try {
          currentCapyAudio.pause();
          currentCapyAudio.currentTime = 0;
        } catch(e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Làm sạch text (bỏ emoji và dấu ngoặc để đọc tự nhiên)
      const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '')
                            .replace(/[()]/g, ' ')
                            .trim();
      if (!cleanText) return;

      // Sử dụng giọng đọc AI Tiếng Việt chuẩn chất lượng cao
      const audioUrl = `/api/tts?lang=vi&text=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(audioUrl);
      currentCapyAudio = audio;

      audio.play().catch(err => {
        // Fallback sang Web Speech API nếu offline hoặc bị chặn autoplay
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.05;
        utterance.pitch = 1.25;
        const viVoice = getVietnameseVoice();
        if (viVoice) utterance.voice = viVoice;
        window.speechSynthesis.speak(utterance);
      });
    }

    function renderCapybaraCompanion(){
      const stats = getLearningStats();
      const progress = getCapybaraProgress(stats.fedCarrots || 0);
      
      const badgeLvEl = document.getElementById("capybaraBadgeLv");
      const subtitleEl = document.getElementById("capybaraSubtitle");
      const carrotEl = document.getElementById("capybaraCarrotCount");
      const streakEl = document.getElementById("capybaraStreakCount");

      if(badgeLvEl) badgeLvEl.textContent = `Lv.${progress.lv}`;
      if(subtitleEl) subtitleEl.textContent = `Cấp độ ${progress.lv}: ${progress.name}`;
      if(carrotEl) carrotEl.innerHTML = `🥕 <strong>${stats.carrots || 0}</strong> Cà rốt`;
      if(streakEl) streakEl.innerHTML = `🔥 <strong>${stats.streak || 1}</strong> ngày streak`;

      // Cập nhật Thanh Tiến Trình Cấp Độ
      const nextLabelEl = document.getElementById("capybaraLevelNextLabel");
      const percentEl = document.getElementById("capybaraLevelPercent");
      const fillEl = document.getElementById("capybaraLevelProgressFill");
      const hintEl = document.getElementById("capybaraLevelHint");

      if(nextLabelEl){
        if(progress.isMax){
          nextLabelEl.innerHTML = `👑 <strong>Đã đạt cấp độ Bậc Thầy cao nhất!</strong>`;
        } else {
          nextLabelEl.innerHTML = `Tiến hóa lên Lv.${progress.lv + 1} (${progress.nextName}): <strong>${progress.currentInLevel} / ${progress.neededForNext} 🥕</strong>`;
        }
      }
      if(percentEl) percentEl.textContent = `${progress.percent}%`;
      if(fillEl) fillEl.style.width = `${progress.percent}%`;
      if(hintEl){
        if(progress.isMax){
          hintEl.textContent = "Bạn và Capybara đã chinh phục đỉnh cao ngữ pháp toàn trường! ✨";
        } else {
          hintEl.textContent = `Cần thêm ${progress.neededForNext - progress.currentInLevel} Cà rốt để tiến hóa cấp tiếp theo (càng lên cao càng cần nhiều Cà rốt)`;
        }
      }

      // Kích hoạt giao diện & đặc quyền Cấp 5 (Capybara Bậc Thầy)
      const companionCard = document.getElementById("capybaraCompanionCard");
      const masterPerksEl = document.getElementById("capybaraMasterPerks");
      if(companionCard){
        companionCard.classList.toggle("capybara-master-tier", Boolean(progress.isMax));
      }
      if(masterPerksEl){
        masterPerksEl.style.display = progress.isMax ? "block" : "none";
      }

      // Cập nhật nút cho ăn Cà rốt
      const feedBtn = document.getElementById("feedCapybaraBtn");
      if(feedBtn){
        const currentCarrots = stats.carrots || 0;
        if(currentCarrots >= 5){
          feedBtn.textContent = "🥕 Cho ăn Cà rốt (-5 🥕)";
          feedBtn.title = "Cho Capybara ăn 5 củ cà rốt để nhận XP";
        } else if(currentCarrots > 0){
          feedBtn.textContent = `🥕 Cho ăn Cà rốt (-${currentCarrots} 🥕)`;
          feedBtn.title = `Cho Capybara ăn ${currentCarrots} củ cà rốt để nhận XP`;
        } else {
          feedBtn.textContent = "🥕 Hết Cà rốt (Luyện tập để kiếm)";
          feedBtn.title = "Hãy làm bài tập hoặc luyện nói AI để kiếm thêm Cà rốt";
        }
      }

      // Đồng bộ badge ở Speaking lab
      const spkCarrot = document.getElementById("speakingCarrotBadge");
      if(spkCarrot) spkCarrot.textContent = `🥕 ${stats.carrots || 0} Cà rốt`;
      const spkScore = document.getElementById("speakingScoreBadge");
      if(spkScore) spkScore.textContent = `★ Điểm cao nhất: ${stats.bestSpeakingScore || 0}%`;
    }

    const talkCapyBtn = document.getElementById("talkToCapybaraBtn");
    if(talkCapyBtn){
      talkCapyBtn.addEventListener("click", () => {
        const stats = getLearningStats();
        const progress = getCapybaraProgress(stats.fedCarrots || 0);
        const levelQuotes = capybaraQuotesByLevel[progress.lv] || capybaraQuotesByLevel[1];
        const randomQuote = levelQuotes[Math.floor(Math.random() * levelQuotes.length)];
        const msgEl = document.getElementById("capybaraMessage");
        if(msgEl) msgEl.textContent = `"${randomQuote}"`;
        capybaraSpeak(randomQuote);
        showToast(`🦫 Capybara (Lv.${progress.lv}) đang trò chuyện cùng bạn!`);
      });
    }

    const feedCapyBtn = document.getElementById("feedCapybaraBtn");
    if(feedCapyBtn){
      feedCapyBtn.addEventListener("click", () => {
        const stats = getLearningStats();
        const currentCarrots = stats.carrots || 0;
        if(currentCarrots <= 0){
          showToast("🥕 Bạn đã hết Cà rốt! Hãy luyện nói AI hoặc làm bài kiểm tra để kiếm thêm Cà rốt nhé!");
          return;
        }

        const feedAmount = Math.min(5, currentCarrots);
        const oldProgress = getCapybaraProgress(stats.fedCarrots || 0);
        const xpEarned = Math.round(feedAmount * 5 * (oldProgress.isMax ? 1.5 : 1.0));

        stats.carrots -= feedAmount;
        stats.fedCarrots = (stats.fedCarrots || 0) + feedAmount;
        stats.points = (stats.points || 0) + xpEarned;

        const newProgress = getCapybaraProgress(stats.fedCarrots);
        updateStudyStreak(stats);
        setLearningStats(stats);
        renderLearningFeatures();

        if(newProgress.lv > oldProgress.lv){
          playSuccessSound();
          showToast(`🎉 CHÚC MỪNG! Capybara đã thăng cấp lên Lv.${newProgress.lv} ${newProgress.name}!`);
          capybaraSpeak(`Chúc mừng bạn nhé! Nhờ sự chăm chỉ của bạn mà mình đã tiến hóa lên cấp ${newProgress.lv} ${newProgress.name} rồi! Cố gắng học tốt nha!`);
        } else {
          playClickSound();
          showToast(`🥕 Yum yum! Đã cho Capybara ăn ${feedAmount} củ Cà rốt (+${xpEarned} XP)!`);
          capybaraSpeak("Cảm ơn bạn nhé! Cà rốt ngon tuyệt vời. Cố gắng học tốt nha!");
        }
      });
    }


    // ============================================================
    // MODULE 3: PHÒNG LUYỆN NÓI & PHÁT ÂM AI (AI SPEAKING LAB)
    // ============================================================
    const speakingDatabase = {
      grammar: [
        {
          type: "Present Simple",
          text: "She usually walks to school every morning.",
          ipa: "/ʃi ˈjuːʒuəli wɔːks tu skuːl ˈɛvri ˈmɔːnɪŋ/",
          meaning: "Cô ấy thường đi bộ đến trường mỗi buổi sáng."
        },
        {
          type: "Past Simple",
          text: "They visited Ha Long Bay last summer vacation.",
          ipa: "/ðeɪ ˈvɪzɪtɪd hɑː lɒŋ beɪ lɑːst ˈsʌmər vəˈkeɪʃən/",
          meaning: "Họ đã đi thăm vịnh Hạ Long vào kỳ nghỉ hè năm ngoái."
        },
        {
          type: "Present Simple (Question)",
          text: "Do you play badminton with your friends on weekends?",
          ipa: "/duː juː pleɪ ˈbædmɪntən wɪð jɔːr frɛndz ɒn ˈwiːkˌɛndz/",
          meaning: "Bạn có chơi cầu lông với bạn bè vào cuối tuần không?"
        },
        {
          type: "Past Simple (Irregular)",
          text: "I bought a new English dictionary yesterday.",
          ipa: "/aɪ bɔːt ə njuː ˈɪŋɡlɪʃ ˈdɪkʃənəri ˈjɛstədeɪ/",
          meaning: "Hôm qua tôi đã mua một quyển từ điển tiếng Anh mới."
        },
        {
          type: "Present Continuous",
          text: "We are preparing for our English mid-term test right now.",
          ipa: "/wiː ɑːr prɪˈpeərɪŋ fɔːr ˈaʊər ˈɪŋɡlɪʃ mɪd-tɜːm tɛst raɪt naʊ/",
          meaning: "Chúng tôi đang chuẩn bị cho bài kiểm tra giữa kỳ tiếng Anh ngay bây giờ."
        }
      ],
      daily: [
        {
          type: "Greeting & Small Talk",
          text: "Good morning teacher, how was your weekend?",
          ipa: "/ɡʊd ˈmɔːnɪŋ ˈtiːtʃər haʊ wɒz jɔːr ˈwiːkˌɛnd/",
          meaning: "Chào buổi sáng thầy cô! Cuối tuần của thầy cô thế nào ạ?"
        },
        {
          type: "Asking for Help",
          text: "Could you please explain this grammar rule again?",
          ipa: "/kʊd juː pliːz ɪkˈspleɪn ðɪs ˈɡræmər ruːl əˈɡɛn/",
          meaning: "Thầy cô có thể giải thích lại quy tắc ngữ pháp này giúp em được không ạ?"
        },
        {
          type: "Expressing Opinion",
          text: "In my opinion, learning English opens many great opportunities.",
          ipa: "/ɪn maɪ əˈpɪnjən ˈlɜːnɪŋ ˈɪŋɡlɪʃ ˈəʊpənz ˈmɛni ɡreɪt ˌɒpəˈtjuːnɪtiz/",
          meaning: "Theo ý kiến của tôi, học tiếng Anh mở ra nhiều cơ hội tuyệt vời."
        },
        {
          type: "Teamwork",
          text: "Let us work together to finish our science project on time.",
          ipa: "/lɛt ʌs wɜːk təˈɡɛðər tuː ˈfɪnɪʃ ˈaʊər ˈsaɪəns ˈprɒdʒɛkt ɒn taɪm/",
          meaning: "Chúng ta hãy cùng nhau làm việc để hoàn thành dự án khoa học đúng hạn."
        },
        {
          type: "Encouragement",
          text: "Practice makes perfect, so never give up on your dreams.",
          ipa: "/ˈpræktɪs meɪks ˈpɜːfɪkt səʊ ˈnɛvər ɡɪv ʌp ɒn jɔːr driːmz/",
          meaning: "Có công mài sắt có ngày nên kim, đừng bao giờ từ bỏ ước mơ của bạn."
        }
      ],
      unit: [
        {
          type: "Unit 1: Local Environment",
          text: "Bat Trang is one of the most famous traditional craft villages in Viet Nam.",
          ipa: "/bɑːt trɑːŋ ɪz wʌn ɒv ðə məʊst ˈfeɪməs trəˈdɪʃənl krɑːft ˈvɪlɪdʒɪz ɪn vjɛt nɑːm/",
          meaning: "Bát Tràng là một trong những làng nghề thủ công truyền thống nổi tiếng nhất ở Việt Nam."
        },
        {
          type: "Unit 1: Handcrafted Products",
          text: "Artisans in this village carve beautiful wooden souvenirs by hand.",
          ipa: "/ˈɑːtɪzænz ɪn ðɪs ˈvɪlɪdʒ kɑːv ˈbjuːtəfʊl ˈwʊdn ˌsuːvəˈnɪəz baɪ hænd/",
          meaning: "Những nghệ nhân ở ngôi làng này chạm khắc những món quà lưu niệm bằng gỗ rất đẹp bằng tay."
        },
        {
          type: "Unit 2: City Life",
          text: "Living in a big city offers convenient public transport and modern facilities.",
          ipa: "/ˈlɪvɪŋ ɪn ə bɪɡ ˈsɪti ˈɒfəz kənˈviːniənt ˈpʌblɪk ˈtrænspɔːt ænd ˈmɒdən fəˈsɪlɪtiz/",
          meaning: "Sống ở một thành phố lớn mang lại giao thông công cộng thuận tiện và cơ sở vật chất hiện đại."
        },
        {
          type: "Unit 2: City Challenges",
          text: "The local government is trying to reduce air pollution and traffic congestion.",
          ipa: "/ðə ˈləʊkl ˈɡʌvnmənt ɪz ˈtraɪɪŋ tuː rɪˈdjuːs eə pəˈluːʃn ænd ˈtræfɪk kənˈdʒɛstʃən/",
          meaning: "Chính quyền địa phương đang nỗ lực giảm ô nhiễm không khí và ùn tắc giao thông."
        }
      ],
      teacher: []
    };

    // ==========================================
    // AI IPA & TRANSLATION ENGINE FOR SPEAKING
    // ==========================================
    const englishIpaDict = {
      "do": "duː", "does": "dʌz", "did": "dɪd", "you": "juː", "play": "pleɪ", "plays": "pleɪz", "played": "pleɪd",
      "badminton": "ˈbædmɪntən", "football": "ˈfʊtbɔːl", "volleyball": "ˈvɒlibɔːl", "tennis": "ˈtɛnɪs", "basketball": "ˈbɑːskɪtbɔːl",
      "with": "wɪð", "your": "jɔːr", "my": "maɪ", "his": "hɪz", "her": "hɜːr", "their": "ðeər", "our": "ˈaʊər",
      "friend": "frɛnd", "friends": "frɛndz", "family": "ˈfæmɪli", "parents": "ˈpeərənts", "teacher": "ˈtiːtʃər",
      "on": "ɒn", "in": "ɪn", "at": "æt", "to": "tuː", "for": "fɔːr", "of": "ɒv", "about": "əˈbaʊt",
      "weekend": "ˈwiːkˌɛnd", "weekends": "ˈwiːkˌɛndz", "morning": "ˈmɔːnɪŋ", "afternoon": "ˌɑːftəˈnuːn", "evening": "ˈiːvnɪŋ", "night": "naɪt",
      "sunday": "ˈsʌndeɪ", "monday": "ˈmʌndeɪ", "tuesday": "ˈtjuːzdeɪ", "wednesday": "ˈwɛnzdeɪ", "thursday": "ˈθɜːzdeɪ", "friday": "ˈfraɪdeɪ", "saturday": "ˈsætədeɪ",
      "she": "ʃi", "he": "hi", "they": "ðeɪ", "we": "wi", "i": "aɪ", "it": "ɪt",
      "usually": "ˈjuːʒuəli", "always": "ˈɔːlweɪz", "often": "ˈɒfn", "sometimes": "ˈsʌmtaɪmz", "never": "ˈnɛvər", "seldom": "ˈsɛldəm",
      "walk": "wɔːk", "walks": "wɔːks", "walked": "wɔːkt", "go": "ɡəʊ", "goes": "ɡəʊz", "went": "wɛnt", "school": "skuːl",
      "every": "ˈɛvri", "day": "deɪ", "today": "təˈdeɪ", "yesterday": "ˈjɛstədeɪ", "tomorrow": "təˈmɒrəʊ",
      "read": "riːd", "reads": "riːdz", "book": "bʊk", "books": "bʊks", "listen": "ˈlɪsn", "music": "ˈmjuːzɪk",
      "study": "ˈstʌdi", "english": "ˈɪŋɡlɪʃ", "vietnamese": "ˌvjɛtnəˈmiːz", "math": "mæθ", "science": "ˈsaɪəns",
      "like": "laɪk", "likes": "laɪks", "love": "lʌv", "enjoy": "ɪnˈdʒɔɪ", "prefer": "prɪˈfɜːr",
      "eat": "iːt", "drink": "drɪŋk", "water": "ˈwɔːtər", "breakfast": "ˈbrɛkfəst", "lunch": "lʌntʃ", "dinner": "ˈdɪnər",
      "what": "wɒt", "where": "weər", "when": "wɛn", "why": "waɪ", "how": "haʊ", "who": "huː",
      "can": "kæn", "could": "kʊd", "will": "wɪl", "would": "wʊd", "should": "ʃʊd", "must": "mʌst",
      "is": "ɪz", "are": "ɑːr", "am": "æm", "was": "wɒz", "were": "wɜːr", "have": "hæv", "has": "hæz", "had": "hæd",
      "the": "ðə", "a": "ə", "an": "æn", "this": "ðɪs", "that": "ðæt", "these": "ðiːz", "those": "ðəʊz",
      "very": "ˈvɛri", "good": "ɡʊd", "well": "wɛl", "beautiful": "ˈbjuːtəfʊl", "important": "ɪmˈpɔːtənt"
    };

    function generateIpaTranscription(sentence) {
      if (!sentence || !sentence.trim()) return "";
      const tokens = sentence.trim().split(/\s+/);
      const ipaTokens = tokens.map(token => {
        const clean = token.toLowerCase().replace(/[^a-z0-9']/g, "");
        if (englishIpaDict[clean]) return englishIpaDict[clean];
        return clean;
      });
      return "/" + ipaTokens.join(" ") + "/";
    }

    function generateAutoTranslation(sentence) {
      if (!sentence || !sentence.trim()) return "";
      const s = sentence.trim().toLowerCase().replace(/[?!.,]/g, "");
      if (s === "do you play badminton with your friends on weekends") {
        return "Bạn có chơi cầu lông với bạn bè vào cuối tuần không?";
      }
      if (s.includes("badminton") && s.includes("weekends")) {
        return "Bạn có chơi cầu lông vào những ngày cuối tuần không?";
      }
      if (s.startsWith("she usually walks to school")) {
        return "Cô ấy thường đi bộ đến trường mỗi buổi sáng.";
      }
      if (s.startsWith("what do you usually do")) {
        return "Bạn thường làm gì vào thời gian rảnh?";
      }
      if (s.startsWith("how do you go to school")) {
        return "Bạn đến trường bằng phương tiện gì?";
      }
      return "Bản dịch gợi ý: " + sentence.trim();
    }

    let currentSpeakingTopic = "grammar";
    let currentSpeakingIndex = 0;
    let speechRecognitionInstance = null;
    let isSpeakingRecording = false;
    let accumulatedTranscript = "";
    let lastSpeakingEvaluation = null;

    function stopSpeakingRecording(shouldGrade = false){
      if(isSpeakingRecording && speechRecognitionInstance){
        if(shouldGrade){
          try{ speechRecognitionInstance.stop(); }catch(e){}
        } else {
          try{ speechRecognitionInstance.abort(); }catch(e){}
          accumulatedTranscript = "";
        }
      }
      isSpeakingRecording = false;
      const micBtn = document.getElementById("speakingMicBtn");
      const micLabel = document.getElementById("speakingMicLabel");
      const micIcon = document.getElementById("speakingMicIcon");
      const waveEl = document.getElementById("speakingWave");
      if(micBtn) micBtn.classList.remove("recording");
      if(micLabel) micLabel.textContent = "Bắt đầu nói";
      if(micIcon) micIcon.textContent = "🎙️";
      if(waveEl) waveEl.classList.add("hidden");
    }

    function speakEnglishText(text){
      if (!('speechSynthesis' in window)){
        showToast("Trình duyệt không hỗ trợ phát âm!");
        return;
      }
      stopSpeakingRecording(false);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("US")));
      if(enVoice) utterance.voice = enVoice;

      const playAudioBtn = document.getElementById("speakingPlayAudioBtn");
      const micBtn = document.getElementById("speakingMicBtn");

      if(playAudioBtn){
        playAudioBtn.disabled = true;
        playAudioBtn.innerHTML = "Đang phát mẫu...";
      }
      if(micBtn){
        micBtn.disabled = true;
      }

      const resetAudioState = () => {
        if(playAudioBtn){
          playAudioBtn.disabled = false;
          playAudioBtn.innerHTML = "Nghe phát âm mẫu";
        }
        if(micBtn){
          micBtn.disabled = false;
        }
      };

      utterance.onend = resetAudioState;
      utterance.onerror = resetAudioState;
      window.speechSynthesis.speak(utterance);
    }

    function cleanWordToken(w){
      return w.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function evaluateSpeechAccuracy(targetSentence, spokenTranscript){
      const targetWords = targetSentence.split(/\s+/);
      const spokenCleanWords = spokenTranscript.split(/\s+/).map(cleanWordToken).filter(Boolean);

      let correctMatches = 0;
      const wordBreakdown = targetWords.map(origWord => {
        const cleaned = cleanWordToken(origWord);
        const isMatch = spokenCleanWords.includes(cleaned);
        if(isMatch) correctMatches++;
        return { word: origWord, correct: isMatch };
      });

      const accuracy = Math.round((correctMatches / Math.max(1, targetWords.length)) * 100);
      return { accuracy: Math.min(100, accuracy), breakdown: wordBreakdown };
    }

    function renderSpeakingCard(){
      stopSpeakingRecording(false);
      if('speechSynthesis' in window) window.speechSynthesis.cancel();

      const list = speakingDatabase[currentSpeakingTopic] || speakingDatabase.grammar;
      const tagEl = document.getElementById("speakingTopicTag");
      const counterEl = document.getElementById("speakingCounter");
      const targetEl = document.getElementById("speakingTargetText");
      const ipaEl = document.getElementById("speakingIpa");
      const meaningEl = document.getElementById("speakingMeaning");
      const resultBox = document.getElementById("speakingResultBox");
      const waveEl = document.getElementById("speakingWave");
      const submitTeacherBtn = document.getElementById("btnSubmitSpeakingToTeacher");

      if(submitTeacherBtn) submitTeacherBtn.style.display = "none";
      if(resultBox) resultBox.classList.add("hidden");
      if(waveEl) waveEl.classList.add("hidden");

      if(currentSpeakingTopic === "teacher" && (!list || list.length === 0)){
        if(tagEl) tagEl.textContent = "Bài giáo viên";
        if(counterEl) counterEl.textContent = "0 / 0";
        if(targetEl) targetEl.textContent = "Chưa có bài tập Speaking nào do Giáo viên giao.";
        if(ipaEl) ipaEl.textContent = "/- - -/";
        if(meaningEl) meaningEl.textContent = "Hãy chờ giáo viên tạo câu luyện nói mới nhé!";
        return;
      }

      if(currentSpeakingIndex >= list.length) currentSpeakingIndex = 0;
      if(currentSpeakingIndex < 0) currentSpeakingIndex = list.length - 1;
      const item = list[currentSpeakingIndex];
      if(!item) return;

      if(tagEl) tagEl.textContent = item.type;
      if(counterEl) counterEl.textContent = `Câu ${currentSpeakingIndex + 1} / ${list.length}`;
      if(targetEl) targetEl.textContent = item.text;
      if(ipaEl) ipaEl.textContent = item.ipa || generateIpaTranscription(item.text);
      if(meaningEl) meaningEl.textContent = `"${item.meaning || ''}"`;

      const playAudioBtn = document.getElementById("speakingPlayAudioBtn");
      if(playAudioBtn){
        playAudioBtn.disabled = false;
        playAudioBtn.innerHTML = "Nghe phát âm mẫu";
      }
      const micBtn = document.getElementById("speakingMicBtn");
      if(micBtn) micBtn.disabled = false;
    }

    function renderSpeakingLab(){
      loadStudentSpeakingAssignments();
      renderSpeakingCard();
    }

    // Play Target Audio
    const playAudioBtn = document.getElementById("speakingPlayAudioBtn");
    if(playAudioBtn){
      playAudioBtn.addEventListener("click", () => {
        const list = speakingDatabase[currentSpeakingTopic] || speakingDatabase.grammar;
        const item = list[currentSpeakingIndex];
        if(item && item.text) speakEnglishText(item.text);
      });
    }

    // Prev / Next Navigation
    const prevSpkBtn = document.getElementById("speakingPrevBtn");
    if(prevSpkBtn){
      prevSpkBtn.addEventListener("click", () => {
        currentSpeakingIndex--;
        renderSpeakingCard();
      });
    }
    const nextSpkBtn = document.getElementById("speakingNextBtn");
    if(nextSpkBtn){
      nextSpkBtn.addEventListener("click", () => {
        currentSpeakingIndex++;
        renderSpeakingCard();
      });
    }

    // Topic tabs
    document.querySelectorAll(".speaking-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".speaking-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentSpeakingTopic = tab.dataset.topic;
        currentSpeakingIndex = 0;
        renderSpeakingCard();
      });
    });

    async function loadStudentSpeakingAssignments(){
      try {
        const res = await apiRequest("/api/speaking/assignments");
        if(res && res.assignments){
          speakingDatabase.teacher = res.assignments.map(a => ({
            id: a.id,
            type: `${a.title}${a.class_name ? ` (${a.class_name})` : ' (Toàn khối)'}`,
            text: a.sentence,
            ipa: a.ipa || generateIpaTranscription(a.sentence),
            meaning: a.translation || '',
            isTeacherTask: true,
            submittedAccuracy: a.student_accuracy
          }));
          const badge = document.getElementById("teacherSpeakingCountBadge");
          if(badge) badge.textContent = speakingDatabase.teacher.length;
          if(currentSpeakingTopic === "teacher") renderSpeakingCard();
        }
      } catch (e) {
        console.warn("Không thể tải bài tập Speaking:", e);
      }
    }

    function finishAndEvaluateSpeaking(){
      const transcript = accumulatedTranscript.trim();
      if(!transcript){
        showToast("Chưa thu được giọng đọc. Hãy bấm 'Bắt đầu nói' và đọc to câu mẫu nhé!");
        return;
      }

      const list = speakingDatabase[currentSpeakingTopic] || speakingDatabase.grammar;
      const targetItem = list[currentSpeakingIndex];
      if(!targetItem || !targetItem.text) return;

      const evaluation = evaluateSpeechAccuracy(targetItem.text, transcript);
      lastSpeakingEvaluation = { ...evaluation, transcript, targetItem };

      // Update UI
      const resultBox = document.getElementById("speakingResultBox");
      const percentEl = document.getElementById("speakingScorePercent");
      const verdictEl = document.getElementById("speakingVerdict");
      const feedbackEl = document.getElementById("speakingFeedback");
      const transcriptEl = document.getElementById("speakingTranscript");
      const wordPillsEl = document.getElementById("speakingWordPills");
      const coachBubble = document.getElementById("capybaraCoachBubble");
      const scoreCircle = document.getElementById("speakingScoreCircle");
      const submitTeacherBtn = document.getElementById("btnSubmitSpeakingToTeacher");

      if(percentEl) percentEl.textContent = `${evaluation.accuracy}%`;
      if(transcriptEl) transcriptEl.textContent = `"${transcript}"`;

      if(wordPillsEl){
        wordPillsEl.innerHTML = evaluation.breakdown.map(b => 
          `<span class="word-pill ${b.correct ? 'correct' : 'missed'}">${b.correct ? '✓' : '✕'} ${b.word}</span>`
        ).join("");
      }

      // If this is a teacher-assigned task, show submit button
      if(submitTeacherBtn){
        if(targetItem.isTeacherTask){
          submitTeacherBtn.style.display = "block";
          submitTeacherBtn.textContent = `Nộp bài Speaking cho Giáo viên (${evaluation.accuracy}%) →`;
        } else {
          submitTeacherBtn.style.display = "none";
        }
      }

      // Save Stats & Reward
      const stats = getLearningStats();
      stats.speakingAttempts = (stats.speakingAttempts || 0) + 1;
      stats.bestSpeakingScore = Math.max(stats.bestSpeakingScore || 0, evaluation.accuracy);

      if(evaluation.accuracy >= 90){
        playSuccessSound();
        if(verdictEl) verdictEl.textContent = "Xuất sắc! Phát âm rất chuẩn";
        if(feedbackEl) feedbackEl.textContent = "Tuyệt vời! Bạn phát âm trôi chảy như người bản xứ. Thưởng +15 XP & +2 Cà rốt 🥕";
        if(scoreCircle) scoreCircle.style.borderColor = "#22c55e";
        if(coachBubble) coachBubble.textContent = "Quá đỉnh luôn bạn ơi! Phát âm chuẩn 100%. Nhận 2 củ cà rốt nhé! 🦫🎉";
        stats.points = (stats.points || 0) + 15;
        stats.carrots = (stats.carrots || 0) + 2;
        showToast("Phát âm xuất sắc: +15 XP, +2 Cà rốt 🥕!");
      } else if(evaluation.accuracy >= 70){
        playSuccessSound();
        if(verdictEl) verdictEl.textContent = "Khá tốt! Đạt yêu cầu";
        if(feedbackEl) feedbackEl.textContent = "Bạn đã đọc đúng hầu hết các từ. Chú ý các từ màu đỏ để cải thiện thêm nhé. Thưởng +10 XP & +1 Cà rốt 🥕";
        if(scoreCircle) scoreCircle.style.borderColor = "#f59e0b";
        if(coachBubble) coachBubble.textContent = "Khá lắm! Cố gắng luyện thêm âm đuôi là chuẩn không cần chỉnh nè! 🦫💪";
        stats.points = (stats.points || 0) + 10;
        stats.carrots = (stats.carrots || 0) + 1;
        showToast("Phát âm khá tốt: +10 XP, +1 Cà rốt 🥕!");
      } else {
        playWrongSound();
        if(verdictEl) verdictEl.textContent = "Cần cố gắng thêm!";
        if(feedbackEl) feedbackEl.textContent = "Hãy bấm 'Nghe phát âm mẫu' vài lần rồi đọc lại to và rõ ràng hơn nhé. Thưởng +5 XP khích lệ.";
        if(scoreCircle) scoreCircle.style.borderColor = "#ef4444";
        if(coachBubble) coachBubble.textContent = "Đừng nản lòng nha! Bấm nghe lại câu mẫu rồi thử đọc lại cùng mình nào! 🦫✨";
        stats.points = (stats.points || 0) + 5;
        showToast("Đã ghi nhận lượt đọc: +5 XP!");
      }

      updateStudyStreak(stats);
      setLearningStats(stats);
      renderLearningFeatures();

      if(resultBox) resultBox.classList.remove("hidden");
    }

    // Submit Speaking Score to Teacher handler
    document.getElementById("btnSubmitSpeakingToTeacher")?.addEventListener("click", async () => {
      if(!lastSpeakingEvaluation || !lastSpeakingEvaluation.targetItem || !lastSpeakingEvaluation.targetItem.id){
        showToast("Chưa có kết quả bài đọc để nộp!");
        return;
      }
      try {
        const btn = document.getElementById("btnSubmitSpeakingToTeacher");
        if(btn) { btn.disabled = true; btn.textContent = "Đang nộp bài..."; }
        const res = await apiRequest("/api/student/speaking-submissions", {
          method: "POST",
          body: JSON.stringify({
            assignmentId: lastSpeakingEvaluation.targetItem.id,
            accuracyPercent: lastSpeakingEvaluation.accuracy,
            spokenTranscript: lastSpeakingEvaluation.transcript
          })
        });
        showToast(res.message || "Đã nộp bài Speaking thành công cho giáo viên!");
        if(btn) { btn.disabled = false; btn.textContent = "Đã nộp bài cho Giáo viên!"; }
      } catch (e) {
        showToast(e.message || "Lỗi khi nộp bài Speaking!");
        const btn = document.getElementById("btnSubmitSpeakingToTeacher");
        if(btn) { btn.disabled = false; btn.textContent = "Thử nộp lại →"; }
      }
    });

    // Web Speech Recognition Handler
    const micBtn = document.getElementById("speakingMicBtn");
    if(micBtn){
      micBtn.addEventListener("click", () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SpeechRec){
          showToast("Trình duyệt của bạn không hỗ trợ Web Speech Recognition! Vui lòng dùng Chrome hoặc Edge.");
          return;
        }

        if(isSpeakingRecording){
          stopSpeakingRecording(true);
          return;
        }

        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          const playAudioBtn = document.getElementById("speakingPlayAudioBtn");
          if(playAudioBtn){
            playAudioBtn.disabled = false;
            playAudioBtn.innerHTML = "Nghe phát âm mẫu";
          }
        }

        const resultBox = document.getElementById("speakingResultBox");
        if(resultBox) resultBox.classList.add("hidden");

        accumulatedTranscript = "";
        speechRecognitionInstance = new SpeechRec();
        speechRecognitionInstance.lang = "en-US";
        speechRecognitionInstance.continuous = true;
        speechRecognitionInstance.interimResults = true;
        speechRecognitionInstance.maxAlternatives = 1;

        speechRecognitionInstance.onstart = () => {
          isSpeakingRecording = true;
          const micLabel = document.getElementById("speakingMicLabel");
          const micIcon = document.getElementById("speakingMicIcon");
          const waveEl = document.getElementById("speakingWave");
          const liveText = document.getElementById("speakingLiveText");

          micBtn.classList.add("recording");
          if(micLabel) micLabel.textContent = "Hoàn thành & Chấm điểm";
          if(micIcon) micIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
          if(waveEl) waveEl.classList.remove("hidden");
          if(liveText) liveText.textContent = "Đang lắng nghe... Hãy đọc toàn bộ câu mẫu trên!";
        };

        speechRecognitionInstance.onresult = (event) => {
          let interim = "";
          let finalStr = "";
          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalStr += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          accumulatedTranscript = (finalStr + interim).trim();
          const liveText = document.getElementById("speakingLiveText");
          if(liveText && accumulatedTranscript) {
            liveText.textContent = `Đang nghe được: "${accumulatedTranscript}"`;
          }
        };

        speechRecognitionInstance.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          if(event.error !== "no-speech" && event.error !== "aborted"){
            showToast("Micro chưa nhận diện được âm thanh. Hãy nói to hơn nhé!");
          }
        };

        speechRecognitionInstance.onend = () => {
          isSpeakingRecording = false;
          const micLabel = document.getElementById("speakingMicLabel");
          const micIcon = document.getElementById("speakingMicIcon");
          const waveEl = document.getElementById("speakingWave");

          micBtn.classList.remove("recording");
          if(micLabel) micLabel.textContent = "Bắt đầu nói";
          if(micIcon) micIcon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
          if(waveEl) waveEl.classList.add("hidden");

          finishAndEvaluateSpeaking();
        };

        try{
          speechRecognitionInstance.start();
        }catch(e){
          console.error("Start speech recognition error:", e);
        }
      });
    }

    // ==========================================
    // TEACHER SPEAKING TASK MODAL & MANAGEMENT
    // ==========================================

    const createSpeakingTaskModal = document.getElementById("createSpeakingTaskModal");
    const openSpeakingModalBtns = [document.getElementById("createSpeakingTaskBtn"), document.getElementById("btnOpenSpeakingModalAgain")];
    const closeSpeakingModalBtns = [document.getElementById("closeSpeakingTaskModal"), document.getElementById("cancelSpeakingTaskBtn")];

    openSpeakingModalBtns.forEach(btn => {
      btn?.addEventListener("click", () => {
        createSpeakingTaskModal?.classList.remove("hidden");
      });
    });

    closeSpeakingModalBtns.forEach(btn => {
      btn?.addEventListener("click", () => {
        createSpeakingTaskModal?.classList.add("hidden");
      });
    });

    // AI Auto-generate IPA & Translation button
    document.getElementById("btnSpeakingAutoGenerate")?.addEventListener("click", () => {
      const sentence = document.getElementById("newSpeakingSentence")?.value.trim();
      if(!sentence){
        showToast("Vui lòng nhập câu tiếng Anh cần luyện nói trước!");
        return;
      }
      const generatedIpa = generateIpaTranscription(sentence);
      const generatedTranslation = generateAutoTranslation(sentence);

      const ipaInput = document.getElementById("newSpeakingIpa");
      const translationInput = document.getElementById("newSpeakingTranslation");

      if(ipaInput) ipaInput.value = generatedIpa;
      if(translationInput) translationInput.value = generatedTranslation;

      showToast("AI đã tạo phiên âm IPA và dịch nghĩa thành công!");
    });

    // Preview TTS audio button in modal
    document.getElementById("btnPreviewSpeakingTts")?.addEventListener("click", () => {
      const sentence = document.getElementById("newSpeakingSentence")?.value.trim();
      if(!sentence){
        showToast("Vui lòng nhập câu tiếng Anh trước!");
        return;
      }
      speakEnglishText(sentence);
    });

    // Form submit: Teacher creates speaking assignment
    document.getElementById("createSpeakingTaskForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("newSpeakingTitle")?.value.trim();
      const className = document.getElementById("newSpeakingClass")?.value;
      const sentence = document.getElementById("newSpeakingSentence")?.value.trim();
      const ipa = document.getElementById("newSpeakingIpa")?.value.trim();
      const translation = document.getElementById("newSpeakingTranslation")?.value.trim();

      if(!title || !sentence){
        showToast("Vui lòng điền đủ tiêu đề và câu tiếng Anh.");
        return;
      }

      try {
        const submitBtn = document.getElementById("submitSpeakingTaskBtn");
        if(submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Đang giao bài..."; }

        const res = await apiRequest("/api/teacher/speaking-assignments", {
          method: "POST",
          body: JSON.stringify({ title, className, sentence, ipa, translation })
        });

        showToast(res.message || "Đã giao bài tập Speaking thành công!");
        createSpeakingTaskModal?.classList.add("hidden");
        document.getElementById("createSpeakingTaskForm")?.reset();

        loadTeacherSpeakingTasks();
        loadTeacherSpeakingSubmissions();
        loadStudentSpeakingAssignments();
      } catch (err) {
        showToast(err.message || "Không thể giao bài tập Speaking!");
      } finally {
        const submitBtn = document.getElementById("submitSpeakingTaskBtn");
        if(submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Giao bài cho học sinh"; }
      }
    });

    // Teacher tabs: Tasks vs Submissions
    document.getElementById("tabSpeakingTasksList")?.addEventListener("click", () => {
      document.getElementById("tabSpeakingTasksList")?.classList.add("active");
      document.getElementById("tabSpeakingSubmissionsList")?.classList.remove("active");
      document.getElementById("panelSpeakingTasksList").style.display = "block";
      document.getElementById("panelSpeakingSubmissionsList").style.display = "none";
    });

    document.getElementById("tabSpeakingSubmissionsList")?.addEventListener("click", () => {
      document.getElementById("tabSpeakingSubmissionsList")?.classList.add("active");
      document.getElementById("tabSpeakingTasksList")?.classList.remove("active");
      document.getElementById("panelSpeakingTasksList").style.display = "none";
      document.getElementById("panelSpeakingSubmissionsList").style.display = "block";
      loadTeacherSpeakingSubmissions();
    });

    document.getElementById("refreshTeacherSpeakingBtn")?.addEventListener("click", () => {
      loadTeacherSpeakingTasks();
      loadTeacherSpeakingSubmissions();
      showToast("Đã làm mới dữ liệu Speaking!");
    });

    // Load Teacher Speaking Tasks
    async function loadTeacherSpeakingTasks(){
      const tbody = document.getElementById("teacherSpeakingTasksTableBody");
      if(!tbody) return;
      try {
        const res = await apiRequest("/api/speaking/assignments");
        if(!res.assignments || res.assignments.length === 0){
          tbody.innerHTML = `<tr><td colspan="8" class="small muted" style="text-align:center;padding:24px">Chưa có bài tập Speaking nào. Hãy bấm "+ Giao bài Speaking" để tạo câu mới!</td></tr>`;
          return;
        }
        tbody.innerHTML = res.assignments.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.title}</strong></td>
            <td><span class="badge ${item.class_name ? 'blue' : 'gray'}">${item.class_name || 'Toàn khối'}</span></td>
            <td>
              <div style="font-weight:600;color:#1e293b">${item.sentence}</div>
              <div class="small muted" style="color:#6366f1;font-family:monospace">${item.ipa || ''}</div>
            </td>
            <td class="small">${item.translation || '-'}</td>
            <td><span class="badge green">${item.submission_count || 0} bài</span></td>
            <td class="small muted">${new Date(item.created_at).toLocaleDateString('vi-VN')}</td>
            <td>
              <div style="display:flex;gap:6px">
                <button class="btn btn-soft btn-sm btn-spk-listen" data-text="${encodeURIComponent(item.sentence)}" title="Nghe phát âm">Nghe</button>
                <button class="btn btn-danger btn-sm btn-spk-del" data-id="${item.id}" title="Xóa bài">✕</button>
              </div>
            </td>
          </tr>
        `).join("");

        // Listen buttons
        tbody.querySelectorAll(".btn-spk-listen").forEach(btn => {
          btn.addEventListener("click", () => {
            const text = decodeURIComponent(btn.dataset.text || "");
            if(text) speakEnglishText(text);
          });
        });

        // Delete buttons
        tbody.querySelectorAll(".btn-spk-del").forEach(btn => {
          btn.addEventListener("click", async () => {
            if(!confirm("Bạn có chắc chắn muốn xóa bài tập Speaking này?")) return;
            try {
              await apiRequest(`/api/teacher/speaking-assignments/${btn.dataset.id}`, { method: "DELETE" });
              showToast("Đã xóa bài tập Speaking!");
              loadTeacherSpeakingTasks();
              loadTeacherSpeakingSubmissions();
            } catch (e) {
              showToast(e.message || "Không thể xóa bài tập!");
            }
          });
        });
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="small muted" style="text-align:center;padding:20px;color:#ef4444">Lỗi tải danh sách bài tập Speaking.</td></tr>`;
      }
    }

    // Load Teacher Speaking Submissions
    async function loadTeacherSpeakingSubmissions(){
      const tbody = document.getElementById("teacherSpeakingSubmissionsTableBody");
      if(!tbody) return;
      try {
        const res = await apiRequest("/api/teacher/speaking-submissions");
        if(!res.submissions || res.submissions.length === 0){
          tbody.innerHTML = `<tr><td colspan="7" class="small muted" style="text-align:center;padding:24px">Chưa có học sinh nào nộp bài Speaking.</td></tr>`;
          return;
        }
        tbody.innerHTML = res.submissions.map((sub, idx) => {
          const scoreClass = sub.accuracy_percent >= 80 ? 'green' : sub.accuracy_percent >= 60 ? 'yellow' : 'red';
          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${sub.student_name}</strong><div class="small muted">${sub.student_email}</div></td>
              <td><span class="badge blue">${sub.student_class || 'Lớp 9'}</span></td>
              <td>
                <div style="font-weight:600">${sub.task_title}</div>
                <div class="small muted">${sub.target_sentence}</div>
              </td>
              <td><span class="badge ${scoreClass}" style="font-weight:800;font-size:13px">${sub.accuracy_percent}%</span></td>
              <td><div class="small" style="font-style:italic;color:#3730a3">"${sub.spoken_transcript || '-'}"</div></td>
              <td class="small muted">${new Date(sub.submitted_at).toLocaleString('vi-VN')}</td>
            </tr>
          `;
        }).join("");
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="small muted" style="text-align:center;padding:20px;color:#ef4444">Lỗi tải danh sách nộp bài Speaking.</td></tr>`;
      }
    }

    // ============================================================
    // KHỞI ĐỘNG HỆ THỐNG
    // ============================================================
    // Đồng hồ tập trung
    let focusDuration=25*60,focusSeconds=focusDuration,focusInterval=null,focusModeLabel="Phiên học tập";
    function renderFocusTime(){document.getElementById("focusTime").textContent=`${String(Math.floor(focusSeconds/60)).padStart(2,"0")}:${String(focusSeconds%60).padStart(2,"0")}`;document.getElementById("focusLabel").textContent=focusModeLabel}
    function stopFocus(){if(focusInterval){clearInterval(focusInterval);focusInterval=null}document.getElementById("focusStart").textContent="Bắt đầu"}
    document.querySelectorAll("[data-focus-minutes]").forEach(btn=>btn.addEventListener("click",()=>{
      stopFocus();document.querySelectorAll("[data-focus-minutes]").forEach(x=>x.classList.toggle("active",x===btn));
      focusDuration=Number(btn.dataset.focusMinutes)*60;focusSeconds=focusDuration;focusModeLabel=btn.dataset.focusLabel;renderFocusTime();
    }));
    document.getElementById("focusStart").addEventListener("click",()=>{
      if(focusInterval){stopFocus();return}
      document.getElementById("focusStart").textContent="Tạm dừng";
      focusInterval=setInterval(()=>{
        focusSeconds=Math.max(0,focusSeconds-1);renderFocusTime();
        if(focusSeconds===0){
          stopFocus();showToast("Hoàn thành phiên tập trung! +20 XP, +3 Cà rốt 🥕");
          if(focusModeLabel==="Phiên học tập"){
            const stats=getLearningStats();
            updateStudyStreak(stats);
            stats.focusSessions+=1;
            stats.focusMinutes+=Math.round(focusDuration/60);
            stats.carrots=(stats.carrots||0)+3;
            setLearningStats(stats);
            completeDailyPlanTask("focus");
            renderLearningFeatures();
          }
        }
      },1000);
    });
    document.getElementById("focusReset").addEventListener("click",()=>{stopFocus();focusSeconds=focusDuration;renderFocusTime()});

    // Trung tâm thông báo
    const notificationItems=[
      {id:"speaking",icon:"<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z'/><path d='M19 10v2a7 7 0 0 1-14 0v-2'/></svg>",title:"Luyện nói AI",detail:"Phòng luyện nói & nhận diện giọng nói AI đã sẵn sàng.",time:"Mới"},
      {id:"capybara",icon:"🦫",title:"Bạn đồng hành Capybara",detail:"Tương tác cùng Capybara và tích lũy cà rốt để thăng cấp.",time:"Mới"},
      {id:"assignment",icon:"<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/></svg>",title:"Bài luyện mới",detail:"Mid-term Practice 01 với chế độ thi an toàn đang chờ bạn.",time:"Hôm nay"},
      {id:"streak",icon:"<svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>",title:"Duy trì chuỗi học",detail:"Hoàn thành một nhiệm vụ để giữ chuỗi học tập.",time:"Hôm nay"}
    ];
    function getReadNotifications(){
      const key = getUserStorageKey("engoNotificationsReadV3");
      try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return []}
    }
    function renderNotifications(){
      const read=getReadNotifications();const unread=notificationItems.filter(n=>!read.includes(n.id));
      document.getElementById("notificationDot").classList.toggle("hidden",unread.length===0);
      document.getElementById("notificationList").innerHTML=notificationItems.map(n=>`<div class="notification-item ${read.includes(n.id)?"":"unread"}"><div class="notification-icon">${n.icon}</div><div><strong>${n.title}</strong><p>${n.detail}</p><time>${n.time}</time></div></div>`).join("");
    }
    const notifBtn = document.getElementById("notificationBtn");
    if(notifBtn){
      notifBtn.addEventListener("click",e=>{e.stopPropagation();document.getElementById("notificationPanel").classList.toggle("open")});
    }
    const markReadBtn = document.getElementById("markNotificationsRead");
    if(markReadBtn){
      markReadBtn.addEventListener("click",()=>{
        const key = getUserStorageKey("engoNotificationsReadV3");
        localStorage.setItem(key,JSON.stringify(notificationItems.map(n=>n.id)));
        renderNotifications();
        showToast("Đã đánh dấu tất cả là đã đọc");
      });
    }
    document.addEventListener("click",e=>{const panel=document.getElementById("notificationPanel");if(panel && panel.classList.contains("open")&&!panel.contains(e.target)&&e.target!==notifBtn)panel.classList.remove("open")});

    // Hoàn thành nhiệm vụ flashcard
    const markKnownBtn = document.getElementById("markKnown");
    if(markKnownBtn){
      markKnownBtn.addEventListener("click",()=>{setTimeout(()=>{if(flashKnown.size>=5)completeDailyPlanTask("flashcard")},0)});
    }

    // ==========================================
    // PHÒNG CHỮA LỖI THÔNG MINH (ERROR HEALING ROOM)
    // ==========================================

    const defaultHealingProfile = {
      pendingErrors: [],
      healedHistory: [],
      healingStreak: 0,
      heatmapStatus: {
        "PS_AFF": "unknown",
        "PS_NEG": "unknown",
        "PS_QUE": "unknown",
        "PS_ADV": "unknown",
        "PAST_REG": "unknown",
        "PAST_IRR": "unknown",
        "PAST_NEG": "unknown",
        "PAST_QUE": "unknown",
        "PAST_BE": "unknown",
        "CMP_SHORT": "unknown",
        "CMP_LONG": "unknown",
        "CMP_IRR": "unknown"
      }
    };

    function getHealingProfile() {
      const key = getUserStorageKey("engoHealingProfileV2");
      try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return JSON.parse(JSON.stringify(defaultHealingProfile));
    }

    function saveHealingProfile(profile) {
      const key = getUserStorageKey("engoHealingProfileV2");
      try {
        localStorage.setItem(key, JSON.stringify(profile));
      } catch (e) {}
    }

    // Tự động phân loại và thêm lỗi sai vào Phòng Chữa Lỗi
    function recordErrorForHealing(questionPrompt, selectedAnswer, correctAnswer, grammarType) {
      const profile = getHealingProfile();
      let detectedCode = "PS_NEG";
      const qLower = ((questionPrompt || "") + " " + (grammarType || "")).toLowerCase();
      if (qLower.includes("past") && (qLower.includes("irregular") || qLower.includes("bất quy tắc"))) detectedCode = "PAST_IRR";
      else if (qLower.includes("past") && (qLower.includes("negative") || qLower.includes("phủ định"))) detectedCode = "PAST_NEG";
      else if (qLower.includes("past") && (qLower.includes("question") || qLower.includes("nghi vấn"))) detectedCode = "PAST_QUE";
      else if (qLower.includes("was") || qLower.includes("were")) detectedCode = "PAST_BE";
      else if (qLower.includes("comparative") && qLower.includes("long")) detectedCode = "CMP_LONG";
      else if (qLower.includes("comparative") && (qLower.includes("irregular") || qLower.includes("bất quy tắc"))) detectedCode = "CMP_IRR";
      else if (qLower.includes("comparative")) detectedCode = "CMP_SHORT";
      else if (qLower.includes("present") && qLower.includes("negative")) detectedCode = "PS_NEG";
      else if (qLower.includes("present") && qLower.includes("question")) detectedCode = "PS_QUE";
      else if (qLower.includes("adverb")) detectedCode = "PS_ADV";
      else if (qLower.includes("present")) detectedCode = "PS_AFF";
      else if (qLower.includes("past")) detectedCode = "PAST_REG";

      // Kiểm tra xem lỗi dạng này đã có trong hàng chờ chưa
      const exists = profile.pendingErrors.some(e => e.code === detectedCode);
      if (!exists) {
        profile.pendingErrors.unshift({
          id: `err-${Date.now()}`,
          code: detectedCode,
          triggerQuestion: questionPrompt || "Câu hỏi luyện tập ngữ pháp",
          selected: selectedAnswer || "Chưa chính xác",
          correct: correctAnswer || "Đáp án chuẩn",
          createdAt: new Date().toISOString()
        });
        profile.heatmapStatus[detectedCode] = "weak";
        saveHealingProfile(profile);
      }
    }

    function renderHealingRoom() {
      const profile = getHealingProfile();
      const statPending = document.getElementById("healingStatPending");
      const statHealed = document.getElementById("healingStatHealed");
      const statStreak = document.getElementById("healingStatStreak");

      if (statPending) statPending.textContent = profile.pendingErrors.length;
      if (statHealed) statHealed.textContent = profile.healedHistory.length;
      if (statStreak) statStreak.textContent = profile.healingStreak || 0;

      // 1. Render Tab: Lỗi Cần Chữa
      const pendingList = document.getElementById("healingPendingList");
      if (pendingList) {
        if (!profile.pendingErrors.length) {
          pendingList.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:36px">
              <strong style="font-size:16px;color:#16a34a;display:block;margin-bottom:6px">Tuyệt vời! Bạn không có lỗi ngữ pháp nào đang chờ chữa.</strong>
              <p class="small muted">Hãy tiếp tục làm bài kiểm tra và luyện tập. Nếu có câu sai, hệ thống sẽ tự động chẩn đoán và đưa vào đây.</p>
            </div>
          `;
        } else {
          pendingList.innerHTML = profile.pendingErrors.map(err => {
            const bankData = (healingExercisesBank && healingExercisesBank[err.code]) ? healingExercisesBank[err.code] : (healingExercisesBank ? healingExercisesBank["PS_AFF"] : { label: "Ngữ pháp trọng tâm", rule: "Xem lại công thức và dấu hiệu nhận biết.", mnemonic: "Đọc kỹ câu và xác định thì." });
            return `
              <div class="healing-error-card">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
                  <span class="error-badge red">Cần chữa: ${escapeHTML(bankData.label)}</span>
                  <span class="small muted">${new Date(err.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
                <div style="font-size:14px;color:#1e293b;margin-bottom:8px">
                  <strong>Câu mắc lỗi:</strong> "${escapeHTML(err.triggerQuestion)}"
                </div>
                <div style="display:flex;gap:12px;font-size:13px;margin-bottom:12px;background:#fef2f2;padding:8px 12px;border-radius:8px">
                  <div>Bạn chọn: <span style="color:#dc2626;font-weight:700">${escapeHTML(String(err.selected || "Sai"))}</span></div>
                  <div>Đáp án chuẩn: <span style="color:#16a34a;font-weight:700">${escapeHTML(String(err.correct || "Xem giải thích"))}</span></div>
                </div>
                <div style="background:#f8fafc;border-left:3px solid #6366f1;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:14px;font-size:13px">
                  <div style="font-weight:700;color:#4338ca;margin-bottom:2px">Quy tắc cốt lõi:</div>
                  <div style="color:#334155;line-height:1.5">${escapeHTML(bankData.rule)}</div>
                  <div style="margin-top:6px;color:#059669;font-weight:600">Mẹo nhớ: ${escapeHTML(bankData.mnemonic)}</div>
                </div>
                <button class="btn btn-primary start-healing-btn" data-error-code="${err.code}" data-error-id="${err.id}" style="width:100%;font-weight:700">
                  Bắt đầu chữa lỗi (Luyện 3 câu cùng dạng) →
                </button>
              </div>
            `;
          }).join("");

          pendingList.querySelectorAll(".start-healing-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              startHealingExercise(btn.dataset.errorCode, btn.dataset.errorId);
            });
          });
        }
      }

      // 2. Render Tab: Bản Đồ Ngữ Pháp (Heatmap)
      const heatmapContainer = document.getElementById("grammarHeatmapContainer");
      if (heatmapContainer) {
        const getDotClass = (code) => profile.heatmapStatus[code] || "unknown";
        const getStatusLabel = (code) => {
          const st = profile.heatmapStatus[code];
          if (st === "mastered") return `<span style="color:#16a34a;font-weight:700">Thành thạo</span>`;
          if (st === "shaky") return `<span style="color:#d97706;font-weight:700">Đang củng cố</span>`;
          if (st === "weak") return `<span style="color:#dc2626;font-weight:700">Yếu (Cần chữa)</span>`;
          return `<span style="color:#94a3b8">Chưa kiểm tra</span>`;
        };

        heatmapContainer.innerHTML = `
          <div class="healing-heatmap-group">
            <h4>Thì Hiện tại đơn (Present Simple)</h4>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PS_AFF')}"></div></div><div style="flex:1">Khẳng định (+s/es)</div><div>${getStatusLabel('PS_AFF')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PS_NEG')}"></div></div><div style="flex:1">Phủ định (don't/doesn't)</div><div>${getStatusLabel('PS_NEG')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PS_QUE')}"></div></div><div style="flex:1">Nghi vấn (Do/Does)</div><div>${getStatusLabel('PS_QUE')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PS_ADV')}"></div></div><div style="flex:1">Trạng từ tần suất</div><div>${getStatusLabel('PS_ADV')}</div></div>
          </div>
          <div class="healing-heatmap-group">
            <h4>Thì Quá khứ đơn (Past Simple)</h4>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PAST_REG')}"></div></div><div style="flex:1">V-ed có quy tắc</div><div>${getStatusLabel('PAST_REG')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PAST_IRR')}"></div></div><div style="flex:1">V2 Bất quy tắc</div><div>${getStatusLabel('PAST_IRR')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PAST_NEG')}"></div></div><div style="flex:1">Phủ định (didn't + V)</div><div>${getStatusLabel('PAST_NEG')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PAST_QUE')}"></div></div><div style="flex:1">Câu hỏi (Did + S + V)</div><div>${getStatusLabel('PAST_QUE')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('PAST_BE')}"></div></div><div style="flex:1">Was / Were</div><div>${getStatusLabel('PAST_BE')}</div></div>
          </div>
          <div class="healing-heatmap-group">
            <h4>Cấu trúc So sánh (Comparatives)</h4>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('CMP_SHORT')}"></div></div><div style="flex:1">Tính từ ngắn (-er/-est)</div><div>${getStatusLabel('CMP_SHORT')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('CMP_LONG')}"></div></div><div style="flex:1">Tính từ dài (more/most)</div><div>${getStatusLabel('CMP_LONG')}</div></div>
            <div class="healing-heatmap-row"><div class="healing-heatmap-dots"><div class="healing-heatmap-dot ${getDotClass('CMP_IRR')}"></div></div><div style="flex:1">So sánh bất quy tắc</div><div>${getStatusLabel('CMP_IRR')}</div></div>
          </div>
        `;
      }

      // 3. Render Tab: Lịch Sử Đã Chữa Khỏi
      const historyList = document.getElementById("healingHistoryList");
      if (historyList) {
        if (!profile.healedHistory.length) {
          historyList.innerHTML = `<div class="empty-state" style="text-align:center;padding:24px">Chưa có lỗi nào được chữa khỏi. Hãy bắt đầu chữa lỗi ở tab "Lỗi Cần Chữa".</div>`;
        } else {
          historyList.innerHTML = profile.healedHistory.map(item => `
            <div class="card panel" style="padding:14px 18px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
              <div>
                <span class="badge green" style="margin-bottom:4px">Đã chữa khỏi</span>
                <div style="font-weight:700;color:#1e293b;margin-top:2px">${escapeHTML(item.title || item.code)}</div>
                <div class="small muted">Hoàn thành lúc: ${new Date(item.healedAt).toLocaleString("vi-VN")}</div>
              </div>
              <div style="text-align:right">
                <span style="font-weight:800;color:#16a34a;font-size:15px">+15 XP 🥕</span>
                <div class="small muted">Chính xác ${item.score || '3/3'}</div>
              </div>
            </div>
          `).join("");
        }
      }
    }

    // Modal chữa lỗi trắc nghiệm tương tác
    let activeHealingSession = null;

    function startHealingExercise(errorCode, errorId) {
      const bank = (healingExercisesBank && healingExercisesBank[errorCode]) ? healingExercisesBank[errorCode] : (healingExercisesBank ? healingExercisesBank["PS_AFF"] : null);
      const allQuestions = (bank && bank.questions) ? bank.questions : [];
      if (!allQuestions.length) {
        showToast("Đang chuẩn bị câu hỏi cho dạng bài này...");
        return;
      }
      // Chọn ngẫu nhiên 3 câu hỏi từ ngân hàng
      const shuffled = shuffleArray(allQuestions).slice(0, 3);

      activeHealingSession = {
        errorCode,
        errorId,
        label: bank.label,
        rule: bank.rule,
        mnemonic: bank.mnemonic,
        questions: shuffled,
        currentIndex: 0,
        correctCount: 0
      };

      const modal = document.getElementById("healingExerciseModal");
      const title = document.getElementById("healingModalTitle");
      if (title) title.textContent = `Chữa lỗi: ${bank.label}`;
      renderHealingModalStep();
      if (modal) modal.classList.remove("hidden");
    }

    function renderHealingModalStep() {
      if (!activeHealingSession) return;
      const s = activeHealingSession;
      const progressFill = document.getElementById("healingModalProgress");
      const modalBody = document.getElementById("healingModalBody");
      if (!modalBody) return;

      const pct = Math.round(((s.currentIndex) / s.questions.length) * 100);
      if (progressFill) progressFill.style.width = `${Math.max(15, pct)}%`;

      if (s.currentIndex >= s.questions.length) {
        // Hoàn thành xuất sắc 3/3 câu!
        const profile = getHealingProfile();
        profile.pendingErrors = profile.pendingErrors.filter(e => e.id !== s.errorId);
        profile.healedHistory.unshift({
          id: `healed-${Date.now()}`,
          code: s.errorCode,
          title: s.label,
          healedAt: new Date().toISOString(),
          score: `${s.correctCount}/${s.questions.length}`
        });
        profile.heatmapStatus[s.errorCode] = "mastered";
        profile.healingStreak = (profile.healingStreak || 0) + 1;
        saveHealingProfile(profile);

        // Thưởng XP & Cà rốt
        const stats = getLearningStats();
        stats.points += 15;
        stats.carrots += 1;
        setLearningStats(stats);
        renderLearningFeatures();
        playSuccessSound();

        modalBody.innerHTML = `
          <div style="text-align:center;padding:20px 0">
            <h3 style="color:#16a34a;margin:0 0 8px">CHỮA LỖI THÀNH CÔNG!</h3>
            <p style="color:#334155;line-height:1.5;margin-bottom:16px">
              Bạn đã hoàn thành chính xác <strong>3/3 câu luyện tập</strong> dạng <strong>${escapeHTML(s.label)}</strong>.<br>
              Lỗi này đã được đánh dấu <strong style="color:#16a34a">THÀNH THẠO</strong> trên Bản đồ Ngữ pháp!
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;display:inline-block;margin-bottom:20px">
              <strong style="color:#15803d;font-size:16px">🎁 Thưởng: +15 XP & +1 Cà rốt 🥕</strong>
            </div>
            <button class="btn btn-primary" id="finishHealingSessionBtn" style="width:100%;font-weight:700">
              Hoàn tất & Quay về Phòng Chữa Lỗi
            </button>
          </div>
        `;

        document.getElementById("finishHealingSessionBtn")?.addEventListener("click", () => {
          document.getElementById("healingExerciseModal")?.classList.add("hidden");
          renderHealingRoom();
        });
        return;
      }

      const q = s.questions[s.currentIndex];
      modalBody.innerHTML = `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
          <span class="badge blue">Câu ${s.currentIndex + 1} / ${s.questions.length}</span>
          <span class="small muted">Dạng: ${escapeHTML(s.label)}</span>
        </div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:16px;line-height:1.5">
          ${escapeHTML(q.prompt)}
        </div>
        <div id="healingOptionsList">
          ${q.options.map((opt, i) => `
            <button type="button" class="healing-option" data-opt-index="${i}">${escapeHTML(opt)}</button>
          `).join("")}
        </div>
        <div id="healingAnswerFeedback" style="display:none;margin-top:14px;padding:12px 14px;border-radius:10px;font-size:13.5px;line-height:1.5"></div>
        <button class="btn btn-primary" id="nextHealingStepBtn" style="display:none;width:100%;margin-top:14px;font-weight:700">
          Tiếp tục câu tiếp theo →
        </button>
      `;

      const options = modalBody.querySelectorAll(".healing-option");
      const feedback = document.getElementById("healingAnswerFeedback");
      const nextBtn = document.getElementById("nextHealingStepBtn");

      options.forEach(btn => {
        btn.addEventListener("click", () => {
          options.forEach(b => b.disabled = true);
          const chosen = Number(btn.dataset.optIndex);
          const isRight = chosen === q.answer;

          if (isRight) {
            btn.classList.add("correct");
            s.correctCount++;
            playSuccessSound();
            if (feedback) {
              feedback.style.display = "block";
              feedback.style.background = "#f0fdf4";
              feedback.style.border = "1px solid #bbf7d0";
              feedback.style.color = "#15803d";
              feedback.innerHTML = `<strong>✓ CHÍNH XÁC!</strong> ${escapeHTML(q.explanation)}`;
            }
          } else {
            btn.classList.add("wrong");
            options[q.answer]?.classList.add("correct");
            playWrongSound();
            if (feedback) {
              feedback.style.display = "block";
              feedback.style.background = "#fef2f2";
              feedback.style.border = "1px solid #fecaca";
              feedback.style.color = "#991b1b";
              feedback.innerHTML = `<strong>✕ CHƯA ĐÚNG!</strong> ${escapeHTML(q.explanation)}`;
            }
          }

          if (nextBtn) {
            nextBtn.style.display = "block";
            nextBtn.addEventListener("click", () => {
              s.currentIndex++;
              renderHealingModalStep();
            });
          }
        });
      });
    }

    // Tabs navigation cho Phòng Chữa Lỗi
    const healingPendingTab = document.getElementById("healingPendingTab");
    const healingHeatmapTab = document.getElementById("healingHeatmapTab");
    const healingHistoryTab = document.getElementById("healingHistoryTab");
    const healingPendingPanel = document.getElementById("healingPendingPanel");
    const healingHeatmapPanel = document.getElementById("healingHeatmapPanel");
    const healingHistoryPanel = document.getElementById("healingHistoryPanel");

    function switchHealingTab(tabName) {
      if (healingPendingTab) healingPendingTab.classList.toggle("active", tabName === "pending");
      if (healingHeatmapTab) healingHeatmapTab.classList.toggle("active", tabName === "heatmap");
      if (healingHistoryTab) healingHistoryTab.classList.toggle("active", tabName === "history");

      if (healingPendingPanel) healingPendingPanel.classList.toggle("active", tabName === "pending");
      if (healingHeatmapPanel) healingHeatmapPanel.classList.toggle("active", tabName === "heatmap");
      if (healingHistoryPanel) healingHistoryPanel.classList.toggle("active", tabName === "history");
    }

    if (healingPendingTab) healingPendingTab.addEventListener("click", () => switchHealingTab("pending"));
    if (healingHeatmapTab) healingHeatmapTab.addEventListener("click", () => switchHealingTab("heatmap"));
    if (healingHistoryTab) healingHistoryTab.addEventListener("click", () => switchHealingTab("history"));

    document.getElementById("healingModalClose")?.addEventListener("click", () => {
      document.getElementById("healingExerciseModal")?.classList.add("hidden");
    });

    renderDailyPlan();renderFocusTime();renderNotifications();renderLearningFeatures();

    // Periodic local autosave
    setInterval(()=>{ if(document.getElementById("quiz").classList.contains("active")) saveAnswers(); },15000);

    renderQuestionGrid();
