var http = require('http'),
	log = require('./logger.js')();

function WeatherService(config) {
	this.astronomyUrl = 'http://api.wunderground.com/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
}

WeatherService.prototype = {
	getData: function(url, callback) {
		http.get(url, function(res) {
			var resData = '';
			res.on('data', function(data) {
				resData += data;
			});

  			res.on('end', function() {
  				log.debug({resData: resData}, 'Received data from weather service');
  				callback(null, JSON.parse(resData));
  			});
		});
	}, 
	getSunset: function(callback) {
		this.getData(this.astronomyUrl, function(err, data) {
			if(err) {
				callback(err);
			} else {
				var sunset = {
					hour: data.sun_phase.sunset.hour,
					minute: data.sun_phase.sunset.minute
				};
				callback(null, sunset);
			}
		});
	},
	getSunrise: function(callback) {
		this.getData(this.astronomyUrl, function(err, data) {
			if(err) {
				callback(err);
			} else {
				var sunrise = {
					hour: data.sun_phase.sunrise.hour,
					minute: data.sun_phase.sunrise.minute
				};
				callback(null, sunrise);
			}
		});
	}
};

module.exports = WeatherService;