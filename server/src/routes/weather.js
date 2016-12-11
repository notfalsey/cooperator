'use strict';

var suncalc = require('suncalc'),
    log = require('../logger.js')();

function setup(app, url, latitude, longitude) {

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
        var times = suncalc.getTimes(new Date(), latitude, longitude);
        var sunrise = {
            hour: times.sunrise.getHours(),
            minute: times.sunrise.getMinutes()
        };

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
        var times = suncalc.getTimes(new Date(), latitude, longitude);
        var sunset = {
            hour: times.dusk.getHours(),
            minute: times.dusk.getMinutes()
        };

        log.debug({
            sunset: sunset
        }, 'Read sunset');
        res.status(200).json(sunset);
        end(res);
    });
}

module.exports = setup;
