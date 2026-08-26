USE engo;

-- 1. Thêm cột class_name và parent_student_id vào bảng users
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name VARCHAR(50) NULL AFTER role;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_student_id BIGINT UNSIGNED NULL;

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

-- 3. Tạo bảng writing_submissions (bài nộp của học sinh có giám sát thi)
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
  tab_violations INT NOT NULL DEFAULT 0,
  violation_penalty DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_forced_submit TINYINT(1) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  graded_at TIMESTAMP NULL,
  UNIQUE KEY uq_writing_submission (test_id, student_id),
  INDEX idx_writing_status (status),
  CONSTRAINT fk_writing_test FOREIGN KEY (test_id) REFERENCES imported_tests(id) ON DELETE CASCADE,
  CONSTRAINT fk_writing_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bổ sung các cột nếu bảng đã tồn tại từ trước
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS tab_violations INT NOT NULL DEFAULT 0;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS violation_penalty DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE writing_submissions ADD COLUMN IF NOT EXISTS is_forced_submit TINYINT(1) NOT NULL DEFAULT 0;

-- 5. Cấp quyền đầy đủ cho tài khoản engo_app
GRANT ALL PRIVILEGES ON engo.* TO 'engo_app'@'localhost';
FLUSH PRIVILEGES;