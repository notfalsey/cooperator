'use strict';

var http = require('http'),
    Promise = require('bluebird'),
    log = require('./logger.js')();

class WeatherService {

    constructor(config) {
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
        // default refresh every 12 hours
        var refreshPeriod = 12 * 60 * 60 * 1000;

        setInterval(this.refresh.bind(this), refreshPeriod);
    }

    refresh() {
        log.info('Refreshing weather data');
        return this.getData(this.astronomyUrl).then((data) => {
            this.astronomyData = data;
            log.info({
                data: this.astronomyData
            }, 'Read astronomy data');
        }).catch((err) => {
            this.errorCount++;
            log.error('Error retrieving astrology data');
        });
    }

    getData(url) {
        var resData = '';
        return new Promise((resolve, reject) => {
            var req = http.get(url, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    var resData = '';
                    res.on('data', function(data) {
                        resData += data;
                    });

                    res.on('end', () => {
                        log.debug({
                            resData: resData
                        }, 'Received data from weather service');
                        if (resData) {
                            resolve(JSON.parse(resData));
                        } else {
                            reject(new Error('No response data received'));
                        }
                    });
                } else {
                    reject(new Error('Unexpected response status: ' + res.statusCode));
                }
            });
            req.on('error', (err) => {
                var msg = 'Error fetching data from weather service';
                log.error({
                    err: err
                }, msg);
                reject(new Error(msg));
            });
        });
    }

    getSunset() {
        var ret = null;
        if (this.astronomyData) {
            ret = this.astronomyData.sun_phase.sunset;
        }
        return ret;
    }

    getSunrise() {
        var ret = null;
        if (this.astronomyData) {
            ret = this.astronomyData.sun_phase.sunrise;
        }
        return ret;
    }

    getErrorCount() {
        return this.errorCount;
    }
}

module.exports = WeatherService;
