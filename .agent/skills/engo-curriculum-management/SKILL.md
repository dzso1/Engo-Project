---
name: engo-curriculum-management
description: >-
  Hướng dẫn và quy chuẩn mở rộng chương trình học (Grade 8, Grade 9...), tích hợp học liệu chuẩn Global Success,
  trích xuất dữ liệu, import đề thi và tối ưu hóa hiệu năng cho hệ thống ENGO Web.
---

# ENGO Curriculum Management & Performance Optimization Skill

Skill này quy định quy trình chuẩn mực và các bước thực hiện khi mở rộng, cập nhật hoặc bảo trì chương trình học tiếng Anh cho nền tảng ENGO Web.

---

## 1. Kiến trúc phân hệ dữ liệu (Curriculum Architecture)

Hệ thống ENGO quản lý học liệu theo từng khối lớp độc lập (`grade = 8`, `grade = 9`, ...) nhằm tối ưu tải trang và mở rộng dễ dàng.

### 1.1 Cấu trúc thư mục dữ liệu (`public/data/`)
Mỗi khối lớp sở hữu một thư mục con tương ứng, ví dụ `public/data/grade8/` và `public/data/` (mặc định Grade 9):
- `vocab-units.js`: Danh sách chủ đề và thống kê unit từ vựng.
- `vocab-decks.js`: Dữ liệu chi tiết từng thẻ từ vựng (từ, phiên âm IPA, nghĩa, ví dụ câu, audio).
- `grammar-units.js`: Ngữ pháp trọng tâm từng unit, công thức, cách dùng, ví dụ và câu hỏi trắc nghiệm.
- `speaking-units.js` & `speaking-sets.js`: Kịch bản luyện nói 2 giai đoạn (Giai đoạn 1: câu hỏi nền tảng; Giai đoạn 2: tương tác phản xạ AI).
- `listening-units.js` & `listening-sets.js`: Kịch bản luyện nghe, audio script và bài tập điền từ/trắc nghiệm.
- `word-families.js`: Bảng họ từ (Word Families) phục vụ bài tập biến đổi từ loại và tra cứu.

### 1.2 Cơ chế Lazy-Loading (`public/data-loader.js`)
- Không nạp sẵn (eager load) toàn bộ script dữ liệu tại `index.html`.
- Chỉ nạp file dữ liệu khi người dùng chuyển tab hoặc mở phân hệ tương ứng:
  ```javascript
  await window.ENGO_DATA.ensureLoaded(['vocab']); // Nạp từ vựng của khối hiện tại
  await window.ENGO_DATA.ensureLoaded(['grammar', 'speaking']);
  ```
- Khi chuyển khối (`window.ENGO_DATA.setGrade(8)` hoặc `9`), hệ thống tự động dọn cache module cũ và nạp lại học liệu khối mới.

---

## 2. Quy trình trích xuất và chuẩn hóa học liệu

### 2.1 Lọc bỏ nhiễu và Watermark
Tài liệu tham khảo (PDF, Word DOCX) thường chứa thông tin quảng cáo, số điện thoại, chữ ký giáo viên hoặc bản quyền thương mại. Cần lọc triệt để các chuỗi sau trước khi đưa vào hệ thống:
- Các số điện thoại: `0832969096`, `09...`, `03...`
- Tên tác giả/kênh: `Hồng Sương`, `Riêng Một Góc Trời`, `Bùi Văn Vinh`, `Đại Lợi`, `Thích Tiếng Anh`...
- Quy tắc regex lọc:
  ```javascript
  text = text.replace(/0832\s*969\s*096/gi, '')
             .replace(/Hồng\s*Sương/gi, '')
             .replace(/Riêng\s*Một\s*Góc\s*Trời/gi, '');
  ```

### 2.2 Sinh và chuẩn hóa dữ liệu bằng AI (`scripts/build-grade8.js`)
Sử dụng Gemini API (`gemini-2.5-flash`) để xử lý các phần tài liệu thiếu ví dụ ngữ cảnh, kịch bản hội thoại và bài nghe:
1. **Từ vựng**: Trích xuất từ vựng gốc, tạo câu ví dụ song ngữ thực tế, phiên âm chuẩn IPA.
2. **Luyện nói**:
   - Giai đoạn 1 (Warm-up & Drilling): Luyện phát âm cụm từ, câu mẫu trọng tâm.
   - Giai đoạn 2 (Roleplay & Debate): Kịch bản tình huống thực tế, câu hỏi mở kèm tiêu chí chấm điểm AI.
3. **Luyện nghe**: Tạo kịch bản hội thoại tự nhiên, câu hỏi trắc nghiệm kiểm tra ý chính và chi tiết.
4. **Họ từ (Word Formation)**: Phân tách đầy đủ 4 dạng từ (Noun, Verb, Adjective, Adverb) kèm tiền tố/hậu tố.

