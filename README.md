# <p align="center"><img src="./public/images/engocircle.png" width="130" alt="ENGO Logo"><br>🌟 ENGO LEARNING HUB - NỀN TẢNG HỌC & KIỂM TRA TIẾNG ANH THCS THÔNG MINH 🌟</p>

> **ENGO Learning Hub** là nền tảng giáo dục số thông minh toàn diện dành cho bậc THCS, kết hợp **Trí tuệ nhân tạo (Generative AI)**, **Cơ chế trò chơi hóa (Gamification)**, **Hệ thống điểm danh chuỗi ngày (Streak System)**, **Giám sát thi an toàn chống gian lận (Anti-Cheat Guard)** và **Phòng chữa lỗi thông minh độc quyền (Error Healing Room)**.

---

## 📑 MỤC LỤC TỔNG QUAN HỆ THỐNG
1. [🎓 Phân hệ Học sinh](#1--phân-hệ-học-sinh-student-portal)
2. [👩‍🏫 Phân hệ Giáo viên](#2--phân-hệ-giáo-viên-teacher-hub)
3. [👪 Phân hệ Phụ huynh](#3--phân-hệ-phụ-huynh-parent-portal)
4. [🔧 Phân hệ Quản trị viên](#4--phân-hệ-quản-trị-viên-admin-portal)
5. [🔐 Kiến trúc Bảo mật](#5--kiến-trúc-bảo-mật--xác-thực-otp-đa-tầng)
6. [🚀 Cài đặt & Khởi chạy](#6--hướng-dẫn-cài-đặt--khởi-chạy-local--cloud-railway)

---

## 1. 🎓 PHÂN HỆ HỌC SINH (STUDENT PORTAL)

### 1.1. 📊 Dashboard đánh giá
* Dashboard chỉ tập trung **đánh giá năng lực bằng số liệu, biểu đồ và hình ảnh**: điểm TB kiểm tra, số bài đã làm, phát âm trung bình, bộ từ vựng hoàn thành, lỗi đã chữa, chuỗi ngày học.
* **Bản đồ năng lực 6 kỹ năng** (radar) tổng hợp từ bài kiểm tra, luyện nói, từ vựng; **xu hướng điểm kiểm tra** và **tiến bộ luyện nói theo giai đoạn** theo ngày.
* Bạn đồng hành Capybara (cấp độ, cà rốt, XP) và danh hiệu đã đạt hiển thị ngay trên dashboard.

### 1.2. 📝 Bài kiểm tra theo ma trận
* Danh sách đề do giáo viên giao kèm **cấu trúc (TN / Speaking / Writing)**, **độ khó do AI phân tích** (dễ / TB / khó) và **thời gian làm bài AI đề xuất**.
* Lớp **tăng cường** nhận đề đầy đủ (nhiều câu vận dụng), lớp **thường** nhận bản rút gọn theo tỉ lệ ma trận, thời gian được cân đối tự động.
* Phòng thi có giám sát rời tab (3 nấc phạt), tự lưu, hiển thị độ khó & thời gian gợi ý từng câu; **câu Speaking** được ghi âm và AI chấm ngay trong phòng thi.
* Sau khi nộp: xem ngay các câu sai kèm đáp án đúng, câu sai tự động chuyển vào Phòng chữa lỗi.

### 1.3. 🎙️ Luyện nói AI theo giai đoạn (giao diện khổ dọc)
* **Giai đoạn 1 – Câu đơn theo chủ đề SGK** (dễ → khó) và **Giai đoạn 2 – Hội thoại theo SGK**; giai đoạn 2 mở khóa khi giai đoạn 1 đạt TB ≥ 70% với ≥ 3 lượt.
* Danh sách bài dạng **bảng cột** (mỗi bài giáo viên giao là một dòng riêng, không gom chung), bên dưới là khu luyện tập khổ dọc: câu mẫu lớn, IPA, nghĩa, trọng tâm phát âm, nghe mẫu, ghi âm, kết quả.
* **AI chấm phát âm thân thiện với mọi accent**: so khớp ngữ âm mờ (phonetic key + căn chỉnh chuỗi), chấm điểm từng phần thay vì đúng/sai tuyệt đối, gộp từ bị tách, chọn phương án nhận diện tốt nhất; gợi ý sửa lỗi ngắn gọn bằng tiếng Việt từ AI.
* Lỗi **thiếu đuôi -s / -ed / -ing** được nhận diện là **lỗi ngữ pháp** → Phòng chữa lỗi (mục Ngữ pháp); từ phát âm sai → mục Phát âm.
* Ghi nhận **tiến bộ theo từng giai đoạn** (số lượt, trung bình, tốt nhất, mức cải thiện, xu hướng theo ngày) lưu trên server.

### 1.4. 🔤 Vocabulary
* Flashcard chữ lớn, **từ loại**, phiên âm, **TTS** cho từ và từng câu ví dụ; mặt sau hiển thị nghĩa + 2 câu ví dụ có từ vựng được tô sáng.
* Không cộng điểm từng thẻ; **sau khi xem hết bộ thẻ** làm bài **trắc nghiệm** hoặc **nối từ**, điểm được cộng khi hoàn thành (≥ 80%: +30 XP & +3 🥕).

### 1.5. 🏥 Phòng Chữa Lỗi Thông Minh (phân mục)
* **Phát âm**: từ đọc sai nhiều lần → luyện lại từng từ với micro, đạt ≥ 85% là chữa khỏi.
* **Ngữ pháp**: 12 dạng lỗi trọng tâm (Hiện tại đơn, Quá khứ đơn, So sánh) → bài chữa 3 câu, ≥ 2/3 đúng là chữa khỏi; bản đồ nhiệt ngữ pháp.
* **Bài kiểm tra**: câu sai từng đề kèm đáp án đúng để xem lại; **Đã chữa khỏi**: lịch sử.

### 1.6. 🏆 Thành tích & Danh hiệu
* Ngoài cấp độ XP và huy hiệu, học sinh chinh phục **danh hiệu**: Vua Phát Âm, Ngôi Sao Phát Âm, Bậc Thầy Hội Thoại, Vua Ngữ Pháp, Chiến Binh Phòng Thi, Vua Từ Vựng, Bác Sĩ Ngữ Pháp, Tiến Bộ Vượt Bậc, Học Sinh Chăm Chỉ (tính từ dữ liệu server).

### 1.7. 📈 Kết quả
* Ghi nhận **từng lần kiểm tra** (điểm TN + Speaking, Writing & nhận xét GV, biến thể đề), lịch sử luyện nói theo giai đoạn, lịch sử từ vựng và chữa lỗi.

### 1.8. 🔥 Điểm danh chuỗi ngày & 🤖 Trợ lý Capybara AI
* Popup điểm danh 7 ngày lũy tiến (cà rốt + XP); chatbot Capybara (Gemini / Groq / OpenAI / Ollama) hỗ trợ giải đáp ngữ pháp, từ vựng, phát âm.

---

## 2. 👩‍🏫 PHÂN HỆ GIÁO VIÊN (TEACHER HUB)

### 2.1. 📐 Ma trận đề & phân loại lớp
* Upload **ma trận đề (PDF/DOCX)** → AI đọc tỉ lệ Nhận biết / Thông hiểu / Vận dụng, số câu & điểm từng kỹ năng, đề xuất phân tầng cho **lớp tăng cường** (vd 9A5, 9A6) và **lớp thường** (vd 9A12, 9A13).
* **Phân loại lớp** (tăng cường / thường): học sinh mỗi lớp tự động nhận biến thể đề phù hợp.

### 2.2. 📝 Tạo đề từ DOCX + AI phân tích câu hỏi
* Parser nhận diện Phonetics, Grammar & Vocabulary, Reading, Writing và **phần SPEAKING** (đọc to / nói tự do).
* **AI phân tích từng câu**: độ khó (dễ/TB/khó) và **thời gian hợp lý** → tổng thời gian đề và 2 biến thể (nâng cao / cơ bản). Có nút "🤖 Phân tích" để chạy lại.

### 2.3. 📚 SGK → Bài luyện nói AI
* Upload **PDF/DOCX một Unit SGK** → AI viết **câu đơn mới theo chủ đề** (không chép SGK, dễ → khó, kèm IPA, nghĩa, trọng tâm phát âm) và **hội thoại theo phong cách SGK**; giao theo lớp. Ngoài ra có thể giao bài thủ công nhiều câu / hội thoại "A: … / B: …".

### 2.4. 👩‍🎓 Kết quả từng học sinh
* Tab **Học sinh**: điểm TB & số bài kiểm tra, mức tiến bộ, phát âm GĐ1/GĐ2, từ vựng, danh hiệu, hoạt động cuối; bấm **Chi tiết** xem toàn bộ tiến độ (radar kỹ năng, lịch sử từng bài, từ hay phát âm sai).
* Tab **Bảng điểm**: lọc theo lớp/đề, chấm Writing, giám sát thi; tab **Luyện nói**: bài đã giao & kết quả từng câu của học sinh.

---

## 3. 👪 PHÂN HỆ PHỤ HUYNH (PARENT PORTAL)

* **Khóa đăng ký tự do:** Tài khoản phụ huynh do nhà trường/giáo viên cấp hoặc liên kết qua mã định danh học sinh.
* **Báo cáo học tập thời gian thực:** Điểm trung bình hệ 10, số bài kiểm tra đã hoàn thành, lời phê nhận xét từ giáo viên bộ môn.
* **Báo cáo tính trung thực thi cử:** Theo dõi **Chỉ số Độ nghiêm túc thi cử (%)** và tổng số lần rời tab bài thi của con.
* **Biểu đồ Radar 6 kỹ năng:** Theo dõi sự tiến bộ của con qua Listening, Speaking, Vocab, Grammar, Reading, Writing.

---

## 4. 🔧 PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN PORTAL)

* **Quản lý người dùng MySQL:** Xem danh sách, tạo mới, duyệt giáo viên (`pending` $\rightarrow$ `active`), khóa/mở khóa tài khoản, xóa tài khoản.
* **Bảo vệ tài khoản tối cao:** Cơ chế chặn xóa hoặc khóa tài khoản Admin hoạt động cuối cùng.
* **Sao lưu & Khôi phục:** Xuất file JSON dữ liệu, nhập dữ liệu dự phòng, đo lường tình trạng ứng dụng/database.

---

## 5. 🔐 KIẾN TRÚC BẢO MẬT & XÁC THỰC OTP ĐA TẦNG

* **Xác thực Email OTP 6 số qua Resend API:** Gửi mã xác thực về hòm thư Gmail thật, đếm ngược 5 phút, giới hạn 5 lần nhập sai.
* **Bộ lọc AI Gibberish Detector:** Phát hiện và chặn các email gõ bàn phím rác (`asdfgh`, `qwerty`, chuỗi phụ âm liên tiếp).
* **Tra cứu máy chủ MX trực tiếp (DNS MX Lookup):** Kiểm tra tên miền nhận mail thực tế trước khi gửi OTP.
* **Chặn Disposable Email:** Danh sách đen hơn 20 nhà cung cấp email tạm thời/rác.
* **JWT Cookie Session:** Token `HttpOnly Cookie`, SameSite=Lax, mã hóa mật khẩu `bcryptjs` 12 rounds.

---

## 6. 🚀 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (LOCAL & CLOUD RAILWAY)

### 6.1. Cài đặt Cục bộ (Local Development)

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Tạo cơ sở dữ liệu MySQL (chạy bằng root)
mysql -u root -p engo < database/assessment-schema.sql
mysql -u root -p < database/migrate-v2.sql   # bảng luyện nói theo giai đoạn, ma trận đề, phân loại lớp, nhật ký kết quả

# 3. Tạo file cấu hình .env (Xem mẫu dưới đây)
```

**Mẫu cấu hình `.env`:**
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=engo
DB_USER=engo_app
DB_PASSWORD=Engo_App_2026_Strong!
JWT_SECRET=engo_secret_2026_change_this_to_a_long_random_string
NODE_ENV=development

# Email OTP Service
RESEND_API_KEY=re_your_resend_api_key_here

# Generative AI Engines
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
GROQ_API_KEY=gsk_mã_key_groq_nếu_có
```

```bash
# 4. Khởi chạy ứng dụng
node server.js
```
👉 Truy cập tại: `http://localhost:3000`

---

### 6.2. Triển khai lên Railway (Railway Cloud Hosting)
1. Đẩy mã nguồn lên GitHub:
   ```bash
   git add .
   git commit -m "feat: complete engo learning hub release"
   git push origin main
   ```
2. Trên **Railway Dashboard**:
   * Tạo **MySQL Service**, import `database/assessment-schema.sql` rồi `database/migrate-v2.sql` (bỏ 2 dòng GRANT nếu Railway dùng user khác).
   * Tạo **NodeJS Service** kết nối với Repository GitHub.
   * Vào tab **Variables** trên Railway và thêm các biến môi trường tương ứng:
     * `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (lấy từ MySQL Railway).
     * `JWT_SECRET`, `RESEND_API_KEY`.
     * `GEMINI_API_KEY` (và `GROQ_API_KEY` nếu có).
3. Bấm **Deploy** $\rightarrow$ Hệ thống tự động hoạt động trực tuyến 24/7!