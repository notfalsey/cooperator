'use strict';

var http = require('http'),
    Promise = require('bluebird'),
    log = require('./logger.js')();

class VideoService {
    constructor(config) {
        log.info('Initializing video service');
        var keepAliveAgent = new http.Agent({
            keepAlive: true
        });
        this.cameraUser = config.cameraUser;
        this.cameraPassword = config.cameraPassword;
        this.options = {
            agent: keepAliveAgent,
            hostname: config.cameraIp,
            port: 80,
            method: 'GET'
        };

        this.commands = {
            up: 0,
            stop: 1,
            down: 2,
            right: 4,
            left: 6,
            upleft: 9,
            upright: 90,
            downright: 92,
            leftdown: 93,
            irOff: 94,
            irOn: 95,
            presets: {
                1: 31,
                2: 33,
                3: 35,
                4: 37,
                5: 39,
                6: 41,
                7: 43,
                8: 45
            }
        };
    }

    sendRequest(options, callback) {
        log.trace('Entering VideoService:sendRequest');

        return new Promise((resolve, reject) => {
            var req = http.request(options, (res) => {
                res.on('data', (data) => {
                    // do nothing
                });
                res.on('end', (err) => {
                    if (res.statusCode >= 300) {
                        reject(new Error('Bad status: ' + res.statusCode));
                    } else {
                        resolve(res.statusCode);
                    }
                });
            });
            req.on('error', (err) => {
                var msg = 'Error connecting to video service';
                log.error({
                    err: err
                }, msg);
                reject(new Error(msg));
            });
            req.end();
        });
    }

    pipeRequest(options, callerRes) {
        log.trace('Entering VideoService:pipeRequest');
        try {
            var req = http.request(options, (res) => {
                console.log('res: ', res);
                console.log('callerRes: ', callerRes);
                res.pipe(callerRes);
            });
            req.on('error', (err) => {
                var msg = 'Error connecting to video service';
                log.error(msg);
                callerRes.status(500).json(msg);
                callerRes.end();
            });
            req.end();
        } catch (err) {
            var msg = 'Error connecting to video service';
            log.error({
                err: err
            }, msg);
            callerRes.status(500).json(msg);
            callerRes.end();
        }
    }

    get(callerRes) {
        log.trace('Entering VideoService:get');
        this.options.path = '/snapshot.cgi?user=' + this.cameraUser + '&pwd=' + this.cameraPassword;
        this.pipeRequest(this.options, callerRes);
    }

    pan(dir, callback) {
        log.trace({
            dir: dir
        }, 'Entering VideoService:pan');
        this.options.path = '/decoder_control.cgi?onestep=1&command=' + this.commands[dir] + '&user=' + this.cameraUser + '&pwd=' + this.cameraPassword;
        return this.sendRequest(this.options);
    }

    setIR(ir, callback) {
        log.trace({
            ir: ir
        }, 'Entering VideoService:setIR');
        var command = this.commands.irOn;
        if (ir === false) {
            command = this.commands.irOff;
        }
        this.options.path = '/decoder_control.cgi?command=' + command + '&user=' + this.cameraUser + '&pwd=' + this.cameraPassword;
        return this.sendRequest(this.options);
    }

    goToPreset(preset, callback) {
        log.trace({
            preset: preset
        }, 'Entering VideoService:pan');
        this.options.path = '/decoder_control.cgi?command=' + this.commands.presets[preset] + '&user=' + this.cameraUser + '&pwd=' + this.cameraPassword;
        return this.sendRequest(this.options);
    }
}

module.exports = VideoService;
