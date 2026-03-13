# Student Record Management System

**Course:** IT323 - Information Management  
**Project:** Midterm PIT  
**Academic Year:** 2025–2026

## Developers

- Bene Gabriel Rosel
- Joeremy Christie Ong
- Vince Roy Lim

## Overview

A full-stack web application for managing student records. Supports adding, viewing, editing, deleting, searching, and filtering student data through a responsive browser interface backed by a REST API and MySQL database.

## Features

- Add student record
- View all students
- Edit student record
- Delete student record
- Search student by name
- Filter by course

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL |
| Frontend | HTML, CSS, JavaScript (Vanilla) |

## Architecture

The system follows a **three-tier architecture**:

```
Client Browser
      ↓
Frontend (HTML + CSS + JS)
      ↓  HTTP / JSON
Node.js + Express (REST API)
      ↓  Parameterized SQL
MySQL Database
```

## Database

**Database:** `student_management`  
**Table:** `students`

| Column | Type | Constraints |
|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `student_number` | VARCHAR(20) | UNIQUE, NOT NULL |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `course` | VARCHAR(100) | NOT NULL |
| `year_level` | INT | NOT NULL, CHECK (1–5) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/students` | Get all students |
| GET | `/api/students/:id` | Get single student |
| POST | `/api/students` | Add new student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| GET | `/api/students/search/:keyword` | Search by name/ID |

## Project Structure

```
studrec/
├── server.js
├── package.json
├── .env.example
├── config/
│   └── db.js
├── routes/
│   └── students.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── script.js
├── database/
│   ├── schema.sql
│   └── seed.sql
└── docs/
    └── IT323-Midterm-PIT-Documentation.pdf
```

## Setup

**Prerequisites:** Node.js (v16+), MySQL 8

1. **Import the database**

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and fill in your MySQL credentials:

   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=student_management
   PORT=3000
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Start the server**

   ```bash
   node server.js
   ```

5. **Open the app**

   ```
   http://localhost:3000
   ```

## Screenshots

Screenshots of the database, Postman tests, desktop view, and mobile view are included in the documentation PDF.

## Documentation

Full technical documentation is available at:

```
docs/IT323-Midterm-PIT-Documentation.pdf
```

Includes: ER diagram, API documentation, system architecture, database design rationale, API flow explanation, challenges encountered, and future improvements.

---

*This project was developed for academic purposes as part of IT323 - Information Management, Midterm PIT.*
