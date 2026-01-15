const express = require('express');
const router = express.Router();
const passport = require('passport');
const calendarController = require('../controllers/calendarController');

const requireAuth = passport.authenticate('jwt', { session: false });

router.get('/api/calendar', requireAuth, calendarController.getItemsByDate);

module.exports = router;
