var http = require('http'),
	log = require('./logger.js')();

function VideoService(config) {
	log.info('Initializing video service');
	var keepAliveAgent = new http.Agent({ keepAlive: true });
	this.options = {
		agent: keepAliveAgent,
		hostname: config.cameraIp,
  		port: 80,
  		path: '/snapshot.cgi?user='+config.cameraUser+'&pwd='+config.cameraPassword+'&t=',
  		method: 'GET'
	};
}

VideoService.prototype = {
	get: function(callerRes) {
		log.trace('Entering VideoService:get');
		var self = this;
		try {
			var req = http.request(this.options, function(res){
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
	}
};

module.exports = VideoService;