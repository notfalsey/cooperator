'use strict';

var log = require('../logger.js')();

function setup(app, url, videoService) {

    function end(res) {
        res.end();
        log.trace({
            res: res
        }, 'Sending response');
    }

    app.get(url, function(req, res) {
        log.trace({
            req: req
        }, 'Entering get ' + url);
        videoService.get(res);
    });

    app.put(url + '/pan', function(req, res) {
        log.trace({
            req: req,
            dir: req.body.dir
        }, 'Entering put ' + url + '/pan');
        videoService.pan(req.body.dir).then((status) => {
            res.status(status);
            end(res);
        }).catch((err) => {
            res.status(500);
            end(res);
        });
    });

    app.put(url + '/ir', function(req, res) {
        log.trace({
            req: req,
            ir: req.body.ir
        }, 'Entering put ' + url + '/ir');
        videoService.setIR(req.body.ir).then((status) => {
            res.status(status);
            end(res);
        }).catch((err) => {
            res.status(500);
            end(res);
        });
    });

    app.put(url + '/preset', function(req, res) {
        log.trace({
            req: req,
            preset: req.body.preset
        }, 'Entering put ' + url + '/preset');
        videoService.goToPreset(req.body.preset).then((status) => {
            res.status(status);
            end(res);
        }).catch((err) => {
            res.status(500);
            end(res);
        });
    });
}

module.exports = setup;
