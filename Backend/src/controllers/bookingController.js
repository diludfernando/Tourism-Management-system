const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Transportation = require('../models/Transportation');
const TourPack = require('../models/TourPack');

const BOOKING_POPULATE = [
  { path: 'hotel', select: 'name location pricePerNight accommodationType image' },
  { path: 'transportation', select: 'vehicleType brandModel plateNumber price capacity' },
  { path: 'tourPack', select: 'name destination price duration image' },
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const ROOM_ADULT_CAPACITY = 2;
const ROOM_CHILD_CAPACITY = 2;

const generateReference = () => {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(100 + Math.random() * 900);
  return `TRIP-${stamp}-${random}`;
};

const calculateNights = (checkInDate, checkOutDate) => {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const calculateRequiredRooms = (adults, children) =>
  Math.max(
    Math.ceil(adults / ROOM_ADULT_CAPACITY),
    Math.ceil(children / ROOM_CHILD_CAPACITY),
    1
  );

const syncHotelAvailabilityForStatusChange = async (booking, previousStatus, nextStatus) => {
  if (previousStatus === nextStatus) {
    return null;
  }

  if (!booking.hotel) {
    return null;
  }
  const hotel = await Hotel.findById(booking.hotel);
  if (!hotel) {
    return null;
  }

  if (previousStatus !== 'cancelled' && nextStatus === 'cancelled') {
    hotel.availableRooms += booking.rooms;
    await hotel.save();
    return null;
  }

  if (previousStatus === 'cancelled' && nextStatus !== 'cancelled') {
    if (hotel.availableRooms < booking.rooms) {
      return 'Not enough rooms are available to reactivate this booking';
    }

    hotel.availableRooms -= booking.rooms;
    await hotel.save();
  }

  return null;
};

const createBooking = async (req, res) => {
  try {
    const {
      guestName,
      email,
      phone,
      destination,
      hotel: hotelId,
      tourPack: tourPackId,
      transportation: transportationId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      travelStyle,
      specialRequests,
      itineraryNotes,
      packageAmount: packageAmountFromReq,
    } = req.body;

    const normalizedGuestName = String(guestName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').trim();
    const normalizedDestination = String(destination || '').trim();
    const parsedAdults = Number.parseInt(adults, 10);
    const parsedChildren = Number.parseInt(children ?? 0, 10);
    const parsedGuests = parsedAdults + parsedChildren;
    const parsedRooms = calculateRequiredRooms(parsedAdults, parsedChildren);

    if (!normalizedGuestName || !normalizedEmail || !normalizedPhone || !normalizedDestination) {
      return res.status(400).json({ message: 'Guest, contact, and destination details are required' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Enter a valid phone number' });
    }

    if (!Number.isInteger(parsedAdults) || parsedAdults < 1) {
      return res.status(400).json({ message: 'At least one adult is required' });
    }

    if (!Number.isInteger(parsedChildren) || parsedChildren < 0) {
      return res.status(400).json({ message: 'Children must be 0 or more' });
    }

    let stayAmount = 0;
    let packageAmount = 0;
    let transportationAmount = 0;

    if (hotelId) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) {
        return res.status(404).json({ message: 'Selected hotel was not found' });
      }

      const nights = calculateNights(checkInDate, checkOutDate);
      if (nights < 1) {
        return res.status(400).json({ message: 'Check-out date must be after check-in date' });
      }

      if (parsedRooms > hotel.availableRooms) {
        return res.status(400).json({ message: 'Requested rooms exceed hotel availability' });
      }

      stayAmount = hotel.pricePerNight * parsedRooms * nights;
      
      // Update hotel availability
      hotel.availableRooms -= parsedRooms;
      await hotel.save();
    } else if (tourPackId) {
      const tourPack = await TourPack.findById(tourPackId);
      if (!tourPack) {
        return res.status(404).json({ message: 'Selected tour package was not found' });
      }

      // Backend validation for group size
      if (parsedGuests > tourPack.maxGroupSize) {
        return res.status(400).json({ 
          message: `The number of attendees (${parsedGuests}) exceeds the maximum group size for this tour (${tourPack.maxGroupSize}).` 
        });
      }

      packageAmount = packageAmountFromReq || (tourPack.price * parsedGuests);
    } else {
      return res.status(400).json({ message: 'Either a hotel or a tour package must be selected' });
    }

    if (transportationId) {
      const transportation = await Transportation.findById(transportationId);
      if (!transportation) {
        return res.status(404).json({ message: 'Selected transportation was not found' });
      }
      if (parsedGuests > transportation.capacity) {
        return res.status(400).json({ message: 'Selected transportation cannot accommodate all guests' });
      }
      
      transportationAmount = transportation.price;
      if (tourPackId) {
        const tourPack = await TourPack.findById(tourPackId);
        if (tourPack && tourPack.distance) {
          transportationAmount = transportation.price * tourPack.distance;
        }
      }
    }

    const baseAmount = stayAmount + packageAmount;
    const serviceFee = Math.round(baseAmount * 0.08);
    const totalAmount = baseAmount + transportationAmount + serviceFee;

    const booking = await Booking.create({
      bookingReference: generateReference(),
      user: req.user ? req.user._id : null,
      guestName: normalizedGuestName,
      email: normalizedEmail,
      phone: normalizedPhone,
      destination: normalizedDestination,
      hotel: hotelId || null,
      tourPack: tourPackId || null,
      transportation: transportationId || null,
      checkInDate: checkInDate || null,
      checkOutDate: checkOutDate || null,
      guests: parsedGuests,
      adults: parsedAdults,
      children: parsedChildren,
      rooms: hotelId ? parsedRooms : 0,
      nights: hotelId ? calculateNights(checkInDate, checkOutDate) : 0,
      stayAmount,
      packageAmount,
      transportationAmount,
      serviceFee,
      totalAmount,
      travelStyle,
      specialRequests,
      itineraryNotes: Array.isArray(itineraryNotes) ? itineraryNotes : [],
    });

    // Hotel availability was already updated above if hotelId was present.

    const populatedBooking = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
    res.status(201).json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate(BOOKING_POPULATE)
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(BOOKING_POPULATE);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is admin or the owner of the booking
    if (req.user.role !== 'admin' && booking.user && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const previousStatus = booking.bookingStatus;
    const nextStatus = bookingStatus || booking.bookingStatus;

    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;
    }
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    const inventoryError = await syncHotelAvailabilityForStatusChange(
      booking,
      previousStatus,
      nextStatus
    );

    if (inventoryError) {
      return res.status(400).json({ message: inventoryError });
    }

    const updatedBooking = await booking.save();
    const populatedBooking = await Booking.findById(updatedBooking._id).populate(BOOKING_POPULATE);
    res.json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.bookingStatus !== 'cancelled' && booking.hotel) {
      const hotel = await Hotel.findById(booking.hotel);
      if (hotel) {
        hotel.availableRooms += booking.rooms;
        await hotel.save();
      }
    }

    await booking.deleteOne();
    res.json({ message: 'Booking removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking,
};
