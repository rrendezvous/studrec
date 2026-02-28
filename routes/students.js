const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/students/search/:keyword  – must be defined BEFORE /:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search/:keyword', async (req, res) => {
    try {
        const keyword = `%${req.params.keyword}%`;
        const [rows] = await db.execute(
            `SELECT * FROM students
       WHERE first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? OR course LIKE ?
       ORDER BY last_name ASC`,
            [keyword, keyword, keyword, keyword]
        );
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ success: false, message: 'Server error during search.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/students  – fetch all students
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM students ORDER BY last_name ASC'
        );
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        console.error('Fetch all error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve students.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/students/:id  – fetch single student
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM students WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Fetch by ID error:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve student.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/students  – create new student
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { student_number, first_name, last_name, course, year_level } = req.body;

    // Validation
    if (!student_number || !first_name || !last_name || !course || !year_level) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: student_number, first_name, last_name, course, year_level.'
        });
    }

    const yearInt = parseInt(year_level, 10);
    if (isNaN(yearInt) || yearInt < 1 || yearInt > 6) {
        return res.status(400).json({ success: false, message: 'year_level must be a number between 1 and 6.' });
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO students (student_number, first_name, last_name, course, year_level) VALUES (?, ?, ?, ?, ?)',
            [student_number.trim(), first_name.trim(), last_name.trim(), course.trim(), yearInt]
        );
        const [newStudent] = await db.execute('SELECT * FROM students WHERE id = ?', [result.insertId]);
        res.status(201).json({ success: true, message: 'Student created successfully.', data: newStudent[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Student number already exists.' });
        }
        console.error('Create error:', err);
        res.status(500).json({ success: false, message: 'Failed to create student.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/students/:id  – update student
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
    const { student_number, first_name, last_name, course, year_level } = req.body;

    if (!student_number || !first_name || !last_name || !course || !year_level) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: student_number, first_name, last_name, course, year_level.'
        });
    }

    const yearInt = parseInt(year_level, 10);
    if (isNaN(yearInt) || yearInt < 1 || yearInt > 6) {
        return res.status(400).json({ success: false, message: 'year_level must be a number between 1 and 6.' });
    }

    try {
        const [check] = await db.execute('SELECT id FROM students WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        await db.execute(
            'UPDATE students SET student_number = ?, first_name = ?, last_name = ?, course = ?, year_level = ? WHERE id = ?',
            [student_number.trim(), first_name.trim(), last_name.trim(), course.trim(), yearInt, req.params.id]
        );

        const [updated] = await db.execute('SELECT * FROM students WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Student updated successfully.', data: updated[0] });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Student number already exists.' });
        }
        console.error('Update error:', err);
        res.status(500).json({ success: false, message: 'Failed to update student.' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/students/:id  – delete student
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const [check] = await db.execute('SELECT id FROM students WHERE id = ?', [req.params.id]);
        if (check.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        await db.execute('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.status(200).json({ success: true, message: 'Student deleted successfully.' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete student.' });
    }
});

module.exports = router;
