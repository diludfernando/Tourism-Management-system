const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createTourPack,
  getAllTourPacks,
  getTourPackById,
  updateTourPack,
  deleteTourPack
} = require('../controllers/tourPackController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, 'tourpack-' + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const isValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  isValid ? cb(null, true) : cb(new Error('Only JPG and PNG allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Accept ANY field - we'll separate image/gallery in the controller
const uploadMixed = upload.any();

const logUploadRequest = (req, res, next) => {
  console.log(`[upload] ${req.method} ${req.originalUrl}`);
  next();
};

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', {
      code: err.code,
      field: err.field,
      message: err.message,
      route: req.originalUrl,
      method: req.method
    });
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
      code: err.code,
      field: err.field || null
    });
  }
  next();
};

router.post('/', logUploadRequest, uploadMixed, handleMulterError, createTourPack);
router.get('/', getAllTourPacks);
router.get('/:id', getTourPackById);
router.put('/:id', logUploadRequest, uploadMixed, handleMulterError, updateTourPack);
router.delete('/:id', deleteTourPack);

module.exports = router;