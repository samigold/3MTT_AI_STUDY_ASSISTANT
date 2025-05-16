const express = require('express');
const { getResult } = require('../controllers/apiController.js');

const router = express.Router();

router.post('/ask', getResult);

module.exports = router;