const express = require('express');
const { getResult } = require('../controllers/apiController.js');

const router = express.Router();

router.post('/api/ask', getResult);

module.exports = router;