const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Private
const submitFeedback = async (req, res) => {
  try {
    const { feedbackType, targetId, bookingId: requestedBookingId, rating, title, comment } = req.body;
    const userId = req.user._id;

    if (!feedbackType || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide feedbackType, rating, and comment' });
    }

    let bookingId = null;
    let onModel = undefined;

    if (feedbackType !== 'general') {
      if (!targetId) {
        return res.status(400).json({ success: false, message: 'targetId is required for service feedback' });
      }

      // Determine the booking field to match based on feedbackType
      let targetField;
      if (feedbackType === 'hotel') {
        targetField = 'hotel';
        onModel = 'Hotel';
      } else if (feedbackType === 'tourpack') {
        targetField = 'tourPack';
        onModel = 'TourPack';
      } else if (feedbackType === 'transportation') {
        targetField = 'transportation';
        onModel = 'Transportation';
      } else {
        return res.status(400).json({ success: false, message: 'Invalid feedbackType' });
      }

      const query = {
        user: userId,
        [targetField]: targetId,
        bookingStatus: { $in: ['confirmed', 'completed'] },
      };

      if (requestedBookingId) {
        query._id = requestedBookingId;
      }

      const booking = await Booking.findOne(query);

      if (!booking) {
        return res.status(403).json({
          success: false,
          message: requestedBookingId
            ? `The selected booking is not eligible for this ${feedbackType} review`
            : `You must have a confirmed or completed booking for this ${feedbackType} to submit a review`,
        });
      }

      bookingId = booking._id;

      // Check if user already submitted feedback for this specific booking
      const existingFeedback = await Feedback.findOne({ user: userId, bookingId });
      if (existingFeedback) {
        return res.status(400).json({ success: false, message: 'You have already submitted a review for this booking' });
      }
    }

    const feedback = await Feedback.create({
      user: userId,
      feedbackType,
      targetId: targetId || undefined,
      onModel,
      bookingId,
      rating,
      title,
      comment,
      status: 'published', // Published by default for immediate visibility
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
};

// @desc    Get user's own feedback
// @route   GET /api/feedback/my
// @access  Private
const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user._id })
      .populate('targetId', 'name title') // Populate name (Hotel/Transport) or title (TourPack)
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your feedback' });
  }
};

// @desc    Get public feedback for a specific target
// @route   GET /api/feedback/target/:id
// @access  Public
const getFeedbackForTarget = async (req, res) => {
  try {
    const feedback = await Feedback.find({
      targetId: req.params.id,
      status: 'published',
    })
      .populate('user', 'name profilePhoto')
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    console.error('Get target feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
};

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback/all
// @access  Private/Admin
const getAllFeedback = async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    if (type) query.feedbackType = type;
    if (status) query.status = status;

    const feedback = await Feedback.find(query)
      .populate('user', 'name email')
      .populate('targetId', 'name title')
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch all feedback' });
  }
};

// @desc    Moderate feedback status (Admin)
// @route   PATCH /api/feedback/:id/moderate
// @access  Private/Admin
const moderateFeedback = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (status) feedback.status = status;
    if (adminNote !== undefined) feedback.adminNote = adminNote;

    const updatedFeedback = await feedback.save();
    res.json(updatedFeedback);
  } catch (error) {
    console.error('Moderate feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to moderate feedback' });
  }
};

// @desc    Delete feedback (Admin or Owner)
// @route   DELETE /api/feedback/:id
// @access  Private
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Allow if admin or if the user is the author
    if (req.user.role !== 'admin' && feedback.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this feedback' });
    }

    await Feedback.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete feedback' });
  }
};

// @desc    Get user's confirmed bookings that haven't been reviewed yet (for review dropdowns)
// @route   GET /api/feedback/available-bookings/:type
// @access  Private
const getAvailableBookingsForReview = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user._id;

    if (!['hotel', 'tourpack', 'transportation'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    let targetField;
    let populateOptions;
    if (type === 'hotel') {
      targetField = 'hotel';
      populateOptions = { path: 'hotel', select: 'name location' };
    } else if (type === 'tourpack') {
      targetField = 'tourPack';
      populateOptions = { path: 'tourPack', select: 'name destination' };
    } else if (type === 'transportation') {
      targetField = 'transportation';
      populateOptions = { path: 'transportation', select: 'vehicleType brandModel plateNumber' };
    }

    // Get all confirmed/completed bookings for this user & type
    const bookings = await Booking.find({
      user: userId,
      [targetField]: { $ne: null },
      bookingStatus: { $in: ['confirmed', 'completed'] },
    }).populate(populateOptions);

    // Get all feedbacks submitted by this user for this type
    const existingFeedbacks = await Feedback.find({
      user: userId,
      feedbackType: type,
    });
    const reviewedBookingIds = existingFeedbacks.map(f => f.bookingId?.toString()).filter(id => id);

    // Filter out already reviewed bookings
    const availableBookings = bookings.filter(b => !reviewedBookingIds.includes(b._id.toString()));

    res.json(availableBookings);
  } catch (error) {
    console.error('Get available bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available bookings' });
  }
}

module.exports = {
  submitFeedback,
  getMyFeedback,
  getFeedbackForTarget,
  getAllFeedback,
  moderateFeedback,
  deleteFeedback,
  getAvailableBookingsForReview,
};
