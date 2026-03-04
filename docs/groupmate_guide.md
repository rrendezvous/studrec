# Groupmate Setup Guide
## Student Record Management System — IT323 Midterm PIT

> **Audience:** This guide assumes you have little to no Node.js experience. Follow each step in order.

---

## Prerequisites

Make sure these are installed on your computer before starting:

| Software | Version | Download |
|---|---|---|
| **Node.js** | 16 or higher | [https://nodejs.org](https://nodejs.org) (choose LTS) |
| **MySQL** | 8.x | [https://dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/) |
| **Git** | Any recent | [https://git-scm.com](https://git-scm.com) |

> **Tip:** After installing Node.js, open a terminal and type `node -v` to verify. You should see something like `v18.17.0`.

---

## Step 1 — Clone or Download the Project

If you have Git installed:

```bash
git clone <repository-url>
cd studrec
```

Or download the project as a ZIP and extract it into a folder called `studrec`.

---

## Step 2 — Install Dependencies

Open a terminal **inside the `studrec` folder** and run:

```bash
npm install
```

This reads `package.json` and downloads the required packages (`express`, `mysql2`, `cors`, `dotenv`) into a `node_modules/` folder. It may take a minute.

---

## Step 3 — Configure Environment Variables

1. Find the file `.env.example` in the project root.
2. **Copy** it and rename the copy to `.env` (just `.env`, no extension).
3. Open `.env` in any text editor and fill in your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=student_management
PORT=3000
CORS_ORIGIN=http://localhost:3000
```

> **Important:** Replace `your_mysql_password_here` with the password you set when installing MySQL.

---

## Step 4 — Import the Database

1. Open **MySQL Workbench**, **phpMyAdmin**, or the MySQL command-line client.
2. Run the SQL file to create the database and table:

**Option A — MySQL command line:**

```bash
mysql -u root -p < student_management.sql
```

**Option B — MySQL Workbench:**

- Open MySQL Workbench → connect to your server
- File → Open SQL Script → select `student_management.sql`
- Click the ⚡ Execute button

This creates the `student_management` database, the `students` table, and inserts 10 sample records.

> **Alternative:** You can also run `docs/schema.sql` first (creates the database and table), then `docs/seed.sql` (inserts sample data) if you prefer to separate structure from data.

---

## Step 5 — Run the Server

In your terminal (still inside the `studrec` folder):

```bash
node server.js
```

You should see:

```
Connected to MySQL database.
Student Management System running at http://localhost:3000
```

> **Troubleshooting:** If you see "Database connection failed", double-check your `.env` credentials and make sure MySQL is running.

---

## Step 6 — Open the Application

Open your browser and go to:

```
http://localhost:3000
```

You should see the Student Record Management System with 10 sample records loaded.

---

## Basic Usage

### Register a Student
1. Fill in all fields in the **Student Registration** form (student number must be exactly 10 digits).
2. Click **Register Student**.
3. The new record appears in the table immediately (no page reload).

### Edit a Student
1. Click the **✏️ Edit** button on any row.
2. The form scrolls up and populates with that student's data.
3. Modify the fields and click **Update Student**.
4. Click **✕ Cancel Edit** to go back to add mode without saving.

### Delete a Student
1. Click the **🗑️ Del** button on any row.
2. Confirm the deletion in the popup dialog.

### Search
- Type in the **search bar** — results update automatically after you stop typing.
- Search works across name, student number, and course.

### Filter by Course
- Use the **All Courses** dropdown to filter the table by a specific course.
- The filter works on top of search results too.

### Refresh
- Click the **↻ Refresh** button to reload all records and clear search/filter.

---

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

---

## Folder Structure (Quick Reference)

```
studrec/
├── server.js              ← Main entry point
├── config/db.js           ← Database connection
├── routes/students.js     ← API route handlers
├── public/                ← Frontend (HTML, CSS, JS)
├── docs/                  ← Documentation
├── pics/                  ← Diagrams
├── student_management.sql ← Database setup script
├── .env.example           ← Template for environment variables
└── package.json           ← Project metadata & dependencies
```

---

*Academic Year 2025–2026 · IT323 – Information Management · Midterm PIT*
