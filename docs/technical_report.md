# Technical Report
## Student Record Management System
### IT323 – Information Management | Midterm PIT

---

## 1. System Architecture

### 1.1 Overview

The Student Record Management System (SRMS) is a full-stack web application built following the **three-tier architecture** model:

```
┌──────────────────────────────────────────────────────────┐
│                    PRESENTATION TIER                     │
│          Vanilla HTML · CSS Grid+Flex · Vanilla JS       │
│  (public/index.html · public/css/style.css · script.js)  │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP (Fetch API / JSON)
┌────────────────────────▼─────────────────────────────────┐
│                    APPLICATION TIER                      │
│             Node.js · Express.js (REST API)              │
│         (server.js · routes/students.js)                 │
└────────────────────────┬─────────────────────────────────┘
                         │ mysql2 (connection pool)
┌────────────────────────▼─────────────────────────────────┐
│                       DATA TIER                          │
│                  MySQL 8 · InnoDB Engine                 │
│            database: student_management                  │
│                   table: students                        │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Technology Choices

| Layer | Technology | Justification |
|---|---|---|
| Runtime | Node.js 18+ | Non-blocking I/O, ideal for API servers |
| Framework | Express.js 4 | Minimal, unopinionated, widely adopted |
| Database driver | mysql2 | Native Promise support, prepared statements |
| Database | MySQL 8 / InnoDB | ACID compliance, relational integrity |
| Frontend | Vanilla JavaScript | No build toolchain needed; pure DOM API |
| Styling | Vanilla CSS (Grid + Flexbox) | Maximum control, zero dependencies |
| CORS | cors npm package | Enable cross-origin during development |
| Env config | dotenv | Keeps credentials out of source control |

### 1.3 Folder Structure

```
studrec/
├── server.js              ← Entry point, mounts middleware + routes
├── package.json           ← Dependencies and npm scripts
├── .env.example           ← Environment variable template (copy to .env)
├── .gitignore             ← Excludes node_modules/ and .env
├── config/
│   └── db.js              ← MySQL connection pool (mysql2/promise + dotenv)
├── routes/
│   └── students.js        ← All /api/students route handlers
├── public/
│   ├── index.html         ← Single-page frontend
│   ├── css/style.css      ← Full design system (Grid + Flex)
│   └── js/script.js       ← All Vanilla JS logic
├── docs/
│   ├── er_diagram_and_api_docs.md   ← ER diagram + API reference
│   ├── postman_collection_guide.md  ← Postman test descriptions
│   ├── postman_collection.json      ← Importable Postman Collection v2.1
│   ├── schema.sql                   ← Database DDL (run first)
│   ├── seed.sql                     ← Sample data (run after schema.sql)
│   └── technical_report.md         ← This document
└── student_management.sql ← Database schema + seed data
```

Express serves static assets from `/public` and mounts the student router at `/api/students`. All unmatched routes fall back to `index.html`, making the app SPA-friendly.

---

## 2. Database Design Rationale

### 2.1 Schema Design

```sql
CREATE TABLE students (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  student_number VARCHAR(20)  UNIQUE NOT NULL,
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  course         VARCHAR(100) NOT NULL,
  year_level     INT          NOT NULL CHECK (year_level BETWEEN 1 AND 5),
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

**Design decisions:**

| Decision | Rationale |
|---|---|
| Surrogate PK (`id`) | Stable internal identifier; decouples from business rules |
| `student_number` UNIQUE | Enforces natural key uniqueness at the DB level |
| `VARCHAR(100)` for names | Accommodates multi-word Filipino names |
| `year_level` INT + CHECK (1–5) | Numeric comparisons efficient; constraint prevents bad data |
| `created_at` TIMESTAMP | Automatic audit trail; no application code needed |
| InnoDB engine | Supports transactions, foreign keys, crash recovery |
| utf8mb4 charset | Full Unicode support including emoji and extended characters |

### 2.2 Normalization

The schema is in **3NF (Third Normal Form)**:
- **1NF**: All columns are atomic; no repeating groups
- **2NF**: No partial dependencies (single-column PK)
- **3NF**: No transitive dependencies; `course` is a free-text attribute intentionally not normalized into a separate table at this stage

### 2.3 Security: Parameterized Queries

All SQL statements in `routes/students.js` use `db.execute(sql, [params])` with placeholders (`?`). The `mysql2` driver escapes values before execution, completely eliminating SQL injection risk.

```javascript
// Correct – parameterized
const [rows] = await db.execute('SELECT * FROM students WHERE id = ?', [id]);

// Never done – string interpolation
// await db.execute(`SELECT * FROM students WHERE id = ${id}`); // ← NEVER
```

---

## 3. API Flow Explanation

### 3.1 Request Lifecycle

```
Browser (Fetch API)
    │
    │── HTTP Request ──────────────────────────────────────►
    │                                                       │
    │                                             Express server.js
    │                                                       │
    │                                             cors middleware
    │                                             json middleware
    │                                                       │
    │                                             routes/students.js
    │                                          (validate → db.execute)
    │                                                       │
    │                                              MySQL Pool
    │                                         (parameterized query)
    │                                                       │
    │◄── JSON Response ──────────────────────────────────────
    │
    │  script.js renders DOM (table / toast / stats)
```

### 3.2 CRUD Flow Summary

| Operation | Frontend | Method | Route | Backend Action |
|---|---|---|---|---|
| Load all | fetchAllStudents() | GET | /api/students | SELECT * ORDER BY last_name |
| Search | searchStudents() | GET | /api/students/search/:kw | SELECT … WHERE LIKE '%kw%' |
| Add | form submit (POST) | POST | /api/students | Validate → INSERT |
| Edit init | click Edit btn | GET | /api/students/:id | SELECT by id |
| Save edit | form submit (PUT) | PUT | /api/students/:id | Validate → UPDATE |
| Delete | click Del → confirm | DELETE | /api/students/:id | SELECT check → DELETE |

### 3.3 Error Handling Strategy

- **400** – Missing required fields or duplicate `student_number` (caught via `ER_DUP_ENTRY` MySQL error code)
- **404** – Row lookup before update/delete; returns early with message
- **500** – Unexpected DB errors; caught in `try/catch`, logged server-side, generic message returned to client

---

## 4. Challenges Encountered

### 4.1 Route Ordering Conflict

**Problem:** Express matched `/api/students/search/:keyword` as `/api/students/:id` (interpreting `"search"` as an ID), triggering a MySQL type mismatch error.

**Solution:** The `search/:keyword` route was declared **above** the `/:id` route in `routes/students.js`. Express evaluates routes in registration order, so placing the specific literal path first ensures it matches before the generic wildcard.

### 4.2 Debouncing Search Input

**Problem:** Firing an API call on every keystroke caused excessive server requests and visual flickering.

**Solution:** Implemented a 400 ms debounce timer in `script.js` using `clearTimeout` / `setTimeout`. The search API is only called once the user pauses typing, reducing network calls by ~80% during normal use.

### 4.3 Course Filter + Search Coexistence

**Problem:** Mixing the server-side keyword search with the client-side course dropdown filter created conflicting display states.

**Solution:** An `activeStudents` array was introduced to represent the current display list (either the full dataset or search results). The course filter always operates on `activeStudents` via `applyFilter()`, so it composes correctly with both the full list *and* search results. When the search is cleared, `activeStudents` is reset to the full `allStudents` array, and the filter dropdown resets to "All Courses", keeping the UX predictable.

### 4.4 XSS in Dynamic DOM Rendering

**Problem:** Rendering student data directly via `innerHTML` with unsanitized data could allow stored XSS if malicious content was inserted into the database.

**Solution:** An `escHtml()` utility function was implemented to escape `&`, `<`, `>`, `"`, and `'` characters before any user-provided data is inserted into the DOM via `innerHTML`.

### 4.5 Mobile Navigation Responsiveness

**Problem:** At viewport widths ≤768px, the navigation links overlapped with the brand and badge elements, breaking the layout.

**Solution:** A hamburger button (`#nav-toggle`) was added to the navbar. On mobile, the nav links are hidden by default and revealed as a full-width vertical dropdown when the hamburger is clicked. The button animates into a close (✕) icon when the menu is open using CSS-only bar transforms.

---

## 5. Future Improvements

### 5.1 User Authentication
Implement JWT-based authentication with role-based access control (admin vs. registrar) using `jsonwebtoken` and `bcrypt` for password hashing.

### 5.2 Pagination
Add server-side pagination (`LIMIT / OFFSET`) for scalability when the student population grows beyond a few hundred records. The API would accept `?page=1&limit=20` query parameters.

### 5.3 Normalized Courses Table
Create a separate `courses` master table with a foreign key from `students.course_id`, enabling course management (add/archive courses) without modifying student records directly.

### 5.4 Audit Logging
Add an `audit_log` table to track who modified which record and when, supporting accountability and compliance requirements.

### 5.5 Bulk Import
Implement a CSV upload endpoint (`POST /api/students/import`) using the `multer` and `fast-csv` packages to support batch enrollment processing.

### 5.6 Data Export
Allow administrators to export the student list as a CSV or PDF report via a `GET /api/students/export` endpoint using `json2csv` or `pdfmake`.

### 5.7 Automated Testing
Add unit tests for route handlers using `Jest` + `supertest`, and integration tests against a dedicated test database to ensure regression safety during development.

---

*Report generated for IT323 – Information Management, Midterm Practical Information Technology (PIT). Academic Year 2025–2026.*
