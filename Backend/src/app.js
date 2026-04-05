const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/status', require('./routes/statusRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));

module.exports = app;
