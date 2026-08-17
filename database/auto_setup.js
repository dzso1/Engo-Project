const mysql = require('mysql2/promise');

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'engo_app',
      password: 'Engo_App_2026_Strong!',
      database: 'engo'
    });
    console.log('Connected successfully as engo_app!');

    // 1. Check and add class_name to users
    try {
      const [cols] = await conn.query("SHOW COLUMNS FROM users LIKE 'class_name'");
      if (cols.length === 0) {
        await conn.query("ALTER TABLE users ADD COLUMN class_name VARCHAR(50) NULL AFTER role");
        console.log('OK: Added class_name to users table');
      } else {
        console.log('INFO: class_name already exists in users');
      }
    } catch(e) {
      console.log('ALTER users status:', e.message);
    }

    // 2. Create imported_tests
    try {
      await conn.query(
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      );
      console.log('OK: imported_tests created/exists');
    } catch(e) {
      console.log('CREATE imported_tests status:', e.message);
    }

    // 3. Check and add class_name to imported_tests
    try {
      const [cols] = await conn.query("SHOW COLUMNS FROM imported_tests LIKE 'class_name'");
      if (cols.length === 0) {
        await conn.query("ALTER TABLE imported_tests ADD COLUMN class_name VARCHAR(50) NULL AFTER source_file_name");
        console.log('OK: Added class_name to imported_tests');
      } else {
        console.log('INFO: class_name exists in imported_tests');
      }
    } catch(e) {
      console.log('ALTER imported_tests status:', e.message);
    }

    // 4. Create writing_submissions
    try {
      await conn.query(
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      );
      console.log('OK: writing_submissions created/exists');
    } catch(e) {
      console.log('CREATE writing_submissions status:', e.message);
    }

    await conn.end();
  } catch(e) {
    console.error('Connection failed:', e.message);
  }
}

run();
