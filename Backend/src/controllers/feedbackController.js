const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = async (req, res) => {
  try {
    const { feedbackType, targetId, onModel, bookingId, rating, title, comment } = req.body;

    // Check if user has already reviewed this booking
    if (bookingId) {
      const existingFeedback = await Feedback.findOne({ user: req.user._id, bookingId });
      if (existingFeedback) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted feedback for this booking'
        });
      }
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      feedbackType,
      targetId,
      onModel,
      bookingId,
      rating,
      title,
      comment
    });

    res.status(201).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get my feedback
// @route   GET /api/feedback/my
// @access  Private
exports.getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user._id })
      .populate('targetId')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get feedback for a target (hotel/tour/transport)
// @route   GET /api/feedback/target/:id
// @access  Public
exports.getFeedbackForTarget = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ targetId: req.params.id, status: 'published' })
      .populate('user', 'name profilePhoto')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback/all
// @access  Private/Admin
exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .populate('user', 'name email')
      .populate('targetId')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Moderate feedback (Admin)
// @route   PATCH /api/feedback/:id/moderate
// @access  Private/Admin
exports.moderateFeedback = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (status) feedback.status = status;
    if (adminNote) feedback.adminNote = adminNote;

    const updatedFeedback = await feedback.save();

    res.status(200).json({
      success: true,
      data: updatedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Only user who wrote it or admin can delete
    if (feedback.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get bookings that haven't been reviewed yet
// @route   GET /api/feedback/available-bookings/:type
// @access  Private
exports.getAvailableBookingsForReview = async (req, res) => {
  try {
    const { type } = req.params; // hotel, tourpack, transportation

    // Find all completed bookings for this user that have the requested type
    let query = { user: req.user._id, bookingStatus: 'completed' };
    
    if (type === 'hotel') query.hotel = { $exists: true };
    else if (type === 'tourpack') query.tourPack = { $exists: true };
    else if (type === 'transportation') query.transportation = { $exists: true };

    const bookings = await Booking.find(query)
      .populate('hotel', 'name')
      .populate('tourPack', 'name')
      .populate('transportation', 'vehicleType brandModel');

    // Filter out bookings that already have feedback
    const feedbackBookingIds = await Feedback.find({ user: req.user._id }).distinct('bookingId');
    
    const availableBookings = bookings.filter(b => !feedbackBookingIds.includes(b._id.toString()));

    res.status(200).json({
      success: true,
      count: availableBookings.length,
      data: availableBookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
