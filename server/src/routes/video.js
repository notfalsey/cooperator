'use strict';

var VideoService = require('../VideoService.js'),
	log = require('../logger.js')();

function setup(app, url, config) {
	var videoService = new VideoService(config);
	
	app.get(url, function(req, res) {
		log.trace('Entering get ' + url);
		videoService.get(res);
	});
}

module.exports = setup;