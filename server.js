require('dotenv').config();          // load .env before anything else reads process.env

const express = require('express');
const cors = require('cors');
const path = require('path');

// Only allow requests from the configured origin (defaults to localhost:3000).
// Set CORS_ORIGIN in .env to override for staging / production deployments.
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const corsOptions = {
  origin: CORS_ORIGIN,
  optionsSuccessStatus: 200   // for legacy browser compatibility
};

const studentRoutes = require('./routes/students');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/students', studentRoutes);

// Catch-all: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Student Management System running at http://localhost:${PORT}`);
});
