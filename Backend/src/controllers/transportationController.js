const Transportation = require('../models/Transportation');

// @desc    Add new transportation
// @route   POST /api/transportation
// @access  Public (Can be restricted to Admin later)
const addTransportation = async (req, res) => {
  try {
    console.log('\x1b[35m%s\x1b[0m', '📩 [POST] /api/transportation - Request Received');
    console.log('Body:', { ...req.body, vehicleImage: req.body.vehicleImage ? '[Image Data]' : 'No Image' });

    const { vehicleType, brandModel, plateNumber, capacity, price, description, vehicleImage, contactNumber } = req.body;

    // Check if plate number already exists
    const vehicleExists = await Transportation.findOne({ plateNumber });
    if (vehicleExists) {
      console.log('\x1b[31m%s\x1b[0m', '❌ Plate number already exists:', plateNumber);
      return res.status(400).json({ message: 'A vehicle with this plate number already exists' });
    }

    const transportation = await Transportation.create({
      vehicleType,
      brandModel,
      plateNumber,
      capacity,
      price,
      description,
      vehicleImage,
      contactNumber,
    });

    if (transportation) {
      console.log('\x1b[32m%s\x1b[0m', '✅ Vehicle Saved to DB:', transportation._id);
      res.status(201).json(transportation);
    } else {
      console.log('\x1b[31m%s\x1b[0m', '❌ Invalid vehicle data');
      res.status(400).json({ message: 'Invalid vehicle data' });
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '💥 Server Error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transportation
// @route   GET /api/transportation
// @access  Public
const getAllTransportation = async (req, res) => {
  try {
    const transportationList = await Transportation.find({}).sort({ createdAt: -1 });
    res.json(transportationList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transportation by ID
// @route   GET /api/transportation/:id
// @access  Public
const getTransportationById = async (req, res) => {
  try {
    const transportation = await Transportation.findById(req.params.id);
    if (transportation) {
      res.json(transportation);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update transportation
// @route   PUT /api/transportation/:id
// @access  Admin
const updateTransportation = async (req, res) => {
  try {
    const { vehicleType, brandModel, plateNumber, capacity, price, description, vehicleImage, contactNumber } = req.body;

    const transportation = await Transportation.findById(req.params.id);

    if (transportation) {
      transportation.vehicleType = vehicleType || transportation.vehicleType;
      transportation.brandModel = brandModel || transportation.brandModel;
      transportation.plateNumber = plateNumber || transportation.plateNumber;
      transportation.capacity = capacity || transportation.capacity;
      transportation.price = price || transportation.price;
      transportation.description = description || transportation.description;
      transportation.contactNumber = contactNumber || transportation.contactNumber;
      if (vehicleImage) {
        transportation.vehicleImage = vehicleImage;
      }

      const updatedTransportation = await transportation.save();
      res.json(updatedTransportation);
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete transportation
// @route   DELETE /api/transportation/:id
// @access  Admin
const deleteTransportation = async (req, res) => {
  try {
    console.log('\x1b[31m%s\x1b[0m', `🗑️ [DELETE] /api/transportation/${req.params.id} - Request Received`);
    const deleted = await Transportation.findByIdAndDelete(req.params.id);

    if (deleted) {
      res.json({ message: 'Vehicle removed successfully' });
    } else {
      res.status(404).json({ message: 'Vehicle not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  addTransportation,
  getAllTransportation,
  getTransportationById,
  updateTransportation,
  deleteTransportation,
};
