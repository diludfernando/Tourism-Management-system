const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
    },
    hotel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel is required'],
    },
    transportation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transportation',
      default: null,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    guests: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'At least one guest is required'],
    },
    adults: {
      type: Number,
      required: [true, 'Adult count is required'],
      min: [1, 'At least one adult is required'],
    },
    children: {
      type: Number,
      default: 0,
      min: [0, 'Child count cannot be negative'],
    },
    rooms: {
      type: Number,
      required: [true, 'Room count is required'],
      min: [1, 'At least one room is required'],
    },
    nights: {
      type: Number,
      required: true,
      min: [1, 'At least one night is required'],
    },
    stayAmount: {
      type: Number,
      required: true,
      min: [0, 'Stay amount cannot be negative'],
    },
    transportationAmount: {
      type: Number,
      default: 0,
      min: [0, 'Transportation amount cannot be negative'],
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: [0, 'Service fee cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['deposit_due', 'paid', 'refunded'],
      default: 'deposit_due',
    },
    travelStyle: {
      type: String,
      enum: ['Relax', 'Adventure', 'Family', 'Luxury', 'Work'],
      default: 'Relax',
    },
    specialRequests: {
      type: String,
      trim: true,
    },
    itineraryNotes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
