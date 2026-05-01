const express = require('express');
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.route('/').get(getAllBookings).post(createBooking);
router.route('/:id').get(getBookingById).patch(updateBookingStatus).delete(deleteBooking);

module.exports = router;
