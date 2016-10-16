'use strict';

var bunyan = require('bunyan'),
    fs = require('fs-extra'),
    properties = require('./Properties.js');

var logger;

function createLogger(createNew, configFileName) {
    if (!configFileName) {
        configFileName = __dirname + '/../config/config.json';
    }

    if (logger && createNew !== true) {
        return logger;
    }

    function reqSerializer(req) {
        if (!req || !req.connection) {
            return req;
        }
        return {
            method: req.method,
            url: req.url,
            host: req.headers.host,
            accept: req.headers.accept,
            origin: req.headers.origin,
            useragent: req.headers['user-agent'],
            acceptencoding: req.headers['accept-encoding'],
            id: req.id,
            // In case there's a proxy server:
            ip: req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress
        };
    }

    function resSerializer(res) {
        if (!res) {
            return res;
        }
        var ret = {
            headers: res._header,
            id: res.id
        };
        if (res.requestStart) {
            ret.responseTime = (new Date()).getTime() - res.requestStart;
        }
        return ret;
    }

    function errSerializer(err) {
        if (!err || !err.stack) {
            return err;
        }

        return {
            message: err.message,
            name: err.name,
            stack: err.stack,
            code: err.code,
            signal: err.signal,
            requestId: err.requestId
        };
    }

    fs.mkdirsSync(properties.getLogsDir());
    if (!fs.existsSync(properties.getLogsDir())) {
        console.log('Error: Could not create logs directory: ' + properties.getLogsDir());
    }

    // first set a default in case we have no config
    var logConfig = {
        level: 'trace',
        count: 10
    };

    var config = null;
    if (fs.existsSync(configFileName)) {
        config = fs.readJsonSync(configFileName);
    }
    if (config && config.logging) {
        logConfig = config.logging;
    }

    var logInitSettings = {
        name: 'Coop',
        serializers: {
            req: reqSerializer,
            res: resSerializer,
            err: errSerializer
        },
        streams: [{
            level: 'fatal',
            stream: process.stderr
        }, {
            type: 'rotating-file',
            level: logConfig.level,
            path: properties.getLogFile(),
            count: logConfig.count // keep 10 back copies
        }]
    };

    // Want to allow both to get added so the user sees an error that something is configured incorrectly.
    if (logConfig.size) {
        logInitSettings.streams[1].size = logConfig.size;
    }

    if (logConfig.period) {
        logInitSettings.streams[1].period = logConfig.period;
    }

    // If no period or size was specified, default to size.
    if (!logConfig.period && !logConfig.size) {
        logInitSettings.streams[1].size = 10000000;
    }

    logger = bunyan.createLogger(logInitSettings);

    return logger;
}

module.exports = createLogger;
