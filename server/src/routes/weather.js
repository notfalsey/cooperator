'use strict';

var log = require('../logger.js')();

function setup(app, url, weatherService) {
	
	app.get(url + '/sunrise', function(req, res) {
		var sunrise = weatherService.getSunrise();
		log.debug({sunrise: sunrise}, 'Read sunrise');
		res.status(200).json(sunrise);
		res.end();
	});

	app.get(url + '/sunset', function(req, res) {
		var sunset = weatherService.getSunset();
		log.debug({sunset: sunset}, 'Read sunset');
		res.status(200).json(sunset);
		res.end();
	});
}

module.exports = setup;