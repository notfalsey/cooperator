var http = require('http'),
	log = require('./logger.js')();

function VideoService(config) {
	log.info('Initializing video service');
	var keepAliveAgent = new http.Agent({ keepAlive: true });
	this.cameraUser = config.cameraUser;
	this.cameraPassword = config.cameraPassword;
	this.options = {
		agent: keepAliveAgent,
		hostname: config.cameraIp,
  		port: 80,
  		method: 'GET'
	};

	this.commands = {
		up: 0,
		stop: 1,
		down: 2,
		right: 4,
		left: 6,
		upleft: 9,
		upright: 90,
		downright: 92,
		leftdown: 93,
		irOff: 94,
		ifOn: 95,
		presets: {
			1: 31,
			2: 33,
			3: 35,
			4: 37,
			5: 39,
			6: 41,
			7: 43,
			8: 45
		} 
	};
}

VideoService.prototype = {
	sendRequest: function(options, callback) {
		log.trace('Entering VideoService:sendRequest');
		var self = this;
		try {
			var req = http.request(options, function(res){
				res.on('data', function(data){
					// do nothing
				});
				res.on('end', function(err){
					if(res.statusCode >= 300) {
						if(callback) {
							callback(new Error('Bad status: ' + res.statusCode));	
						}
					} else {
						if(callback) {
							callback(null, res.statusCode);		
						}
					}
				});
			});	
			req.on('error', function(err){
				var msg = 'Error connecting to video service';
				log.error(msg);
				if(callback) {
					callback(new Error(msg));	
				}
			});
			req.end();
		} catch(err) {
			var msg = 'Error connecting to video service';
			log.error({err: err}, msg);
			if(callback) {
				callback(new Error(msg));
			}
		}	
	},

	pipeRequest: function(options, callerRes) {
		log.trace('Entering VideoService:pipeRequest');
		var self = this;
		try {
			var req = http.request(options, function(res){
				res.pipe(callerRes);
			});	
			req.on('error', function(err){
				var msg = 'Error connecting to video service';
				log.error(msg);
				callerRes.status(500).json(msg);
				callerRes.end();
			});
			req.end();
		} catch(err) {
			var msg = 'Error connecting to video service';
			log.error({err: err}, msg);
			callerRes.status(500).json(msg);
			callerRes.end();
		}	
	},

	get: function(callerRes) {
		log.trace('Entering VideoService:get');
		this.options.path = '/snapshot.cgi?user='+this.cameraUser+'&pwd='+this.cameraPassword;
		this.pipeRequest(this.options, callerRes);
	},

	pan: function(dir, callback) {
		log.trace({dir: dir}, 'Entering VideoService:pan');
		this.options.path = '/decoder_control.cgi?onestep=1&command='+this.commands[dir]+'&user='+this.cameraUser+'&pwd='+this.cameraPassword;
		this.sendRequest(this.options, callback);
	},

	setIR: function(ir, callback) {
		log.trace({ir: ir}, 'Entering VideoService:setIR');
		var command = this.commands[irOn];
		if(dir === false) {
			command = this.commands[irOff];
		}
		this.options.path = '/decoder_control.cgi?command='+command+'&user='+this.cameraUser+'&pwd='+this.cameraPassword;
		this.sendRequest(this.options, callback);
	},

	goToPreset: function(preset, callback) {
		log.trace({preset: preset}, 'Entering VideoService:pan');
		this.options.path = '/decoder_control.cgi?command='+this.commands.presets[preset]+'&user='+this.cameraUser+'&pwd='+this.cameraPassword;
		this.sendRequest(this.options, callback);
	}
};

module.exports = VideoService;