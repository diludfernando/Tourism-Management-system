const express = require('express');
const router = express.Router();
const { authUser } = require('../controllers/userController');

// POST /api/users/login
router.post('/login', authUser);

module.exports = router;
