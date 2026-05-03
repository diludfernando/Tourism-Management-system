const Hotel = require('../models/Hotel');

// @desc    Add new hotel/accommodation
// @route   POST /api/hotels
// @access  Public (Can be restricted to Admin later)
const createHotel = async (req, res) => {
  try {
    console.log('\x1b[35m%s\x1b[0m', '📩 [POST] /api/hotels - Request Received');
    console.log('Body:', { ...req.body, image: req.body.image ? '[Image Data]' : 'No Image' });

    const {
      name,
      location,
      description,
      pricePerNight,
      totalRooms,
      availableRooms,
      amenities,
      image,
      rating,
      accommodationType,
      contactNumber,
    } = req.body;

    const hotel = await Hotel.create({
      name,
      location,
      description,
      pricePerNight,
      totalRooms,
      availableRooms,
      amenities,
      image,
      rating,
      accommodationType,
      contactNumber,
    });

    if (hotel) {
      console.log('\x1b[32m%s\x1b[0m', '✅ Hotel Saved to DB:', hotel._id);
      res.status(201).json(hotel);
    } else {
      console.log('\x1b[31m%s\x1b[0m', '❌ Invalid hotel data');
      res.status(400).json({ message: 'Invalid hotel data' });
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '💥 Server Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
const getAllHotels = async (req, res) => {
  try {
    const hotels = await Hotel.find({}).sort({ createdAt: -1 });
    res.json(hotels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single hotel by ID
// @route   GET /api/hotels/:id
// @access  Public
const getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (hotel) {
      res.json(hotel);
    } else {
      res.status(404).json({ message: 'Hotel not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a hotel
// @route   PUT /api/hotels/:id
// @access  Public
const updateHotel = async (req, res) => {
  try {
    console.log('\x1b[35m%s\x1b[0m', `📩 [PUT] /api/hotels/${req.params.id} - Request Received`);
    const hotel = await Hotel.findById(req.params.id);

    if (hotel) {
      hotel.name = req.body.name || hotel.name;
      hotel.location = req.body.location || hotel.location;
      hotel.description = req.body.description || hotel.description;
      hotel.pricePerNight = req.body.pricePerNight || hotel.pricePerNight;
      hotel.totalRooms = req.body.totalRooms || hotel.totalRooms;
      hotel.availableRooms = req.body.availableRooms !== undefined ? req.body.availableRooms : hotel.availableRooms;
      hotel.amenities = req.body.amenities || hotel.amenities;
      if (req.body.image) {
        hotel.image = req.body.image;
      }
      hotel.rating = req.body.rating !== undefined ? req.body.rating : hotel.rating;
      hotel.accommodationType = req.body.accommodationType || hotel.accommodationType;
      hotel.contactNumber = req.body.contactNumber || hotel.contactNumber;

      const updatedHotel = await hotel.save();
      console.log('\x1b[32m%s\x1b[0m', '✅ Hotel Updated:', updatedHotel._id);
      res.json(updatedHotel);
    } else {
      res.status(404).json({ message: 'Hotel not found' });
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '💥 Server Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a hotel
// @route   DELETE /api/hotels/:id
// @access  Public
const deleteHotel = async (req, res) => {
  try {
    console.log('\x1b[35m%s\x1b[0m', `📩 [DELETE] /api/hotels/${req.params.id} - Request Received`);
    const hotel = await Hotel.findById(req.params.id);

    if (hotel) {
      await hotel.deleteOne();
      console.log('\x1b[32m%s\x1b[0m', '✅ Hotel Removed');
      res.json({ message: 'Hotel removed' });
    } else {
      res.status(404).json({ message: 'Hotel not found' });
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '💥 Server Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
};
