# <p align="center"><img src="./public/images/engologo.png" width="130" alt="ENGO Logo"><br>🌟 ENGO - DANH SÁCH TÍNH NĂNG NỀN TẢNG HỌC TIẾNG ANH 🌟</p>

---

## 1. 🎓 PHÂN HỆ HỌC SINH (STUDENT PORTAL)

### 1.1. Quản lý tài khoản cá nhân
* **Đăng ký & Đăng nhập:** Đăng ký tài khoản theo khối lớp (Khối 6, 7, 8, 9) và đăng nhập nhanh chóng.
* **Tự xóa tài khoản (Self Delete):** Tự động xóa thông tin và tài khoản của mình khỏi hệ thống khi không còn nhu cầu sử dụng.

### 1.2. Ôn luyện ngữ pháp tương tác
* **Chuyên đề ngữ pháp trọng tâm:** Luyện tập các thì cơ bản và nâng cao trong chương trình THCS (Thì Hiện tại đơn - *Present Simple*, Thì Quá khứ đơn - *Past Simple*...).
* **Đa dạng dạng bài:** Bài tập trắc nghiệm 4 lựa chọn (A, B, C, D), bài tập chia thì động từ và điền khuyết.
* **Giải thích chi tiết tức thì:** Xem ngay lời giải thích ngữ pháp chuẩn sau khi nộp bài để hiểu rõ lý do đúng/sai.

### 1.3. Làm bài kiểm tra trực tuyến
* **Nhận bài từ Giáo viên:** Làm các bài kiểm tra 15 phút, 1 tiết hoặc bài ôn tập do giáo viên bộ môn giao.
* **Đồng hồ đếm ngược:** Hiển thị thời gian làm bài thực tế, tự động khóa và nộp bài khi hết giờ.
* **Tự động lưu tạm thời:** Lưu trữ trạng thái câu trả lời trong quá trình làm bài để tránh mất dữ liệu khi gián đoạn mạng.

### 1.4. Theo dõi tiến độ & Bảng điểm
* **Chấm điểm tự động:** Nhận điểm số ngay lập tức (thang điểm 10) sau khi nhấn nộp bài.
* **Lịch sử học tập cá nhân:** Xem lại toàn bộ danh sách các bài kiểm tra đã làm, điểm số đạt được và nhận xét chi tiết từ giáo viên.

---

## 2. 👩‍🏫 PHÂN HỆ GIÁO VIÊN (TEACHER HUB)

### 2.1. Tạo bài kiểm tra thông minh
* **Tạo đề tự động từ file Word (.docx):** Tải trực tiếp file đề thi DOCX có sẵn từ máy tính, hệ thống tự động bóc tách tiêu đề, danh sách câu hỏi, các phương án A-B-C-D và đáp án chuẩn chỉ trong vài giây.
* **Tạo đề thủ công:** Tự do đặt tên bài kiểm tra, cấu hình thời gian làm bài (phút), hạn chót nộp bài và soạn câu hỏi trực tiếp trên form.
* **Tùy biến câu hỏi:** Xem trước, chỉnh sửa nội dung, thay đổi thứ tự hoặc xóa bớt câu hỏi trước khi xuất bản đề.

### 2.2. Quản lý ngân hàng đề thi
* **Danh sách đề thi:** Theo dõi toàn bộ các bài kiểm tra đã tạo, trạng thái mở/đóng và thời gian tạo.
* **Xóa đề thi:** Hỗ trợ nút `🗑️ Xóa` để xóa nhanh các bài kiểm tra cũ hoặc bài thi thử nghiệm.

### 2.3. Chấm điểm & Quản lý bài nộp của học sinh
* **Chấm trắc nghiệm tự động 100%:** Hệ thống tự động so khớp đáp án và tính điểm cho học sinh.
* **Chấm bài tự luận (Writing):** Giao diện riêng cho phép giáo viên đọc bài viết, chấm điểm và gửi nhận xét, sửa lỗi ngữ pháp cho từng học sinh.
* **Xóa bài nộp lỗi:** Xóa bài nộp không hợp lệ hoặc cho phép học sinh làm lại khi cần thiết.

### 2.4. Thống kê & Phân tích kết quả học tập (Learning Analytics)
* **Bảng điểm tổng hợp:** Xem bảng điểm đầy đủ của toàn bộ học sinh trong lớp theo từng bài kiểm tra.
* **Chỉ số phân tích:** Thống kê điểm trung bình, điểm cao nhất, điểm thấp nhất và tỷ lệ hoàn thành bài tập.
* **Phân loại năng lực:** Hỗ trợ phát hiện học sinh còn yếu ở các chuyên đề ngữ pháp cụ thể để kịp thời phụ đạo.

---

## 3. 🛡️ PHÂN HỆ QUẢN TRỊ VIÊN (ADMIN PORTAL)

* **Quản lý người dùng toàn hệ thống:** Xem danh sách toàn bộ tài khoản giáo viên và học sinh trong trường.
* **Phân quyền người dùng (RBAC):** Phân định rạch ròi 3 cấp độ quyền hạn: `Admin`, `Teacher`, `Student`.
* **Tạo & Xóa tài khoản:** Cấp tài khoản mới cho giáo viên hoặc xóa tài khoản học sinh khi ra trường.

---

## 4. ⚙️ TÍNH NĂNG KỸ THUẬT & BẢO MẬT HỆ THỐNG

* **Bảo mật xác thực JWT:** Sử dụng JSON Web Token lưu trữ trong `HttpOnly Cookie` chống tấn công XSS.
* **Mã hóa mật khẩu an toàn:** Toàn bộ mật khẩu người dùng được băm (hash) bằng thuật toán `Bcrypt`.
* **Bộ bóc tách DOCX chuyên dụng:** Module bóc tách định dạng văn bản Word sử dụng regex thông minh, nhận diện chính xác cấu trúc đề thi trắc nghiệm tiếng Anh.
* **Tự động cấu hình CSDL:** Tự động tạo bảng dữ liệu và thiết lập quan hệ (Schema Auto-setup) khi khởi chạy server.
* **Giao diện hiện đại (Responsive SPA):** Tương thích hoàn hảo trên máy tính phòng máy, laptop, máy tính bảng và điện thoại di động.
