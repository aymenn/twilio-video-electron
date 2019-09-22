'use strict';

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.TWILIO_ACCOUNT_SID
 * process.env.TWILIO_API_KEY
 * process.env.TWILIO_API_SECRET
 */
require('dotenv').load();

var http = require('http');
var path = require('path');
var express = require('express');
var randomName = require('../common/randomname').randomName;
var generateToken = require('../common/randomname').generateToken;


// Create Express webapp.
var app = express();

// Set up the path for the web pages.
var webPath = path.join(__dirname, '../web/public');
app.use('/web', express.static(webPath));


/**
 * Default to the webapp.
 */
app.get('/', function(request, response) {
  response.redirect('/web');
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */
app.get('/token', function(request, response) {
  var identity = request.query.identity || randomName();

  var obj = generateToken(identity);

  // Serialize the token to a JWT string and include it in a JSON response.
  response.send(obj);
});

// Create http server and run it.
var server = http.createServer(app);
var port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Express server running on *:' + port);
});
