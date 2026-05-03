const TourPack = require('../models/TourPack');

exports.createTourPack = async (req, res) => {
  try {
    console.log('📩 [POST] /api/tourpacks - Request Received');
    
    // The body should already contain tags, inclusions, and availabilityDates as arrays
    // and image/gallery as base64 strings/objects because we are sending JSON from frontend.
    const tourPack = new TourPack(req.body);
    
    const saved = await tourPack.save();
    console.log('✅ Package created:', saved._id);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('❌ Create error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllTourPacks = async (req, res) => {
  try {
    const { minPrice, maxPrice, minDuration, maxDuration, destination, category, difficulty, sortBy } = req.query;
    let filter = { status: 'active' };

    if (minPrice) filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    if (minDuration) filter.duration = { ...filter.duration, $gte: parseInt(minDuration) };
    if (maxDuration) filter.duration = { ...filter.duration, $lte: parseInt(maxDuration) };
    if (destination) filter.destination = destination;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    let query = TourPack.find(filter);

    if (sortBy === 'price-asc') query = query.sort({ price: 1 });
    else if (sortBy === 'price-desc') query = query.sort({ price: -1 });
    else if (sortBy === 'duration-asc') query = query.sort({ duration: 1 });
    else if (sortBy === 'duration-desc') query = query.sort({ duration: -1 });
    else query = query.sort({ featured: -1, createdAt: -1 });

    const tourPacks = await query.exec();
    res.status(200).json({ success: true, count: tourPacks.length, data: tourPacks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTourPackById = async (req, res) => {
  try {
    console.log('getTourPackById - id:', req.params.id);
    const tourPack = await TourPack.findById(req.params.id);
    if (!tourPack) return res.status(404).json({ success: false, message: 'Tour pack not found' });
    res.status(200).json({ success: true, data: tourPack });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTourPack = async (req, res) => {
  try {
    console.log('📩 [PUT] /api/tourpacks - Request Received for:', req.params.id);

    const tourPack = await TourPack.findById(req.params.id);
    if (!tourPack) {
      return res.status(404).json({ success: false, message: 'Tour pack not found' });
    }

    const updated = await TourPack.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    console.log('✅ Package updated successfully');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Update error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTourPack = async (req, res) => {
  try {
    const deleted = await TourPack.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Tour pack not found' });
    res.status(200).json({ success: true, message: 'Tour pack deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};