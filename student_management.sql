-- ============================================================
-- Student Record Management System
-- IT323 – Midterm PIT
-- Database: student_management
-- ============================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS student_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE student_management;

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_number VARCHAR(20)  UNIQUE NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  course         VARCHAR(100) NOT NULL,
  year_level     INT          NOT NULL CHECK (year_level BETWEEN 1 AND 5),
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAMPLE DATA (optional seeding)
-- ============================================================
INSERT INTO students (student_number, first_name, last_name, course, year_level) VALUES
  ('2023300001', 'Maria',   'Santos',    'BSIT', 2),
  ('2023300002', 'Jose',    'Reyes',     'BSCS', 3),
  ('2023300003', 'Ana',     'Cruz',      'BSCE', 1),
  ('2023300004', 'Pedro',   'Garcia',    'BSIT', 4),
  ('2023300005', 'Luz',     'Bautista',  'BSN',  2),
  ('2023300006', 'Miguel',  'Torres',    'BSME', 3),
  ('2023300007', 'Elena',   'Aquino',    'BSBA', 1),
  ('2023300008', 'Carlos',  'Ramirez',   'BSIT', 2),
  ('2023300009', 'Sofia',   'Castillo',  'BSCS', 4),
  ('2023300010', 'Roberto', 'Mendoza',   'BSCE', 3);

-- ============================================================
-- DML QUERY DEMONSTRATIONS
-- Run these after importing the schema + seed data above.
-- ============================================================

-- SELECT all students, ordered by last name ASC
SELECT * FROM students ORDER BY last_name ASC;

-- SELECT a single student by ID
SELECT * FROM students WHERE id = 1;

-- SEARCH using LIKE across multiple fields
SELECT * FROM students
WHERE first_name  LIKE '%an%'
   OR last_name   LIKE '%an%'
   OR student_number LIKE '%an%'
   OR course      LIKE '%an%'
ORDER BY last_name ASC;

-- INSERT a new student
INSERT INTO students (student_number, first_name, last_name, course, year_level)
VALUES ('2023300011', 'Andrea', 'Flores', 'BSIT', 1);

-- UPDATE an existing student record
UPDATE students
SET student_number = '2023300011',
    first_name     = 'Andrea',
    last_name      = 'Flores',
    course         = 'BSCS',
    year_level     = 2
WHERE id = 11;

-- DELETE a student record
DELETE FROM students WHERE id = 11;
