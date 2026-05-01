const TourPack = require('../models/TourPack');

exports.createTourPack = async (req, res) => {
  try {
    console.log('Create request received');
    console.log('Files:', req.files ? req.files.length : 'none');
    
    const cleanBody = { ...req.body };
    
    // Map array fields from FormData
    if (cleanBody['tags[]']) {
      cleanBody.tags = Array.isArray(cleanBody['tags[]']) ? cleanBody['tags[]'] : [cleanBody['tags[]']];
      delete cleanBody['tags[]'];
    }
    if (cleanBody['inclusions[]']) {
      cleanBody.inclusions = Array.isArray(cleanBody['inclusions[]']) ? cleanBody['inclusions[]'] : [cleanBody['inclusions[]']];
      delete cleanBody['inclusions[]'];
    }
    if (cleanBody['availabilityDates[]']) {
      cleanBody.availabilityDates = Array.isArray(cleanBody['availabilityDates[]']) ? cleanBody['availabilityDates[]'] : [cleanBody['availabilityDates[]']];
      delete cleanBody['availabilityDates[]'];
    }

    const tourPack = new TourPack(cleanBody);
    
    // Separate image and gallery files
    if (req.files && Array.isArray(req.files)) {
      const imageFile = req.files.find(f => f.fieldname === 'image');
      const galleryFiles = req.files.filter(f => f.fieldname === 'gallery');
      
      // Attach featured image
      if (imageFile) {
        tourPack.image = `/uploads/${imageFile.filename}`;
        console.log('Featured image:', tourPack.image);
      }
      
      // Attach gallery images
      if (galleryFiles.length > 0) {
        tourPack.gallery = galleryFiles.map(file => ({
          url: `/uploads/${file.filename}`,
          caption: '',
          isFeatured: false
        }));
        console.log(`Gallery images attached: ${tourPack.gallery.length}`);
      }
    }
    
    const saved = await tourPack.save();
    console.log('Package created:', saved._id);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('Create error:', error.message);
    console.error('Stack:', error.stack);
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
    console.log('Update request received for:', req.params.id);
    console.log('Files:', req.files ? req.files.length : 'none');

    const existingPack = await TourPack.findById(req.params.id);
    if (!existingPack) return res.status(404).json({ success: false, message: 'Tour pack not found' });

    let retainedGallery = null;
    if (typeof req.body.retainedGalleryJson === 'string') {
      try {
        const parsed = JSON.parse(req.body.retainedGalleryJson);
        if (Array.isArray(parsed)) {
          retainedGallery = parsed
            .filter(item => item && typeof item.url === 'string')
            .map(item => ({
              url: item.url,
              caption: typeof item.caption === 'string' ? item.caption : '',
              isFeatured: Boolean(item.isFeatured)
            }));
        }
      } catch (parseError) {
        console.error('Failed to parse retainedGalleryJson:', parseError.message);
      }
    }
    
    const updateData = { ...req.body };
    delete updateData.retainedGalleryJson;
    
    // Map array fields from FormData
    if (updateData['tags[]']) {
      updateData.tags = Array.isArray(updateData['tags[]']) ? updateData['tags[]'] : [updateData['tags[]']];
      delete updateData['tags[]'];
    }
    if (updateData['inclusions[]']) {
      updateData.inclusions = Array.isArray(updateData['inclusions[]']) ? updateData['inclusions[]'] : [updateData['inclusions[]']];
      delete updateData['inclusions[]'];
    }
    if (updateData['availabilityDates[]']) {
      updateData.availabilityDates = Array.isArray(updateData['availabilityDates[]']) ? updateData['availabilityDates[]'] : [updateData['availabilityDates[]']];
      delete updateData['availabilityDates[]'];
    }
    
    // Separate image and gallery files
    if (req.files && Array.isArray(req.files)) {
      const imageFile = req.files.find(f => f.fieldname === 'image');
      const galleryFiles = req.files.filter(f => f.fieldname === 'gallery');
      
      // Update featured image if provided
      if (imageFile) {
        updateData.image = `/uploads/${imageFile.filename}`;
        console.log('Featured image updated:', updateData.image);
      }
      
      // Update gallery if new files provided
      if (galleryFiles.length > 0 || retainedGallery !== null) {
        const newGalleryItems = galleryFiles.map(file => ({
          url: `/uploads/${file.filename}`,
          caption: '',
          isFeatured: false
        }));

        const existingGallery = Array.isArray(existingPack.gallery) ? existingPack.gallery : [];
        const baseGallery = retainedGallery !== null ? retainedGallery : existingGallery;
        updateData.gallery = [...baseGallery, ...newGalleryItems];
        console.log(`Gallery appended with ${newGalleryItems.length} images (total: ${updateData.gallery.length})`);
      }
    }
    
    const updated = await TourPack.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: false });
    
    console.log('Package updated successfully');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update error:', error.message);
    console.error('Stack:', error.stack);
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