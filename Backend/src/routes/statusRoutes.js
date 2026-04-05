const express = require('express');
const router = express.Router();
const { getStatus } = require('../controllers/statusController');

// Route for getting status
router.get('/', getStatus);

module.exports = router;
