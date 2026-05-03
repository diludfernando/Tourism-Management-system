const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const TourPack = require('./src/models/TourPack');

async function checkTourPacks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const packs = await TourPack.find({});
    console.log('--- Tour Packs Found:', packs.length, '---');
    packs.forEach(p => {
      console.log(`ID: ${p._id}, Name: ${p.name}`);
      console.log(`Image: "${p.image}"`);
      console.log(`Gallery: ${p.gallery.length} items`);
    });
  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkTourPacks();
