const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, getCurrentUser, updateProfile, getUserById, updateUser, updateUserStatus, changePassword, forgotPassword, verifyOTP, resetPasswordWithOTP } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Configure multer for memory storage (for storing in database)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// POST /api/users/login
router.post('/login', authUser);

// POST /api/users/register
router.post('/register', registerUser);

// GET /api/users/me - must come before GET /
router.get('/me', protect, getCurrentUser);

// PUT /api/users/me - update profile with file upload
router.put('/me', protect, upload.single('profilePhoto'), updateProfile);

// PUT /api/users/change-password
router.put('/change-password', protect, changePassword);

// POST /api/users/forgot-password - Public
router.post('/forgot-password', forgotPassword);

// POST /api/users/verify-otp - Public
router.post('/verify-otp', verifyOTP);

// POST /api/users/reset-password - Public
router.post('/reset-password', resetPasswordWithOTP);

// GET /api/users
router.get('/', protect, adminOnly, getUsers);

// GET /api/users/:id
router.get('/:id', protect, adminOnly, getUserById);

// PUT /api/users/:id
router.put('/:id', protect, adminOnly, updateUser);

// PATCH /api/users/:id/status
router.patch('/:id/status', protect, adminOnly, updateUserStatus);

// DELETE /api/users/:id
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
