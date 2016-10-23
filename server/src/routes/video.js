'use strict';

var log = require('../logger.js')();

function setup(app, url, videoService) {

    app.get(url, function(req, res) {
        log.trace('Entering get ' + url);
        videoService.get(res);
    });

    app.put(url + '/pan', function(req, res) {
        log.trace({
            dir: req.body.dir
        }, 'Entering put ' + url + '/pan');
        videoService.pan(req.body.dir).then((status) => {
            res.status(status);
            res.end();
        }).catch((err) => {
            res.status(500);
            res.end();
        });
    });

    app.put(url + '/ir', function(req, res) {
        log.trace({
            ir: req.body.ir
        }, 'Entering put ' + url + '/ir');
        videoService.setIR(req.body.ir).then((status) => {
            res.status(status);
            res.end();
        }).catch((err) => {
            res.status(500);
            res.end();
        });
    });

    app.put(url + '/preset', function(req, res) {
        log.trace({
            preset: req.body.preset
        }, 'Entering put ' + url + '/preset');
        videoService.goToPreset(req.body.preset).then((status) => {
            res.status(status);
            res.end();
        }).catch((err) => {
            res.status(500);
            res.end();
        });
    });
}

module.exports = setup;
