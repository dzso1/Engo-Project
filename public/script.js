    const views = [...document.querySelectorAll(".view")];
    const navButtons = [...document.querySelectorAll("[data-view]")];
    const sidebar = document.getElementById("sidebar");
    const roleSelect = document.getElementById("roleSelect");
    const avatar = document.getElementById("avatar");
    const toast = document.getElementById("toast");

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

    function switchView(id){
      views.forEach(v=>v.classList.toggle("active",v.id===id));
      document.querySelectorAll(".nav-btn").forEach(btn=>{
        btn.classList.toggle("active",btn.dataset.view===id);
      });
      sidebar.classList.remove("open");
      window.scrollTo({top:0,behavior:"smooth"});
      if(id==="results" && currentUser && currentUser.role==="student"){
        renderStudentResults();
      }
    }

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
      if(role==="teacher") switchView("teacher-home");
      else if(role==="parent") switchView("parent-home");
      else if(role==="admin"){switchView("data-admin");renderDataAdmin()}
      else switchView("student-home");
    }

    roleSelect.disabled=true;

    function openDashboard(){
      const role=currentUser?.role||roleSelect.value||"student";
      if(role==="teacher") switchView("teacher-home");
      else if(role==="parent") switchView("parent-home");
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

      if(password!==confirm){setAuthError(error,"Hai mật khẩu chưa trùng khớp.");return}
      if(role==="student" && !className){
        setAuthError(error,"Vui lòng chọn lớp học của bạn.");
        return;
      }

      const submit=e.submitter;
      if(submit) submit.disabled=true;
      try{
        const data=await apiRequest("/api/auth/register",{
          method:"POST",
          body:JSON.stringify({fullName,email,password,role,className})
        });
        showToast(data.message||"Đăng ký thành công.");
        e.target.reset();
        if(registerClassGroup) registerClassGroup.style.display="block";
        document.getElementById("loginEmail").value=email;
        document.querySelector('[data-auth-tab="login"]').click();
      }catch(err){
        setAuthError(error,err.message);
      }finally{
        if(submit) submit.disabled=false;
      }
    });

    document.getElementById("logoutBtn").addEventListener("click",async()=>{
      try{await apiRequest("/api/auth/logout",{method:"POST",body:"{}"})}catch{}
      currentUser=null;
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

    // Quiz data: Bài tập trọng tâm Present Simple & Past Simple
    const defaultQuestions = [
      {
        type: "Present Simple",
        prompt: "Choose the best answer: My brother usually ______ football with his friends every Sunday afternoon.",
        options: ["A. play", "B. plays", "C. played", "D. playing"],
        answer: 1,
        explanation: "Chủ ngữ 'My brother' (ngôi thứ 3 số ít) + dấu hiệu 'usually / every Sunday' -> thì Hiện tại đơn: Verb + s/es (plays)."
      },
      {
        type: "Past Simple",
        prompt: "Choose the best answer: Yesterday, we ______ a very interesting documentary about endangered animals.",
        options: ["A. watch", "B. watches", "C. watched", "D. are watching"],
        answer: 2,
        explanation: "Dấu hiệu 'Yesterday' chỉ thời gian trong quá khứ -> thì Quá khứ đơn: Động từ có quy tắc thêm -ed (watched)."
      },
      {
        type: "Present Simple vs Past Simple",
        prompt: "Choose the correct pair of verbs: She usually ______ up early, but yesterday she ______ late because of a headache.",
        options: ["A. wakes / got up", "B. wake / get up", "C. woke / gets up", "D. wakes / gets up"],
        answer: 0,
        explanation: "Vế 1 diễn tả thói quen 'usually' dùng Hiện tại đơn (wakes); vế 2 có 'yesterday' dùng Quá khứ đơn (got up)."
      },
      {
        type: "Past Simple (Irregular)",
        prompt: "Complete the sentence with the correct past form of the verb: Last summer, my family ______ to Da Nang on vacation. (GO)",
        textAnswer: "went",
        accepted: ["went"],
        explanation: "Động từ bất quy tắc của 'go' ở thì Quá khứ đơn là 'went'."
      },
      {
        type: "Present Simple (Negative)",
        prompt: "Choose the best answer: He ______ like spicy food, so he never orders chili chicken.",
        options: ["A. don't", "B. doesn't", "C. didn't", "D. isn't"],
        answer: 1,
        explanation: "Thì Hiện tại đơn dạng phủ định với chủ ngữ 'He': He + doesn't + V (nguyên mẫu)."
      },
      {
        type: "Past Simple (Question)",
        prompt: "Choose the correct auxiliary verb: '______ you visit your grandparents last weekend?' - 'Yes, I did.'",
        options: ["A. Do", "B. Does", "C. Did", "D. Were"],
        answer: 2,
        explanation: "Câu hỏi thì Quá khứ đơn với động từ thường: Did + S + V (nguyên mẫu)?"
      }
    ];

    let questions=defaultQuestions;
    let activeImportedTest=null;

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
      explanationBox.innerHTML=`<strong style="color:${correct?"#166534":"#991b1b"}">${correct?"Chính xác!":"Chưa chính xác."}</strong><br>${q.explanation}`;
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

    function startDefaultQuiz(){
      activeImportedTest=null;questions=defaultQuestions;answers={};checked={};currentQuestion=0;secondsLeft=20*60;
      document.querySelector("#quiz .page-heading h2").textContent="Mid-term Practice 01";
      startQuiz();
    }
    document.querySelectorAll(".start-quiz").forEach(btn=>btn.addEventListener("click",startDefaultQuiz));
    document.getElementById("prevQuestion").addEventListener("click",()=>{if(currentQuestion>0){currentQuestion--;renderQuestion()}});
    document.getElementById("nextQuestion").addEventListener("click",()=>{
      if(currentQuestion<questions.length-1){currentQuestion++;renderQuestion()} else submitQuiz();
    });
    document.getElementById("checkAnswer").addEventListener("click",showExplanation);
    document.getElementById("submitQuiz").addEventListener("click",submitQuiz);
    document.getElementById("exitQuiz").addEventListener("click",()=>switchView("student-home"));

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

    async function submitQuiz(){
      if(activeImportedTest){
        const payload=Object.fromEntries(questions.map((question,index)=>[question.id,question.options?.length&&answers[index]!==undefined?String.fromCharCode(65+Number(answers[index])):(answers[index]??"")]));
        try{
          const result=await apiRequest(`/api/tests/${activeImportedTest.id}/submissions`,{method:"POST",body:JSON.stringify({answers:payload})});
          const scoreOnTen=result.objectiveMax?Number(result.objectiveScore/result.objectiveMax*10).toFixed(1):"0.0";
          document.getElementById("finalScore").textContent=result.status==="pending_manual"?`${scoreOnTen}*`:scoreOnTen;
          document.getElementById("correctCount").textContent=`${Number(result.objectiveScore).toFixed(2)}/${Number(result.objectiveMax).toFixed(2)}`;
          document.getElementById("wrongCount").textContent=result.status==="pending_manual"?"Writing chờ chấm":"Đã nộp";
          document.getElementById("attemptCount").textContent="1";
          applyResultScoreUI(Number(scoreOnTen), result.status==="pending_manual");
          document.getElementById("resultModal").classList.remove("hidden");
          showToast(result.message);
          return;
        }catch(error){showToast(error.message);return}
      }
      const correct=questions.reduce((sum,_,i)=>sum+(isCorrect(i)?1:0),0);
      const score=(correct/questions.length*10).toFixed(1);
      attempts++;
      localStorage.setItem("engoAttempts",String(attempts));
      saveLearningStats(correct,Number(score));
      completeDailyPlanTask("quiz");
      document.getElementById("finalScore").textContent=score;
      document.getElementById("correctCount").textContent=correct;
      document.getElementById("wrongCount").textContent=questions.length-correct;
      document.getElementById("attemptCount").textContent=attempts;
      applyResultScoreUI(Number(score), false);
      document.getElementById("resultModal").classList.remove("hidden");
    }

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

          return `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${escapeHTML(item.studentName)}</strong><br><span class="small muted">${escapeHTML(item.studentEmail)}</span></td>
              <td><span class="badge ${item.studentClass !== 'Chưa phân lớp' ? 'blue' : ''}">${escapeHTML(item.studentClass)}</span></td>
              <td><strong>${escapeHTML(item.testTitle)}</strong></td>
              <td>${Number(item.objectiveScore).toFixed(2)}</td>
              <td>${writingBtn}</td>
              <td><strong class="total-score-badge ${scoreClass}">${item.scoreOnTen} / 10</strong></td>
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

      body.innerHTML = `
        <div class="submission-detail-container">
          <div class="submission-summary-header">
            <div><strong>Học sinh:</strong> ${escapeHTML(sub.studentName || currentUser?.fullName || "")}</div>
            <div><strong>Lớp:</strong> ${escapeHTML(sub.studentClass || currentUser?.className || "Toàn khối")}</div>
            <div><strong>Thời gian nộp bài:</strong> ${new Date(sub.submittedAt).toLocaleString("vi-VN")}</div>
            <div><strong>Tổng điểm hệ 10:</strong> <strong id="modalTotalScore10" style="font-size:1.25rem; color:var(--primary)">${sub.scoreOnTen} / 10</strong></div>
          </div>
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

    // Close modal when clicking backdrop
    document.querySelectorAll(".modal").forEach(modal=>{
      modal.addEventListener("click",e=>{if(e.target===modal) modal.classList.add("hidden")});
    });


    // ENGO v3: dữ liệu học tập cục bộ cho các tiện ích mới
    const learningStatsKey="engoLearningStatsV3";
    const dailyPlanKey="engoDailyPlanV3";
    const notificationsKey="engoNotificationsReadV3";
    const defaultLearningStats={quizCount:0,bestScore:0,totalScore:0,totalCorrect:0,totalQuestions:0,focusSessions:0,focusMinutes:0,points:0,streak:1,lastStudyDate:"",skillErrors:{}};

    function getLearningStats(){
      try{return {...defaultLearningStats,...JSON.parse(localStorage.getItem(learningStatsKey)||"{}")}}
      catch{return {...defaultLearningStats}}
    }
    function setLearningStats(stats){localStorage.setItem(learningStatsKey,JSON.stringify(stats))}
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
      stats.quizCount+=1;stats.bestScore=Math.max(stats.bestScore,score);stats.totalScore+=score;
      stats.totalCorrect+=correct;stats.totalQuestions+=questions.length;stats.points+=30;
      questions.forEach((q,i)=>{if(!isCorrect(i)) stats.skillErrors[q.type]=(stats.skillErrors[q.type]||0)+1});
      setLearningStats(stats);renderLearningFeatures();
    }

    function getDailyPlan(){
      try{const data=JSON.parse(localStorage.getItem(dailyPlanKey)||"{}");return data.date===dateKey()?data:{date:dateKey(),tasks:{}}}
      catch{return {date:dateKey(),tasks:{}}}
    }
    function setDailyPlan(data){localStorage.setItem(dailyPlanKey,JSON.stringify(data))}
    function completeDailyPlanTask(task){
      const plan=getDailyPlan();
      if(!plan.tasks[task]){
        plan.tasks[task]=true;setDailyPlan(plan);
        const stats=getLearningStats();stats.points+=task==="quiz"?0:task==="focus"?20:10;setLearningStats(stats);
      }
      renderDailyPlan();renderLearningFeatures();
    }
    function renderDailyPlan(){
      const plan=getDailyPlan();
      const labels={flashcard:"flashcard",quiz:"quiz",focus:"focus"};
      Object.keys(labels).forEach(task=>{
        const checkbox=document.querySelector(`[data-plan="${task}"]`);
        const item=document.querySelector(`[data-plan-item="${task}"]`);
        if(checkbox) checkbox.checked=Boolean(plan.tasks[task]);
        if(item) item.classList.toggle("done",Boolean(plan.tasks[task]));
      });
      const done=Object.values(plan.tasks).filter(Boolean).length;
      const percent=Math.round(done/3*100);
      document.getElementById("dailyPlanBadge").textContent=`${done}/3 hoàn thành`;
      document.getElementById("dailyGoalPercent").textContent=`${percent}%`;
      document.getElementById("dailyGoalRing").style.setProperty("--goal-progress",`${percent}%`);
      document.getElementById("dailyGoalMessage").textContent=done===3?"Tuyệt vời! Bạn đã hoàn thành mục tiêu hôm nay.":done?"Đang tiến bộ tốt — tiếp tục nhiệm vụ tiếp theo nhé.":"Bắt đầu một nhiệm vụ nhỏ để tạo đà học tập.";
      document.getElementById("dailyPlanDate").textContent=new Date().toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit"});
    }
    document.querySelectorAll("[data-plan]").forEach(box=>box.addEventListener("change",()=>{
      const plan=getDailyPlan();const task=box.dataset.plan;const wasDone=Boolean(plan.tasks[task]);plan.tasks[task]=box.checked;setDailyPlan(plan);
      if(box.checked&&!wasDone){const stats=getLearningStats();stats.points+=task==="quiz"?30:task==="focus"?20:10;updateStudyStreak(stats);setLearningStats(stats)}
      renderDailyPlan();renderLearningFeatures();
    }));

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
        const max=Math.max(1,...list.map(x=>x[1]));const risk=count?Math.max(22,Math.round(count/max*100)):18;
        const labels=count?`${count} lỗi đã ghi nhận`:"Chưa đủ dữ liệu";
        return `<div class="weak-skill"><div class="weak-skill-head"><div><strong>${escapeHTML(skill)}</strong><br><span>${labels}</span></div><span class="badge ${index===0&&count?"red":"orange"}">${count?"Cần ôn":"Khởi động"}</span></div><div class="progress"><span style="width:${risk}%"></span></div></div>`;
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
    let activeGrammarCourse="present-simple";
    function getGrammarProgress(){try{return JSON.parse(localStorage.getItem(grammarProgressKey)||"{}")}catch{return {}}}
    function setGrammarProgress(progress){localStorage.setItem(grammarProgressKey,JSON.stringify(progress))}
    function grammarProgressTotal(){const progress=getGrammarProgress();return Math.round(grammarCourses.reduce((sum,course)=>sum+Number(progress[course.id]||0),0)/grammarCourses.length)}
    function getCompetencyScores(){
      const stats=getLearningStats();const accuracy=stats.totalQuestions?Math.round(stats.totalCorrect/stats.totalQuestions*100):0;const grammar=grammarProgressTotal();
      return {Listening:Math.min(98,42+stats.focusMinutes),Speaking:Math.min(98,40+stats.quizCount*5),Vocabulary:Math.min(98,45+accuracy),Grammar:Math.min(98,35+grammar+stats.quizCount*3),Writing:Math.min(98,38+stats.quizCount*4),Reading:Math.min(98,44+accuracy)};
    }
    function renderCompetency(){
      const scores=getCompetencyScores();const order=["Listening","Speaking","Vocabulary","Grammar","Writing","Reading"];const center={x:160,y:134},radius=92;
      const points=order.map((name,index)=>{const angle=(-90+index*60)*Math.PI/180;const factor=Math.max(0.28,scores[name]/100);return {x:center.x+Math.cos(angle)*radius*factor,y:center.y+Math.sin(angle)*radius*factor}});
      const polygon=document.getElementById("radarPolygon");if(polygon) polygon.setAttribute("points",points.map(point=>`${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "));
      order.forEach((name,index)=>{const dot=document.getElementById(`radarDot${name}`);if(dot){dot.setAttribute("cx",points[index].x.toFixed(1));dot.setAttribute("cy",points[index].y.toFixed(1))}});
      const stats=getLearningStats();const values=Object.values(scores);const overall=Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);const strongest=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
      document.getElementById("overallProgress").textContent=`${overall}%`;document.querySelector(".score-orbit")?.style.setProperty("--overall-progress",`${overall}%`);
      document.getElementById("overallLevel").textContent=overall>=80?"Người học vững vàng":overall>=60?"Đang tiến bộ tốt":"Người học khởi động";
      document.getElementById("overallHint").textContent=stats.quizCount?`Điểm mạnh hiện tại: ${strongest[0]} (${strongest[1]}%).` : "Hoàn thành bài luyện đầu tiên để cá nhân hóa số liệu.";
      document.getElementById("competencyMessage").textContent=stats.quizCount?`Nổi bật: ${strongest[0]} đang ở mức ${strongest[1]}%.` : "Hoàn thành bài luyện để ENGO đánh giá chính xác hơn.";
      document.getElementById("progressStatus").textContent=overall>=80?"Năng lực tốt":overall>=60?"Đang tiến bộ":"Đang khởi động";
      document.getElementById("skillStatList").innerHTML=order.map(name=>`<div class="skill-stat"><div class="skill-stat-head"><span>${{Listening:"🎧 Nghe",Speaking:"🗣️ Nói",Vocabulary:"🔤 Từ vựng",Grammar:"📘 Ngữ pháp",Writing:"✍️ Viết",Reading:"📖 Đọc"}[name]}</span><b>${scores[name]}%</b></div><div class="progress"><span style="width:${scores[name]}%"></span></div></div>`).join("");
      document.getElementById("progressStreak").textContent=`${stats.streak||1} ngày`;document.getElementById("progressPoints").textContent=`${stats.points||0} XP`;document.getElementById("progressQuizzes").textContent=stats.quizCount||0;
    }
    function renderGrammarCourses(){
      const progress=getGrammarProgress();const active=grammarCourses.find(course=>course.id===activeGrammarCourse)||grammarCourses[0];
      document.getElementById("grammarCourseGrid").innerHTML=grammarCourses.map(course=>{const value=Math.min(100,Number(progress[course.id]||0));return `<article class="card grammar-course ${course.id===active.id?"active":""}" data-grammar-course="${course.id}"><div class="grammar-course-top"><div class="grammar-course-icon">${course.icon}</div><span class="badge ${value===100?"green":""}">${course.level}</span></div><h4>${course.name}</h4><p>${course.summary}</p><div class="progress"><span style="width:${value}%"></span></div><div class="grammar-course-footer"><span>${value}% hoàn thành</span><span>${value===100?"✓ Hoàn tất":"Xem lộ trình →"}</span></div></article>`}).join("");
      const value=Math.min(100,Number(progress[active.id]||0));document.getElementById("grammarDetail").innerHTML=`<span class="badge">${active.level}</span><h3>${active.icon} ${active.name}</h3><p class="small muted">${active.summary}</p><div class="grammar-formula">${active.formula}</div><strong class="small">Các dạng bài tập phổ biến</strong><div class="exercise-list">${active.exercises.map((exercise,index)=>`<div class="exercise-item"><b>${index+1}</b><span>${exercise}</span></div>`).join("")}</div><div class="section-head" style="margin:2px 0 0"><span class="small muted">Tiến độ khóa học: ${value}%</span><strong class="small">${value>=100?"Đã hoàn thành":"Bài tiếp theo"}</strong></div><div class="progress"><span style="width:${value}%"></span></div><button class="btn btn-primary" id="completeGrammarLesson" style="width:100%;margin-top:14px">${value>=100?"Ôn lại khóa học":"Hoàn thành bài tiếp theo"}</button>`;
      document.querySelectorAll("[data-grammar-course]").forEach(card=>card.addEventListener("click",()=>{activeGrammarCourse=card.dataset.grammarCourse;renderGrammarCourses()}));
      document.getElementById("completeGrammarLesson").addEventListener("click",()=>{const next=getGrammarProgress();const before=Number(next[active.id]||0);next[active.id]=before>=100?0:Math.min(100,before+25);setGrammarProgress(next);if(before<100){const stats=getLearningStats();stats.points+=10;updateStudyStreak(stats);setLearningStats(stats);showToast(`Đã hoàn thành một bài ${active.name}. +10 XP`)}else showToast(`Đã mở lại lộ trình ${active.name}`);renderGrammarCourses();renderCompetency();renderDashboardStats()});
    }
    document.getElementById("resetGrammarProgress").addEventListener("click",()=>{setGrammarProgress({});activeGrammarCourse="present-simple";renderGrammarCourses();renderCompetency();showToast("Đã đặt lại tiến độ khóa ngữ pháp")});
    function renderLearningFeatures(){renderDashboardStats();renderSmartReview();renderAchievements();renderCompetency();renderGrammarCourses()}

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
          stopFocus();showToast("Hoàn thành phiên tập trung! +20 XP");
          if(focusModeLabel==="Phiên học tập"){
            const stats=getLearningStats();updateStudyStreak(stats);stats.focusSessions+=1;stats.focusMinutes+=Math.round(focusDuration/60);setLearningStats(stats);completeDailyPlanTask("focus");
          }
        }
      },1000);
    });
    document.getElementById("focusReset").addEventListener("click",()=>{stopFocus();focusSeconds=focusDuration;renderFocusTime()});

    // Trung tâm thông báo
    const notificationItems=[
      {id:"assignment",icon:"▤",title:"Bài luyện mới",detail:"Mid-term Practice 01 đang chờ bạn hoàn thành.",time:"Hôm nay"},
      {id:"streak",icon:"🔥",title:"Duy trì chuỗi học",detail:"Hoàn thành một nhiệm vụ để giữ chuỗi học tập.",time:"Hôm nay"},
      {id:"feature",icon:"✨",title:"Tính năng mới",detail:"Ôn thông minh, phòng tập trung và huy hiệu đã sẵn sàng.",time:"Vừa cập nhật"}
    ];
    function getReadNotifications(){try{return JSON.parse(localStorage.getItem(notificationsKey)||"[]")}catch{return []}}
    function renderNotifications(){
      const read=getReadNotifications();const unread=notificationItems.filter(n=>!read.includes(n.id));
      document.getElementById("notificationDot").classList.toggle("hidden",unread.length===0);
      document.getElementById("notificationList").innerHTML=notificationItems.map(n=>`<div class="notification-item ${read.includes(n.id)?"":"unread"}"><div class="notification-icon">${n.icon}</div><div><strong>${n.title}</strong><p>${n.detail}</p><time>${n.time}</time></div></div>`).join("");
    }
    document.getElementById("notificationBtn").addEventListener("click",e=>{e.stopPropagation();document.getElementById("notificationPanel").classList.toggle("open")});
    document.getElementById("markNotificationsRead").addEventListener("click",()=>{localStorage.setItem(notificationsKey,JSON.stringify(notificationItems.map(n=>n.id)));renderNotifications();showToast("Đã đánh dấu tất cả là đã đọc")});
    document.addEventListener("click",e=>{const panel=document.getElementById("notificationPanel");if(panel.classList.contains("open")&&!panel.contains(e.target)&&e.target!==document.getElementById("notificationBtn"))panel.classList.remove("open")});

    // Hoàn thành nhiệm vụ flashcard sau khi đánh dấu đủ 5 thẻ đã nhớ trong phiên
    document.getElementById("markKnown").addEventListener("click",()=>{setTimeout(()=>{if(flashKnown.size>=5)completeDailyPlanTask("flashcard")},0)});

    renderDailyPlan();renderFocusTime();renderNotifications();renderLearningFeatures();

    // Periodic local autosave
    setInterval(()=>{ if(document.getElementById("quiz").classList.contains("active")) saveAnswers(); },15000);

    renderQuestionGrid();
