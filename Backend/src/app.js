const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Routes
app.use('/api/status', require('./routes/statusRoutes'));
app.use('/api/transportation', require('./routes/transportationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

module.exports = app;
