'use strict';

var log = require('../logger.js')();

function setup(app, url, weatherService) {

    function end(res) {
        res.end();
        log.trace({
            res: res
        }, 'Sending response');
    }

    app.get(url + '/sunrise', function(req, res) {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/sunrise');
        var sunrise = weatherService.getSunrise();
        log.debug({
            sunrise: sunrise
        }, 'Read sunrise');
        res.status(200).json(sunrise);
        end(res);
    });

    app.get(url + '/sunset', function(req, res) {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/sunset');
        var sunset = weatherService.getSunset();
        log.debug({
            sunset: sunset
        }, 'Read sunset');
        res.status(200).json(sunset);
        end(res);
    });

    app.get(url + '/errors', function(req, res) {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/errors');
        res.status(200).json(weatherService.getErrorCount());
        end(res);
    });
}

module.exports = setup;
