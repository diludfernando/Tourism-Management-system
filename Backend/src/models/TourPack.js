const mongoose = require('mongoose');

const tourPackSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  description: { type: String, required: [true, 'Description is required'] },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  duration: { type: Number, required: [true, 'Duration is required'] },
  distance: { type: Number, required: [true, 'Distance is required'], min: 0 },
  maxGroupSize: { type: Number, default: 10 },
  destination: { type: String, required: [true, 'Destination is required'] },
  inclusions: { type: [String], default: [] },
  image: { type: String, default: '' },
  gallery: [{
    url: { type: String, required: true },
    caption: { type: String, default: '' },
    isFeatured: { type: Boolean, default: false }
  }],
  availabilityDates: { type: [Date], default: [] },
  category: { type: String, default: '' },
  difficulty: { type: String, enum: ['easy', 'moderate', 'hard'], default: 'moderate' },
  tags: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('TourPack', tourPackSchema);