const express = require('express');
const router = express.Router();
const passport = require('passport');
const dashboardController = require('../controllers/dashboardController');

const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/api/dashboard', requireAuth, dashboardController.getDashboardStats);

module.exports = router;
