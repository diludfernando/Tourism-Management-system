const Booking = require('../models/Booking');
const TourPack = require('../models/TourPack');
const Transportation = require('../models/Transportation');
const Hotel = require('../models/Hotel');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const {
      guestName,
      email,
      phone,
      tourPack,
      hotel,
      transportation,
      checkInDate,
      checkOutDate,
      guests,
      adults,
      children,
      rooms,
      nights,
      travelStyle,
      specialRequests
    } = req.body;

    // Generate unique booking reference
    const bookingReference = 'BK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000);

    let packageAmount = 0;
    let stayAmount = 0;
    let transportationAmount = 0;
    let destination = '';

    // Calculate amounts if items are selected
    if (tourPack) {
      const selectedTour = await TourPack.findById(tourPack);
      if (selectedTour) {
        packageAmount = selectedTour.price * adults; // Assuming price per adult
        destination = selectedTour.destination;
        
        // Calculate transport cost if transportation is selected
        if (transportation) {
          const selectedVehicle = await Transportation.findById(transportation);
          if (selectedVehicle) {
            // transport cost = tour distance * vehicle price per km
            transportationAmount = (selectedTour.distance || 0) * (selectedVehicle.price || 0);
          }
        }
      }
    }

    if (hotel && nights && rooms) {
      const selectedHotel = await Hotel.findById(hotel);
      if (selectedHotel) {
        stayAmount = selectedHotel.pricePerNight * nights * rooms;
        if (!destination) destination = selectedHotel.location;
      }
    }

    const serviceFee = (packageAmount + stayAmount + transportationAmount) * 0.05; // 5% service fee
    const totalAmount = packageAmount + stayAmount + transportationAmount + serviceFee;

    const booking = await Booking.create({
      bookingReference,
      user: req.user ? req.user._id : null,
      guestName,
      email,
      phone,
      destination,
      tourPack,
      hotel,
      transportation,
      checkInDate,
      checkOutDate,
      guests,
      adults,
      children,
      rooms,
      nights,
      packageAmount,
      stayAmount,
      transportationAmount,
      serviceFee,
      totalAmount,
      travelStyle,
      specialRequests,
      bookingStatus: 'pending',
      paymentStatus: 'deposit_due'
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('user', 'name email')
      .populate('tourPack', 'name price')
      .populate('hotel', 'name pricePerNight')
      .populate('transportation', 'vehicleType brandModel price')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    const bookings = await Booking.find({ user: req.user._id })
      .populate('tourPack', 'name price image')
      .populate('hotel', 'name pricePerNight')
      .populate('transportation', 'vehicleType brandModel')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('tourPack')
      .populate('hotel')
      .populate('transportation');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update booking status
// @route   PATCH /api/bookings/:id
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    const updatedBooking = await booking.save();

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Booking removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
