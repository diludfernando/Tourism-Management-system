const express = require('express');
const router = express.Router();
const {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');

router.route('/').get(getAllHotels).post(createHotel);
router.route('/:id').get(getHotelById).put(updateHotel).delete(deleteHotel);

module.exports = router;
