const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.route('/').get(protect, admin, getAllBookings).post(createBooking);
router.route('/:id').get(protect, admin, getBookingById).patch(protect, admin, updateBookingStatus).delete(protect, admin, deleteBooking);

module.exports = router;
