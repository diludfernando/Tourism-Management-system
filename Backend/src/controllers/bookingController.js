const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Transportation = require('../models/Transportation');

const BOOKING_POPULATE = [
  { path: 'hotel', select: 'name location pricePerNight accommodationType image' },
  { path: 'transportation', select: 'vehicleType brandModel plateNumber price capacity' },
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
      transportation: transportationId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      travelStyle,
      specialRequests,
      itineraryNotes,
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

    let transportation = null;
    let transportationAmount = 0;
    if (transportationId) {
      transportation = await Transportation.findById(transportationId);
      if (!transportation) {
        return res.status(404).json({ message: 'Selected transportation was not found' });
      }
      if (parsedGuests > transportation.capacity) {
        return res.status(400).json({ message: 'Selected transportation cannot accommodate all guests' });
      }
      transportationAmount = transportation.price;
    }

    const stayAmount = hotel.pricePerNight * parsedRooms * nights;
    const serviceFee = Math.round(stayAmount * 0.08);
    const totalAmount = stayAmount + transportationAmount + serviceFee;

    const booking = await Booking.create({
      bookingReference: generateReference(),
      guestName: normalizedGuestName,
      email: normalizedEmail,
      phone: normalizedPhone,
      destination: normalizedDestination,
      hotel: hotel._id,
      transportation: transportation ? transportation._id : null,
      checkInDate,
      checkOutDate,
      guests: parsedGuests,
      adults: parsedAdults,
      children: parsedChildren,
      rooms: parsedRooms,
      nights,
      stayAmount,
      transportationAmount,
      serviceFee,
      totalAmount,
      travelStyle,
      specialRequests,
      itineraryNotes: Array.isArray(itineraryNotes) ? itineraryNotes : [],
    });

    hotel.availableRooms -= parsedRooms;
    await hotel.save();

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

    if (booking.bookingStatus !== 'cancelled') {
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
