require('dotenv').config();          // Load env first

const express = require('express');
const cors = require('cors');
const path = require('path');

// Allow requests from the configured frontend
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const corsOptions = {
  origin: CORS_ORIGIN,
  optionsSuccessStatus: 200   // Legacy browser fallback
};

const studentRoutes = require('./routes/students');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Student API
app.use('/api/students', studentRoutes);

// Let the frontend handle unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Student Management System running at http://localhost:${PORT}`);
});
