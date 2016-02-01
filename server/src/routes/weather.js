'use strict';

var WeatherService = require('../WeatherService.js'),
	log = require('../logger.js')();

function setup(app, url, config) {
	var weatherService = new WeatherService(config);

	app.get(url + '/sunrise', function(req, res) {
		weatherService.getSunrise(function(err, sunrise) {
			if(err) {
				var msg = 'Error reading sunrise';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({sunrise: sunrise}, 'Read sunrise');
				res.status(200).json(sunrise);
			}
			res.end();
		});
	});

	app.get(url + '/sunset', function(req, res) {
		weatherService.getSunset(function(err, sunset) {
			if(err) {
				var msg = 'Error reading sunset';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({sunset: sunset}, 'Read sunset');
				res.status(200).json(sunset);
			}
			res.end();
		});
	});
}

module.exports = setup;