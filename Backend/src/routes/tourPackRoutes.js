const express = require('express');
const router = express.Router();
const {
  createTourPack,
  getAllTourPacks,
  getTourPackById,
  updateTourPack,
  deleteTourPack
} = require('../controllers/tourPackController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const logUploadRequest = (req, res, next) => {
  console.log(`[tourpack] ${req.method} ${req.originalUrl}`);
  next();
};

router.post('/', protect, adminOnly, logUploadRequest, createTourPack);
router.get('/', getAllTourPacks);
router.get('/:id', getTourPackById);
router.put('/:id', protect, adminOnly, logUploadRequest, updateTourPack);
router.delete('/:id', protect, adminOnly, deleteTourPack);

module.exports = router;