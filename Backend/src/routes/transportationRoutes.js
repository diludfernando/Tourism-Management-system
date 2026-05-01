const express = require('express');
const router = express.Router();
const {
  addTransportation,
  getAllTransportation,
  getTransportationById,
  updateTransportation,
  deleteTransportation,
} = require('../controllers/transportationController');

router.route('/')
  .post(addTransportation)
  .get(getAllTransportation);

router.route('/:id')
  .get(getTransportationById)
  .put(updateTransportation)
  .delete(deleteTransportation);

module.exports = router;
