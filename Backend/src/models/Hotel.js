const mongoose = require('mongoose');

const hotelSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hotel name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [1, 'Price per night must be greater than 0'],
    },
    totalRooms: {
      type: Number,
      required: [true, 'Total rooms is required'],
      min: [1, 'Total rooms must be greater than 0'],
    },
    availableRooms: {
      type: Number,
      required: [true, 'Available rooms is required'],
      min: [0, 'Available rooms cannot be negative'],
      validate: {
        validator: function (value) {
          return value <= this.totalRooms;
        },
        message: 'Available rooms cannot be greater than total rooms',
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    image: {
      type: String, // Base64 string or URL
      required: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be below 0'],
      max: [5, 'Rating cannot be above 5'],
    },
    accommodationType: {
      type: String,
      required: [true, 'Accommodation type is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to auto-set isAvailable based on availableRooms
hotelSchema.pre('save', function () {
  if (this.availableRooms === 0) {
    this.isAvailable = false;
  } else {
    this.isAvailable = true;
  }
});

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel;
