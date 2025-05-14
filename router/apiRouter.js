const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// API route for asking questions
router.post('/ask', apiController.handleAskRequest);

module.exports = router;