'use strict';

var log = require('../logger.js')();

function setup(app, url, controller) {
    function end(res) {
        res.end();
        log.trace({
            res: res
        }, 'Sending response');
    }

    app.put(url + '/reset', (req, res) => {
        log.trace({
            req: req
        }, 'Entering put ' + url + '/reset');
        log.info('reset requested');
        controller.reset().then(() => {
            var msg = 'Coop is resetting';
            log.info(msg);
            res.status(200).json(msg);
            end(res);
        }).catch((err) => {
            var msg = 'Error resetting coop';
            log.error({
                err: err
            }, msg);
            res.status(500).json(msg);
            end(res);
        });
    });

    app.get(url + '/temp', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/temp');
        var temp = controller.readTemp();
        log.debug({
            temp: temp
        }, 'Read temp');
        res.status(200).json(temp);
        end(res);
    });

    app.get(url + '/light', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/light');
        var light = controller.readLight();
        log.debug({
            light: light
        }, 'Read light');
        res.status(200).json(light);
        end(res);
    });

    app.get(url + '/uptime', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/uptime');
        var uptime = controller.readUptime();
        log.debug({
            uptime: uptime
        }, 'Read uptime');
        res.status(200).json(uptime);
        end(res);
    });

    function getHourMin(minutes) {
        return {
            hour: Math.floor(minutes / 60),
            minute: minutes % 60
        };
    }

    app.get(url + '/closetime', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/closetime');
        var closingMinutes = controller.getClosingTime();
        res.status(200).json(getHourMin(closingMinutes));
        end(res);
    });

    app.get(url + '/opentime', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/opentime');
        var openingMinutes = controller.getOpeningTime();
        res.status(200).json(getHourMin(openingMinutes));
        end(res);
    });

    app.get(url + '/health', (req, res) => {
        log.trace({
            req: req
        }, 'Entering get ' + url + '/rerrors');
        var health = {};
        health.readErrors = controller.getReadErrorCount();
        health.writeErrors = controller.getWriteErrorCount();
        health.autoResets = controller.getAutoResetCount();
        health.lastError = controller.getLastError().toString();
        health.lastRead = controller.getLastSuccessfulRead().toString();
        health.lastWrite = controller.getLastSuccessfulWrite().toString();
        health.longestUptime = controller.getLongestUptime().toString();
        res.status(200).json(health);
        end(res);
    });

    app.route(url + '/mode')
        .get((req, res) => {
            log.trace({
                req: req
            }, 'Entering get ' + url + '/mode');
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
            end(res);
        });

    app.route(url + '/door')
        .get((req, res) => {
            log.trace({
                req: req
            }, 'Entering get ' + url + '/door');
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
            end(res);
        })
        .put((req, res) => {
            log.trace({
                req: req,
                dir: req.body.dir
            }, 'Entering put ' + url + '/door');
            var msg;
            if (req.body.dir === 'open') {
                controller.openDoor().then(() => {
                    var msg = 'Door is opening';
                    log.debug(msg);
                    res.status(200).json(msg);
                    end(res);
                }).catch((err) => {
                    var msg = 'Error opening door';
                    log.error({
                        err: err
                    }, msg);
                    res.status(500).json(msg);
                    end(res);
                });
            } else if (req.body.dir === 'close') {
                controller.closeDoor().then(() => {
                    var msg = 'Door is closing';
                    log.debug(msg);
                    res.status(200).json(msg);
                    end(res);
                }).catch((err) => {
                    var msg = 'Error closing door';
                    log.error({
                        err: err
                    }, msg);
                    res.status(500).json(msg);
                    end(res);
                });
            } else if (req.body.dir === 'auto') {
                controller.autoDoor().then(() => {
                    var msg = 'Door is in auto mode';
                    log.debug(msg);
                    res.status(200).json(msg);
                    end(res);
                }).catch((err) => {
                    var msg = 'Error setting door to auto mode';
                    log.error({
                        err: err
                    }, msg);
                    res.status(500).json(msg);
                    end(res);
                });
            } else {
                msg = 'Invalid door direction';
                log.error({
                    dir: req.body.dir
                }, msg);
                res.status(422).json(msg);
                end(res);
            }
        });
}

module.exports = setup;
