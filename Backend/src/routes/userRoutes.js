const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, getCurrentUser, updateProfile } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// POST /api/users/login
router.post('/login', authUser);

// POST /api/users/register
router.post('/register', registerUser);

// GET /api/users/me - must come before GET /
router.get('/me', protect, getCurrentUser);

// PUT /api/users/me - update profile
router.put('/me', protect, updateProfile);

// GET /api/users
router.get('/', protect, adminOnly, getUsers);

// DELETE /api/users/:id
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
