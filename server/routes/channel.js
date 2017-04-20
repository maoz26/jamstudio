var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var router = express.Router();
var Channel   = require('../model/channelSchema');  // get our mongoose model

/* GET project. */
router.get('/', ensureLoggedIn, function(req, res, next) {
   res.send('hello world');
});

module.exports = router;