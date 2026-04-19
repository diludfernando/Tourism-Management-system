const express = require('express');
const router = express.Router();
const {
  addTransportation,
  getAllTransportation,
} = require('../controllers/transportationController');

router.route('/')
  .post(addTransportation)
  .get(getAllTransportation);

module.exports = router;
