-- Run in MySQL Workbench while connected as a privileged user (e.g. root) on port 3306.
-- Use this when you are NOT using Docker and already have MySQL Server on Windows.

CREATE DATABASE IF NOT EXISTS bidzone CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'bidzone'@'localhost' IDENTIFIED BY 'bidzone';
CREATE USER IF NOT EXISTS 'bidzone'@'127.0.0.1' IDENTIFIED BY 'bidzone';

GRANT ALL PRIVILEGES ON bidzone.* TO 'bidzone'@'localhost';
GRANT ALL PRIVILEGES ON bidzone.* TO 'bidzone'@'127.0.0.1';

FLUSH PRIVILEGES;
