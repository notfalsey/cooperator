'use strict';

var log = require('../logger.js')();

function setup(app, url, weatherService) {

    app.get(url + '/sunrise', function(req, res) {
        log.trace('Entering get ' + url + '/sunrise');
        var sunrise = weatherService.getSunrise();
        log.debug({
            sunrise: sunrise
        }, 'Read sunrise');
        res.status(200).json(sunrise);
        res.end();
    });

    app.get(url + '/sunset', function(req, res) {
        log.trace('Entering get ' + url + '/sunset');
        var sunset = weatherService.getSunset();
        log.debug({
            sunset: sunset
        }, 'Read sunset');
        res.status(200).json(sunset);
        res.end();
    });

    app.get(url + '/errors', function(req, res) {
        log.trace('Entering get ' + url + '/errors');
        res.status(200).json(weatherService.getErrorCount());
        res.end();
    });
}

module.exports = setup;
