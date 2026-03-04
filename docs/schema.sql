-- ============================================================
-- Student Record Management System
-- IT323 – Midterm PIT
-- FILE: schema.sql
-- Purpose: Create the database and students table structure.
--          Run this file first, before seed.sql.
-- ============================================================

CREATE DATABASE IF NOT EXISTS student_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_management;

CREATE TABLE IF NOT EXISTS students (
  id             INT          AUTO_INCREMENT PRIMARY KEY,
  student_number VARCHAR(20)  UNIQUE NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  course         VARCHAR(100) NOT NULL,
  year_level     INT          NOT NULL CHECK (year_level BETWEEN 1 AND 5),
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
