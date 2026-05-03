const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createTourPack,
  getAllTourPacks,
  getTourPackById,
  updateTourPack,
  deleteTourPack
} = require('../controllers/tourPackController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'tourpack-' + Date.now() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ext) {
    cb(null, true); // Allow if no extension (handled by RN)
  } else {
    const isValid = allowedTypes.test(ext);
    isValid ? cb(null, true) : cb(new Error(`Only image files allowed, got ${ext}`), false);
  }
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

router.post('/', protect, adminOnly, logUploadRequest, uploadMixed, handleMulterError, createTourPack);
router.get('/', getAllTourPacks);
router.get('/:id', getTourPackById);
router.put('/:id', protect, adminOnly, logUploadRequest, uploadMixed, handleMulterError, updateTourPack);
router.delete('/:id', protect, adminOnly, deleteTourPack);

module.exports = router;