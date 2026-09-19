-- ============================================================
-- ENGO v2: Chạy file này bằng tài khoản ROOT của MySQL
--   mysql -u root -p < database/migrate-v2.sql   (hoặc mở bằng MySQL Workbench rồi bấm ⚡)
-- Trên Railway: đổi "USE engo;" thành tên database của bạn (thường là "railway") và XÓA 3 dòng GRANT cuối file.
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

-- 7. Cột mới cho bảng đề & bài nộp (MySQL 8 không có "ADD COLUMN IF NOT EXISTS" nên dùng thủ tục kiểm tra trước)
DROP PROCEDURE IF EXISTS engo_add_column;
DELIMITER $$
CREATE PROCEDURE engo_add_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL engo_add_column('imported_tests', 'matrix_id', 'BIGINT UNSIGNED NULL');
CALL engo_add_column('imported_tests', 'analysis_json', 'JSON NULL');
CALL engo_add_column('imported_tests', 'duration_minutes', 'INT NULL');
CALL engo_add_column('writing_submissions', 'speaking_answers_json', 'JSON NULL');
CALL engo_add_column('writing_submissions', 'speaking_score', 'DECIMAL(5,2) NOT NULL DEFAULT 0');
CALL engo_add_column('writing_submissions', 'objective_max', 'DECIMAL(5,2) NULL');
CALL engo_add_column('writing_submissions', 'variant', 'VARCHAR(20) NULL');
CALL engo_add_column('writing_submissions', 'time_spent_seconds', 'INT NULL');
CALL engo_add_column('speaking_assignments', 'stage', 'TINYINT NOT NULL DEFAULT 1');
CALL engo_add_column('speaking_assignments', 'items_json', 'JSON NULL');
CALL engo_add_column('speaking_assignments', 'unit_title', 'VARCHAR(255) NULL');
CALL engo_add_column('speaking_assignments', 'source_file_name', 'VARCHAR(255) NULL');
CALL engo_add_column('speaking_submissions', 'items_result_json', 'JSON NULL');
CALL engo_add_column('speaking_submissions', 'attempts', 'INT NOT NULL DEFAULT 1');
CALL engo_add_column('speaking_submissions', 'best_accuracy', 'INT NOT NULL DEFAULT 0');
DROP PROCEDURE IF EXISTS engo_add_column;

-- 8. Cấp quyền tạo/sửa bảng cho engo_app để server tự migrate về sau
GRANT ALL PRIVILEGES ON engo.* TO 'engo_app'@'localhost';
GRANT ALL PRIVILEGES ON engo.* TO 'engo_app'@'127.0.0.1';
FLUSH PRIVILEGES;
