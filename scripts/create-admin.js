require("dotenv").config();

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const fullName = "Quản trị viên ENGO";
    const email = "admin@engo.local";
    const password = "Admin@123456";

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO users
      (
        full_name,
        email,
        password_hash,
        role,
        status
      )
      VALUES (?, ?, ?, 'admin', 'active')
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        password_hash = VALUES(password_hash),
        role = 'admin',
        status = 'active'`,
      [
        fullName,
        email,
        passwordHash,
      ]
    );

    console.log("Đã tạo tài khoản quản trị.");
    console.log(`Email: ${email}`);
    console.log(`Mật khẩu: ${password}`);
  } finally {
    await connection.end();
  }
}

createAdmin().catch((error) => {
  console.error("Không tạo được tài khoản quản trị:");
  console.error(error);
  process.exit(1);
});
