var http = require('http'),
	log = require('./logger.js')();

function WeatherService(config) {
	this.astronomyUrl = 'http://api.wunderground.com/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
	log.debug({url: this.astronomyUrl}, 'Initializing weather service');
	this.astronomyData = null;
	this.refresh();
	// refresh every 12 hours
	setInterval(this.refresh.bind(this), 12 * 60 * 60 * 1000);
}

WeatherService.prototype = {
	refresh: function() {
		var self = this;
		self.getData(self.astronomyUrl, function(err, data) {
			if(err) {
				log.error('Error retrieving astrology data');
			} else {
				self.astronomyData = data;
				log.debug({data: self.astronomyData}, 'Read astronomy data');
			}
		});
	},
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
	getSunset: function() {
		var ret = null;
		if(this.astronomyData) {
			ret = this.astronomyData.sun_phase.sunset;
		}
		return ret;
	},
	getSunrise: function(callback) {
		var ret = null;
		if(this.astronomyData) {
			ret = this.astronomyData.sun_phase.sunrise;	
		}
		return ret;
	}
};

module.exports = WeatherService;