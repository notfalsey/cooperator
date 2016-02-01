
'use strict';

var CoopController = require('../CoopController.js'),
	log = require('../logger.js')();

function setup(app, url, config) {
	var controller = new CoopController(config);

	app.put(url + '/reset', function(req, res) {
		controller.reset(function(err) {
				var msg;
				if(err) {
					msg = 'Error resetting coop';
					log.error({err: err}, msg);
					res.status(500).json(msg);
				} else {
					msg = 'Coop is resetting';
					log.debug(msg);
					res.status(200).json(msg);
				}
				res.end();
			});
	});

	app.get(url + '/temp', function(req, res) {
		controller.readTemp(function(err, temp) {
			if(err) {
				var msg = 'Error reading temperature';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({temp: temp}, 'Read temperature');
				res.status(200).json(temp);
			}
			res.end();
		});
	});

	app.get(url + '/light', function(req, res) {
		controller.readLight(function(err, light) {
			if(err) {
				var msg = 'Error reading light';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({light: light}, 'Read light');
				res.status(200).json(light);
			}
			res.end();
		});
	});

	app.get(url + '/uptime', function(req, res) {
		controller.readUptime(function(err, uptime) {
			if(err) {
				var msg = 'Error reading uptime';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({uptime: uptime}, 'Read uptime');
				res.status(200).json(uptime);
			}
			res.end();
		});
	});

	app.route(url + '/door')
	.get(function(req, res) {
		controller.readDoor(function(err, door) {
			if(err) {
				var msg = 'Error reading door';
				log.error({err: err}, msg);
				res.status(500).json(msg);
			} else {
				log.debug({door: door}, 'Read door');
				var doorString = 'transitioning';
				if (door === 0) {
					doorString = "open";
				} else if(door === 2) {
					doorString = "closed";
				}
				res.status(200).json(doorString);
			}
			res.end();
		});
	})
	.put(function(req, res) {
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