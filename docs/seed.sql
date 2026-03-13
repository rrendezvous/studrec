-- ============================================================
-- Student Record Management System
-- IT323 – Midterm PIT
-- FILE: seed.sql
-- Purpose: Insert sample student records for demonstration.
--          Run this file AFTER schema.sql.
-- ============================================================

USE student_management;

INSERT INTO students (student_number, first_name, last_name, course, year_level) VALUES
  ('2023300001', 'Maria',   'Santos',   'BSIT', 2),
  ('2023300002', 'Jose',    'Reyes',    'BSCS', 3),
  ('2023300003', 'Ana',     'Cruz',     'BSCE', 1),
  ('2023300004', 'Pedro',   'Garcia',   'BSIT', 4),
  ('2023300005', 'Luz',     'Bautista', 'BSN',  2),
  ('2023300006', 'Miguel',  'Torres',   'BSME', 3),
  ('2023300007', 'Elena',   'Aquino',   'BSBA', 1),
  ('2023300008', 'Carlos',  'Ramirez',  'BSIT', 2),
  ('2023300009', 'Sofia',   'Castillo', 'BSCS', 4),
  ('2023300010', 'Roberto', 'Mendoza',  'BSCE', 3);
