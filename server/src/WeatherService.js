var http = require('http'),
    log = require('./logger.js')();

function WeatherService(config) {
    this.astronomyUrl = 'http://api.wunderground.com/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
    log.debug({
        url: this.astronomyUrl
    }, 'Initializing weather service');
    this.astronomyData = config.defaultWeatherData;
    log.info({
        default: this.astronomyData
    }, 'Using default weather data until a successful read from service');
    this.refresh();
    this.errorCount = 0;
    // refresh every 12 hours
    setInterval(this.refresh.bind(this), 12 * 60 * 60 * 1000);
}

WeatherService.prototype = {
    refresh: function() {
        log.info('Refreshing weather data');
        var self = this;
        self.getData(self.astronomyUrl, function(err, data) {
            if (err) {
                self.errorCount++;
                log.error('Error retrieving astrology data');
            } else {
                self.astronomyData = data;
                log.info({
                    data: self.astronomyData
                }, 'Read astronomy data');
            }
        });
    },
    getData: function(url, callback) {
        var req = http.get(url, function(res) {
            var resData = '';
            res.on('data', function(data) {
                resData += data;
            });

            res.on('end', function() {
                log.debug({
                    resData: resData
                }, 'Received data from weather service');
                callback(null, JSON.parse(resData));
            });

            res.on('error', function(err) {
                var msg = 'Error fetching data from weather service';
                log.error({
                    err: err
                }, msg);
                callback(new Error(msg));
            });
        });
        req.on('error', function(err) {
            var msg = 'Error fetching data from weather service';
            log.error({
                err: err
            }, msg);
            callback(new Error(msg));
        });
    },
    getSunset: function() {
        var ret = null;
        if (this.astronomyData) {
            ret = this.astronomyData.sun_phase.sunset;
        }
        return ret;
    },
    getSunrise: function(callback) {
        var ret = null;
        if (this.astronomyData) {
            ret = this.astronomyData.sun_phase.sunrise;
        }
        return ret;
    },
    getErrorCount: function() {
        return this.errorCount;
    }
};

module.exports = WeatherService;