---

## 3. Ngân hàng Đề kiểm tra (Exam Bank)

### 3.1 Quy chuẩn phân loại đề kiểm tra
Đề thi lưu trữ trong bảng CSDL MySQL `imported_tests` với các trường bắt buộc:
- `grade`: Khối lớp (8 hoặc 9).
- `semester`: Học kỳ (1 hoặc 2).
- `exam_type`:
  - `KTTX`: Kiểm tra thường xuyên (15 phút / theo từng Unit).
  - `KTGK`: Kiểm tra giữa kỳ (45 phút / 60 phút).
  - `KTCK`: Kiểm tra cuối kỳ (học kỳ I hoặc học kỳ II).
- `matrix`: Ma trận đề chuẩn (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
- `questions`: Cấu trúc JSON chứa câu hỏi, 4 phương án, đáp án đúng và lời giải chi tiết.

### 3.2 Script Import đề thi
- Sử dụng thư viện `mammoth` trích xuất nội dung từ file `.docx`.
- Tách đề thi và phần đáp án/hướng dẫn giải (thường nằm ở cuối file hoặc file riêng).
- Tự động map câu hỏi với đáp án tương ứng (A, B, C, D).

---

## 4. Nguyên tắc tối ưu hiệu năng và Bảo mật

1. **Bảo mật truy cập & Phân quyền**:
   - Gỡ bỏ tính năng đăng ký tự do nếu hệ thống yêu cầu cấp phát tài khoản tập trung từ ban quản trị/giáo viên.
   - Chặn và trả về mã lỗi 404/403 cho các endpoint đăng ký cũ (`/api/auth/register`, `/api/auth/send-otp`).
   - Mọi API truy xuất học liệu cá nhân hoặc lớp học phải qua middleware xác thực (`requireLogin`).

2. **Loại bỏ chặn render (Render-Blocking Resources)**:
   - Thư viện nặng như KaTeX, `html2canvas` chỉ nạp dynamic qua `importScript()` khi học sinh làm bài tập có công thức hoặc xuất báo cáo kết quả.
   - Tránh nạp cùng lúc hàng chục file `.js` ở thẻ `<head>` hoặc cuối `<body>`.

3. **Tối ưu Backend**:
   - Hạn chế truy vấn tuần tự N+1 trong các API thống kê (`/api/teacher/students-overview`). Thay bằng truy vấn gộp (JOIN / Group by) hoặc xử lý đồng thời có giới hạn worker pool.
   - Thư mục chứa dữ liệu tĩnh lớn (`public/data/`) cần loại khỏi bước nén JS Terser khi build server để tiết kiệm tài nguyên CPU.

---

## 5. Quy chuẩn Git Commit Message

Khi hoàn thành các đợt phát triển lớn, commit message cần tuân thủ cấu trúc Conventional Commits:

```bash
git add .
git commit -m "<type>: <tiêu đề ngắn gọn phản ánh thay đổi chính>

- <Chi tiết thay đổi 1: tính năng, học liệu mới>
- <Chi tiết thay đổi 2: ngân hàng đề thi hoặc cơ sở dữ liệu>
- <Chi tiết thay đổi 3: gỡ bỏ mã thừa, tái cấu trúc giao diện>
- <Chi tiết thay đổi 4: tối ưu hiệu năng, bảo mật và lazy-loading>"
```

### Mẫu commit thực tế:
```bash
git commit -m "feat: tich hop chuong trinh Tieng Anh 8 Global Success, bo dang ky va toi uu hieu nang

- Bổ sung trọn bộ chương trình Tiếng Anh 8 (12 Unit) bám sát tài liệu Global Success: Từ vựng, Ngữ pháp, Luyện nói 2 giai đoạn, Luyện nghe và Họ từ (Word Form).
- Nhập bổ sung ngân hàng đề kiểm tra định kỳ HK2 lớp 8 (KTTX và KTCK) kèm ma trận phân tích AI.
- Gỡ bỏ hoàn toàn phân hệ đăng ký tài khoản và mã xác thực OTP/email dư thừa; chuyển hệ thống sang cấp phát tài khoản tập trung.
- Tối ưu hóa hiệu năng ứng dụng:
  + Triển khai lazy-loading học liệu theo từng khối lớp và phân hệ (data-loader).
  + Loại bỏ nạp chặn (render-blocking) từ các CDN KaTeX và html2canvas.
  + Tối ưu luồng truy vấn tổng quan học sinh (batch concurrency) và bộ nén Terser.
  + Tích hợp bộ chuyển đổi Khối 8 / Khối 9 linh hoạt trên toàn bộ các phân hệ học tập và Đấu trường PvP."
```
