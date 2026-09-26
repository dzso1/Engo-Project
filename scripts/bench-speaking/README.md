# Kiểm thử bộ chấm phát âm ENGO

Bộ 44 câu kiểm thử do tác giả dựng (câu mẫu lấy từ học liệu luyện nói Unit 1–12), so bộ chấm thật
`services/speaking-scorer.js` với cách chấm cũ (so từng chữ theo đúng vị trí).

Chạy trong thư mục engo-web:

    node scripts/bench-speaking/run.js       # điểm trung bình theo nhóm
    node scripts/bench-speaking/metrics.js   # số từ bị báo sai theo nhóm

Nhóm: A đọc đúng · B giọng Việt · C thiếu đuôi -s/-ed · D đọc sai hẳn · E sót 1 từ.
