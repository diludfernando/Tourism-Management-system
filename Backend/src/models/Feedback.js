const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    feedbackType: {
      type: String,
      enum: ['hotel', 'tourpack', 'transportation', 'general'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'onModel',
      required: function () {
        return this.feedbackType !== 'general';
      },
    },
    onModel: {
      type: String,
      enum: ['Hotel', 'TourPack', 'Transportation'],
      required: function () {
        return this.feedbackType !== 'general';
      },
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: function () {
        return this.feedbackType !== 'general';
      },
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['published', 'hidden'],
      default: 'published',
    },
    adminNote: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user can only review a booking once
feedbackSchema.index({ user: 1, bookingId: 1 }, { unique: true, partialFilterExpression: { bookingId: { $exists: true } } });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
