-- ENGO v4: ngân hàng đề theo khối (6-9) + 52 lớp 6A1..9A13. Chạy bằng root (Railway: đổi USE thành tên database).
USE railway;
DROP PROCEDURE IF EXISTS engo_add_column;
DELIMITER $$
CREATE PROCEDURE engo_add_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;
CALL engo_add_column('imported_tests', 'grade', 'TINYINT NULL');
DROP PROCEDURE IF EXISTS engo_add_column;
-- (Các lớp 6A1..9A13 được server tự chèn vào class_settings khi khởi động.)
