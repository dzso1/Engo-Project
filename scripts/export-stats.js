/*
 * scripts/export-stats.js
 * Xuất SỐ LIỆU SỬ DỤNG TỔNG HỢP của ENGO để viết báo cáo.
 * - Chỉ ĐỌC cơ sở dữ liệu, không ghi, không sửa gì.
 * - Chỉ in ra số đếm / trung bình, KHÔNG in tên, email hay nội dung bài làm của học sinh.
 * Cách chạy (trong thư mục engo-web, khi MySQL đang bật):
 *     node scripts/export-stats.js
 * rồi copy toàn bộ phần chữ in ra, dán vào khung chat.
 */
require("dotenv").config();
const pool = require("../database/db");

const out = { thoi_diem_xuat: new Date().toISOString() };

async function q(label, sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    out[label] = rows;
  } catch (e) {
    out[label] = { loi: e.code || e.message };
  }
}

(async () => {
  // ---------- Người dùng ----------
  await q("nguoi_dung_theo_vai_tro", "SELECT role, COUNT(*) AS so_luong FROM users GROUP BY role");
  await q("hoc_sinh_theo_lop",
    "SELECT class_name AS lop, COUNT(*) AS so_hs FROM users WHERE role='student' GROUP BY class_name ORDER BY class_name");

  // ---------- Mức độ sử dụng ----------
  await q("su_kien_hoc_tap_theo_loai",
    "SELECT event_type AS loai, COUNT(*) AS so_luot, COUNT(DISTINCT student_id) AS so_hs, ROUND(AVG(CASE WHEN max_score>0 THEN score/max_score*100 END),1) AS diem_tb_phan_tram FROM learning_events GROUP BY event_type ORDER BY so_luot DESC");
  await q("khoang_thoi_gian",
    "SELECT MIN(created_at) AS bat_dau, MAX(created_at) AS ket_thuc, COUNT(DISTINCT DATE(created_at)) AS so_ngay_co_hoat_dong FROM learning_events");
  await q("hoat_dong_theo_lop",
    `SELECT u.class_name AS lop, COUNT(DISTINCT u.id) AS so_hs_da_dung, COUNT(e.id) AS so_luot
       FROM learning_events e JOIN users u ON u.id=e.student_id
      GROUP BY u.class_name ORDER BY u.class_name`);
  await q("hoat_dong_theo_tuan",
    "SELECT YEARWEEK(created_at,1) AS tuan, COUNT(*) AS so_luot, COUNT(DISTINCT student_id) AS so_hs FROM learning_events GROUP BY tuan ORDER BY tuan");

  // ---------- Luyện nói ----------
  await q("luyen_noi_tong",
    "SELECT COUNT(*) AS so_luot_doc, COUNT(DISTINCT student_id) AS so_hs, ROUND(AVG(accuracy),1) AS do_chuan_tb FROM speaking_attempts");
  await q("luyen_noi_theo_tuan",
    "SELECT YEARWEEK(created_at,1) AS tuan, COUNT(*) AS so_luot, ROUND(AVG(accuracy),1) AS do_chuan_tb FROM speaking_attempts GROUP BY tuan ORDER BY tuan");
  // Tiến bộ từng học sinh: trung bình 3 lượt đầu so với 3 lượt cuối (chỉ tính HS có >= 6 lượt)
  await q("luyen_noi_tien_bo",
    `SELECT COUNT(*) AS so_hs_du_6_luot,
            ROUND(AVG(dau),1) AS tb_3_luot_dau, ROUND(AVG(cuoi),1) AS tb_3_luot_cuoi,
            SUM(cuoi > dau) AS so_hs_tien_bo
       FROM (
         SELECT student_id,
                AVG(CASE WHEN rn <= 3 THEN accuracy END) AS dau,
                AVG(CASE WHEN rn_desc <= 3 THEN accuracy END) AS cuoi
           FROM (SELECT student_id, accuracy,
                        ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at) AS rn,
                        ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at DESC) AS rn_desc,
                        COUNT(*) OVER (PARTITION BY student_id) AS n
                   FROM speaking_attempts) t
          WHERE n >= 6
          GROUP BY student_id) s`);

  // ---------- Bài kiểm tra ----------
  await q("bai_kiem_tra_da_tao", "SELECT COUNT(*) AS so_de FROM imported_tests");
  await q("bai_kiem_tra_da_nop",
    `SELECT COUNT(*) AS so_bai, COUNT(DISTINCT student_id) AS so_hs,
            ROUND(AVG(objective_score),2) AS diem_trac_nghiem_tb,
            ROUND(AVG(manual_score),2) AS diem_gv_cham_tb,
            SUM(status='graded') AS so_bai_gv_da_cham
       FROM writing_submissions`);
  await q("thi_trung_thuc",
    `SELECT COUNT(*) AS so_bai,
            SUM(tab_violations=0) AS khong_roi_tab, SUM(tab_violations=1) AS roi_1_lan,
            SUM(tab_violations=2) AS roi_2_lan, SUM(tab_violations>=3) AS roi_3_lan_tro_len,
            SUM(is_forced_submit=1) AS bi_tu_dong_nop
       FROM writing_submissions`);
  await q("thi_trung_thuc_theo_tuan",
    `SELECT YEARWEEK(submitted_at,1) AS tuan, COUNT(*) AS so_bai,
            ROUND(SUM(tab_violations=0)/COUNT(*)*100,1) AS pt_khong_roi_tab
       FROM writing_submissions GROUP BY tuan ORDER BY tuan`);
  // Tiến bộ qua bài kiểm tra: bài đầu so với bài gần nhất (HS có >= 2 bài)
  await q("kiem_tra_tien_bo",
    `SELECT COUNT(*) AS so_hs_du_2_bai, ROUND(AVG(dau),2) AS diem_bai_dau_tb, ROUND(AVG(cuoi),2) AS diem_bai_cuoi_tb,
            SUM(cuoi > dau) AS so_hs_tang_diem
       FROM (SELECT student_id,
                    MAX(CASE WHEN rn=1 THEN objective_score END) AS dau,
                    MAX(CASE WHEN rn_desc=1 THEN objective_score END) AS cuoi
               FROM (SELECT student_id, objective_score,
                            ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY submitted_at) rn,
                            ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY submitted_at DESC) rn_desc,
                            COUNT(*) OVER (PARTITION BY student_id) n
                       FROM writing_submissions) t
              WHERE n >= 2 GROUP BY student_id) s`);

  // ---------- Trò chơi hoá ----------
  await q("phan_thuong",
    "SELECT COUNT(*) AS so_hs, ROUND(AVG(xp),0) AS xp_tb, MAX(xp) AS xp_cao_nhat FROM student_rewards");

  console.log("===== BAT DAU SO LIEU ENGO (copy tu day) =====");
  console.log(JSON.stringify(out, null, 1));
  console.log("===== KET THUC SO LIEU ENGO =====");
  await pool.end();
})().catch(async (e) => {
  console.error("Khong xuat duoc so lieu:", e.message);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
