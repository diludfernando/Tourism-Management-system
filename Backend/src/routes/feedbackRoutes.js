const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  submitFeedback,
  getMyFeedback,
  getFeedbackForTarget,
  getAllFeedback,
  moderateFeedback,
  deleteFeedback,
  getAvailableBookingsForReview,
} = require('../controllers/feedbackController');

const router = express.Router();

router.post('/', protect, submitFeedback);
router.get('/my', protect, getMyFeedback);
router.get('/target/:id', getFeedbackForTarget);
router.get('/all', protect, admin, getAllFeedback);
router.patch('/:id/moderate', protect, admin, moderateFeedback);
router.delete('/:id', protect, deleteFeedback);
router.get('/available-bookings/:type', protect, getAvailableBookingsForReview);

module.exports = router;
