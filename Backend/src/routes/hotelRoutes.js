const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');

router.route('/').get(getAllHotels).post(protect, admin, createHotel);
router.route('/:id').get(getHotelById).put(protect, admin, updateHotel).delete(protect, admin, deleteHotel);

module.exports = router;
