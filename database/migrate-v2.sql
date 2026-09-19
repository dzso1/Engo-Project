-- ============================================================
-- ENGO v2: Chạy file này bằng tài khoản ROOT của MySQL
--   mysql -u root -p < database/migrate-v2.sql
-- Tạo các bảng mới cho: Luyện nói AI nhiều giai đoạn, ma trận đề,
-- phân loại lớp, nhật ký kết quả học tập; và cấp quyền cho engo_app.
-- ============================================================
USE engo;

-- 1. Bài luyện nói do giáo viên giao / AI sinh từ SGK
CREATE TABLE IF NOT EXISTS speaking_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  class_name VARCHAR(50) NULL,
  sentence TEXT NOT NULL,
  ipa TEXT NULL,
  translation TEXT NULL,
  stage TINYINT NOT NULL DEFAULT 1,
  items_json JSON NULL,
  unit_title VARCHAR(255) NULL,
  source_file_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_speaking_teacher (teacher_id),
  INDEX idx_speaking_class (class_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Bài nộp luyện nói (tổng hợp theo bài)
CREATE TABLE IF NOT EXISTS speaking_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  accuracy_percent INT NOT NULL DEFAULT 0,
  spoken_transcript TEXT NULL,
  items_result_json JSON NULL,
  attempts INT NOT NULL DEFAULT 1,
  best_accuracy INT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_speaking_sub (assignment_id, student_id),
  INDEX idx_speaking_sub_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Lịch sử từng lượt luyện nói (theo dõi tiến bộ theo giai đoạn)
CREATE TABLE IF NOT EXISTS speaking_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  assignment_id BIGINT UNSIGNED NULL,
  stage TINYINT NOT NULL DEFAULT 1,
  item_index INT NOT NULL DEFAULT 0,
  context VARCHAR(20) NOT NULL DEFAULT 'practice',
  target_text TEXT NOT NULL,
  transcript TEXT NULL,
  accuracy INT NOT NULL DEFAULT 0,
  errors_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_spk_att_student (student_id, created_at),
  INDEX idx_spk_att_assignment (assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Nhật ký kết quả học tập tổng hợp (test / speaking / vocab / healing)
CREATE TABLE IF NOT EXISTS learning_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  ref_id VARCHAR(64) NULL,
  title VARCHAR(255) NULL,
  score DECIMAL(6,2) NULL,
  max_score DECIMAL(6,2) NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_le_student (student_id, created_at),
  INDEX idx_le_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Ma trận đề kiểm tra (PDF/DOCX -> JSON)
CREATE TABLE IF NOT EXISTS test_matrices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  source_file_name VARCHAR(255) NULL,
  matrix_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_matrix_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Phân loại lớp: tăng cường (advanced) / thường (regular)
CREATE TABLE IF NOT EXISTS class_settings (
  class_name VARCHAR(50) NOT NULL PRIMARY KEY,
  tier VARCHAR(20) NOT NULL DEFAULT 'regular',
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Cột mới cho bảng đề & bài nộp (MySQL 8: dùng IF NOT EXISTS; nếu MySQL cũ, bỏ qua lỗi "Duplicate column")
ALTER TABLE imported_tests ADD COLUMN IF NOT EXISTS matrix_id BIGINT UNSIGNED NULL;
ALTER TABLE imported_tests ADD COLUMN IF NOT EXISTS analysis_json JSON NULL;
ALTER TABLE imported_tests ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS speaking_answers_json JSON NULL;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS speaking_score DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS objective_max DECIMAL(5,2) NULL;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS variant VARCHAR(20) NULL;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS time_spent_seconds INT NULL;

-- 8. Cấp quyền tạo/sửa bảng cho engo_app để server tự migrate về sau
GRANT ALL PRIVILEGES ON engo.* TO 'engo_app'@'localhost';
GRANT ALL PRIVILEGES ON engo.* TO 'engo_app'@'127.0.0.1';
FLUSH PRIVILEGES;
