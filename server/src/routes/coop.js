'use strict';

var log = require('../logger.js')();

function setup(app, url, controller) {
    app.put(url + '/reset', function(req, res) {
        log.trace('Entering put ' + url + '/reset');
        log.info('reset requested');
        controller.reset(function(err) {
            var msg;
            if (err) {
                msg = 'Error resetting coop';
                log.error({
                    err: err
                }, msg);
                res.status(500).json(msg);
            } else {
                msg = 'Coop is resetting';
                log.info(msg);
                res.status(200).json(msg);
            }
            res.end();
        });
    });

    app.get(url + '/temp', function(req, res) {
        log.trace('Entering get ' + url + '/temp');
        var temp = controller.readTemp();
        log.debug({
            temp: temp
        }, 'Read temp');
        res.status(200).json(temp);
        res.end();
    });

    app.get(url + '/light', function(req, res) {
        log.trace('Entering get ' + url + '/light');
        var light = controller.readLight();
        log.debug({
            light: light
        }, 'Read light');
        res.status(200).json(light);
        res.end();
    });

    app.get(url + '/uptime', function(req, res) {
        log.trace('Entering get ' + url + '/uptime');
        var uptime = controller.readUptime();
        log.debug({
            uptime: uptime
        }, 'Read uptime');
        res.status(200).json(uptime);
        res.end();
    });

    function getHourMin(minutes) {
        return {
            hour: Math.floor(minutes / 60),
            minute: minutes % 60
        };
    }

    app.get(url + '/closetime', function(req, res) {
        log.trace('Entering get ' + url + '/closetime');
        var closingMinutes = controller.getClosingTime();
        res.status(200).json(getHourMin(closingMinutes));
        res.end();
    });

    app.get(url + '/opentime', function(req, res) {
        log.trace('Entering get ' + url + '/opentime');
        var openingMinutes = controller.getOpeningTime();
        res.status(200).json(getHourMin(openingMinutes));
        res.end();
    });

    app.get(url + '/health', function(req, res) {
        log.trace('Entering get ' + url + '/rerrors');
        var health = {};
        health.readErrors = controller.getReadErrorCount();
        health.writeErrors = controller.getWriteErrorCount();
        health.autoResets = controller.getAutoResetCount();
        health.lastError = controller.getLastError().toString();
        health.lastRead = controller.getLastSuccessfulRead().toString();
        health.lastWrite = controller.getLastSuccessfulWrite().toString();
        health.longestUptime = controller.getLongestUptime().toString();
        res.status(200).json(health);
        res.end();
    });

    app.route(url + '/mode')
        .get(function(req, res) {
            log.trace('Entering get ' + url + '/mode');
            var mode = controller.readMode();
            var modeString = 'auto';
            if (mode === 1) {
                modeString = 'manual';
            }
            log.debug({
                mode: mode,
                modeString: modeString
            }, 'Read mode');
            res.status(200).json(modeString);
            res.end();
        });

    app.route(url + '/door')
        .get(function(req, res) {
            log.trace('Entering get ' + url + '/door');
            var door = controller.readDoor();
            var doorString = 'transitioning';
            if (door === 0) {
                doorString = 'open';
            } else if (door === 2) {
                doorString = 'closed';
            }
            log.debug({
                door: door,
                doorString: doorString
            }, 'Read door');
            res.status(200).json(doorString);
            res.end();
        })
        .put(function(req, res) {
            log.trace({
                dir: req.body.dir
            }, 'Entering put ' + url + '/door');
            var msg;
            if (req.body.dir === 'open') {
                controller.openDoor(function(err) {
                    if (err) {
                        msg = 'Error opening door';
                        log.error({
                            err: err
                        }, msg);
                        res.status(500).json(msg);
                    } else {
                        msg = 'Door is opening';
                        log.debug(msg);
                        res.status(200).json(msg);
                    }
                    res.end();
                });
            } else if (req.body.dir === 'close') {
                controller.closeDoor(function(err) {
                    if (err) {
                        msg = 'Error closing door';
                        log.error({
                            err: err
                        }, msg);
                        res.status(500).json(msg);
                    } else {
                        msg = 'Door is closing';
                        log.debug(msg);
                        res.status(200).json(msg);
                    }
                    res.end();
                });
            } else if (req.body.dir === 'auto') {
                controller.autoDoor(function(err) {
                    if (err) {
                        msg = 'Error setting door to auto mode';
                        log.error({
                            err: err
                        }, msg);
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
                log.error({
                    dir: req.body.dir
                }, msg);
                res.status(422).json(msg);
                res.end();
            }
        });
}

module.exports = setup;
