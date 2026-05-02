const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/status', require('./routes/statusRoutes'));
app.use('/api/transportation', require('./routes/transportationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/hotels', require('./routes/hotelRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/tourpacks', require('./routes/tourPackRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));

app.use((err, req, res, next) => {
	console.error('Unhandled app error:', err && err.message ? err.message : err);
	const status = err && err.status ? err.status : 500;
	res.status(status).json({
		success: false,
		message: err && err.message ? err.message : 'Internal server error',
	});
});

module.exports = app;
