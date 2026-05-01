const express = require('express');
const router = express.Router();
const { authUser, registerUser } = require('../controllers/userController');

// POST /api/users/login
router.post('/login', authUser);

// POST /api/users/register
router.post('/register', registerUser);

module.exports = router;
