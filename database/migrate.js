const mysql = require('mysql2/promise');
const readline = require('readline');

async function migrateWithConn(conn) {
  console.log('1. Checking users table...');
  const [userCols] = await conn.query("SHOW COLUMNS FROM users LIKE 'class_name'");
  if (userCols.length === 0) {
    await conn.query("ALTER TABLE users ADD COLUMN class_name VARCHAR(50) NULL AFTER role");
    console.log('-> OK: Added class_name to users table');
  } else {
    console.log('-> INFO: class_name already in users');
  }

  console.log('2. Creating imported_tests table...');
  await conn.query(
    "CREATE TABLE IF NOT EXISTS imported_tests (" +
    "  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY," +
    "  teacher_id BIGINT UNSIGNED NOT NULL," +
    "  title VARCHAR(255) NOT NULL," +
    "  source_file_name VARCHAR(255) NOT NULL," +
    "  class_name VARCHAR(50) NULL," +
    "  questions_json JSON NOT NULL," +
    "  summary_json JSON NOT NULL," +
    "  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "  INDEX idx_imported_tests_created_at (created_at)," +
    "  INDEX idx_imported_tests_class (class_name)," +
    "  CONSTRAINT fk_imported_tests_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
  console.log('-> OK: imported_tests table is ready');

  console.log('3. Creating writing_submissions table...');
  await conn.query(
    "CREATE TABLE IF NOT EXISTS writing_submissions (" +
    "  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY," +
    "  test_id BIGINT UNSIGNED NOT NULL," +
    "  student_id BIGINT UNSIGNED NOT NULL," +
    "  objective_answers_json JSON NOT NULL," +
    "  writing_answers_json JSON NOT NULL," +
    "  objective_score DECIMAL(5,2) NOT NULL DEFAULT 0," +
    "  manual_score DECIMAL(5,2) NULL," +
    "  teacher_feedback TEXT NULL," +
    "  status VARCHAR(32) NOT NULL DEFAULT 'pending_manual'," +
    "  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
    "  graded_at TIMESTAMP NULL," +
    "  UNIQUE KEY uq_writing_submission (test_id, student_id)," +
    "  INDEX idx_writing_status (status)," +
    "  CONSTRAINT fk_writing_test FOREIGN KEY (test_id) REFERENCES imported_tests(id) ON DELETE CASCADE," +
    "  CONSTRAINT fk_writing_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
  console.log('-> OK: writing_submissions table is ready');

  try {
    await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE ON engo.users TO 'engo_app'@'localhost'");
    await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE ON engo.imported_tests TO 'engo_app'@'localhost'");
    await conn.query("GRANT SELECT, INSERT, UPDATE, DELETE ON engo.writing_submissions TO 'engo_app'@'localhost'");
    await conn.query("FLUSH PRIVILEGES");
    console.log('-> OK: Permissions granted to engo_app');
  } catch (err) {
    // Ignore if not root
  }
}

async function main() {
  // First try with engo_app credentials
  console.log('--- Đang thử cập nhật CSDL bằng tài khoản engo_app ---');
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'engo_app',
      password: 'Engo_App_2026_Strong!',
      database: 'engo'
    });
    await migrateWithConn(conn);
    await conn.end();
    console.log('\n=== CẬP NHẬT DATABASE THÀNH CÔNG RỰC RỠ! ===');
    process.exit(0);
  } catch (err) {
    console.log('Không thể dùng tài khoản engo_app (Lý do:', err.message, ')');
    console.log('--- Cần mật khẩu tài khoản ROOT của MySQL ---');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Nhập mật khẩu root MySQL: ', async (pwd) => {
      rl.close();
      try {
        const rootConn = await mysql.createConnection({
          host: '127.0.0.1',
          port: 3306,
          user: 'root',
          password: pwd,
          database: 'engo'
        });
        await migrateWithConn(rootConn);
        await rootConn.end();
        console.log('\n=== CẬP NHẬT DATABASE THÀNH CÔNG BẰNG ROOT! ===');
      } catch (rootErr) {
        console.error('Lỗi khi đăng nhập root:', rootErr.message);
      }
    });
  }
}

main();

