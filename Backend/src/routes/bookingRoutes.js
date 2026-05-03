const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.route('/').get(protect, admin, getAllBookings).post(protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.route('/:id').get(protect, getBookingById).patch(protect, admin, updateBookingStatus).delete(protect, admin, deleteBooking);

module.exports = router;
