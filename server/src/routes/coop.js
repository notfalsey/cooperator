
'use strict';

var log = require('../logger.js')();

function setup(app, url, controller) {
	
	app.put(url + '/reset', function(req, res) {
		log.trace('Entering put ' + url + '/reset');
		log.info('reset requested');
		controller.reset(function(err) {
			var msg;
			if(err) {
				msg = 'Error resetting coop';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				msg = 'Coop is resetting';
				log.info(msg);
				res.status(200).json(msg);
			}
			res.end();
		});
	});

	app.get(url + '/temp', function(req, res) {
		log.trace('Entering get ' + url + '/temp');
		var temp = controller.readTemp();
		log.debug({temp: temp}, 'Read temp');
		res.status(200).json(temp);
		res.end();
	});

	app.get(url + '/light', function(req, res) {
		log.trace('Entering get ' + url + '/light');
		var light = controller.readLight();
		log.debug({light: light}, 'Read light');
		res.status(200).json(light);
		res.end();
	});

	app.get(url + '/uptime', function(req, res) {
		log.trace('Entering get ' + url + '/uptime');
		var uptime = controller.readUptime();
		log.debug({uptime: uptime}, 'Read uptime');
		res.status(200).json(uptime);
		res.end();
	});

	app.get(url + '/closetime', function(req, res) {
		log.trace('Entering get ' + url + '/closetime');
		var closingMinutes = controller.getClosingTime();
		var hour = Math.floor(closingMinutes / 60);
		var minute = closingMinutes % 60;
		res.status(200).json({hour: hour, minute: minute});
		res.end();
	});

	app.get(url + '/opentime', function(req, res) {
		log.trace('Entering get ' + url + '/opentime');
		var openingMinutes = controller.getOpeningTime();
		var hour = Math.floor(openingMinutes / 60);
		var minute = openingMinutes % 60;
		res.status(200).json({hour: hour, minute: minute});
		res.end();
	});

	app.get(url + '/rerrors', function(req, res) {
		log.trace('Entering get ' + url + '/rerrors');
		res.status(200).json(controller.getReadErrorCount());
		res.end();
	});

	app.get(url + '/werrors', function(req, res) {
		log.trace('Entering get ' + url + '/werrors');
		res.status(200).json(controller.getWriteErrorCount());
		res.end();
	});

	app.get(url + '/autoresets', function(req, res) {
		log.trace('Entering get ' + url + '/autoresets');
		res.status(200).json(controller.getAutoResetCount());
		res.end();
	});

	app.get(url + '/lasterror', function(req, res) {
		log.trace('Entering get ' + url + '/lasterror');
		res.status(200).json(controller.getLastError());
		res.end();
	});

	app.get(url + '/lastread', function(req, res) {
		log.trace('Entering get ' + url + '/lastread');
		res.status(200).json(controller.getLastSuccessfulRead());
		res.end();
	});

	app.get(url + '/lastwrite', function(req, res) {
		log.trace('Entering get ' + url + '/lastwrite');
		res.status(200).json(controller.getLastSuccessfulWrite());
		res.end();
	});

	app.route(url + '/door')
	.get(function(req, res) {
		log.trace('Entering get ' + url + '/door');
		var door = controller.readDoor();
		var doorString = 'transitioning';
		if (door === 0) {
			doorString = 'open';
		} else if(door === 2) {
			doorString = 'closed';
		}
		log.debug({door: door, doorString: doorString}, 'Read door');
		res.status(200).json(doorString);
		res.end();
	})
	.put(function(req, res) {
		log.trace({dir: req.body.dir}, 'Entering put ' + url + '/door');
		var msg;
		if(req.body.dir === 'open') {
			controller.openDoor(function(err) {
				if(err) {
					msg = 'Error opening door';
					log.error({err: err}, msg);
					res.status(500).json(msg);
				} else {
					msg = 'Door is opening';
					log.debug(msg);
					res.status(200).json(msg);
				}
				res.end();
			});
		} else if(req.body.dir === 'close') {
			controller.closeDoor(function(err) {
				if(err) {
					msg = 'Error closing door';
					log.error({err: err}, msg);
					res.status(500).json(msg);
				} else {
					msg = 'Door is closing';
					log.debug(msg);
					res.status(200).json(msg);
				}
				res.end();
			});
		} else if(req.body.dir === 'auto') {
			controller.closeDoor(function(err) {
				if(err) {
					msg = 'Error setting door to auto mode';
					log.error({err: err}, msg);
					res.status(500).json(msg);
				} else {
					msg = 'Door is in auto mode';
					log.debug(msg);
					res.status(200).json(msg);
				}
				res.end();
			});
		} else {
			msg = 'Invalid door direction';
			log.error({dir: req.body.dir}, msg);
			res.status(400).json(msg);
			res.end();
		}
	});
}

module.exports = setup;