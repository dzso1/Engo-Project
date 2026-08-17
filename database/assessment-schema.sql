USE engo;

-- 1. Thêm cột class_name vào bảng users
ALTER TABLE users ADD COLUMN class_name VARCHAR(50) NULL AFTER role;

-- 2. Tạo bảng imported_tests (đề thi DOCX)
CREATE TABLE IF NOT EXISTS imported_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  source_file_name VARCHAR(255) NOT NULL,
  class_name VARCHAR(50) NULL,
  questions_json JSON NOT NULL,
  summary_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_imported_tests_created_at (created_at),
  INDEX idx_imported_tests_class (class_name),
  CONSTRAINT fk_imported_tests_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tạo bảng writing_submissions (bài nộp của học sinh)
CREATE TABLE IF NOT EXISTS writing_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  test_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  objective_answers_json JSON NOT NULL,
  writing_answers_json JSON NOT NULL,
  objective_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  manual_score DECIMAL(5,2) NULL,
  teacher_feedback TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending_manual',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMP NULL,
  UNIQUE KEY uq_writing_submission (test_id, student_id),
  INDEX idx_writing_status (status),
  CONSTRAINT fk_writing_test FOREIGN KEY (test_id) REFERENCES imported_tests(id) ON DELETE CASCADE,
  CONSTRAINT fk_writing_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Cấp quyền đầy đủ cho tài khoản engo_app
GRANT SELECT, INSERT, UPDATE, DELETE ON engo.users TO 'engo_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON engo.imported_tests TO 'engo_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON engo.writing_submissions TO 'engo_app'@'localhost';
FLUSH PRIVILEGES;