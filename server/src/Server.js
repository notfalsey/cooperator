'use strict';

var async = require('async'),
    CertificateManager = require('./CertificateManager.js'),
    CoopApp = require('./CoopApp.js'),
    Promise = require('bluebird'),
    props = require('./Properties.js'),
    fs = require('fs-extra'),
    log = require('./logger.js')();

// to prevent unhandled rejecttions from hiding
Promise.onPossiblyUnhandledRejection(function(error) {
    throw error;
});

// add an uncaught exception handler that allows us to log the final bits and anything else before the ship sinks
process.on('uncaughtException', function(err) {
    //process.removeListener('uncaughtException', arguments.callee);

    // log the exception
    log.fatal(err);

    function closeHandler(streamError, stream) {
        throw err;
    }

    // flush and close the streams to we get the last bit of log that is oh so important
    function closeStream(elem, index, array) {
        // throw original once stream is closed
        elem.stream.on('close', closeHandler);
        if (elem.type == 'file') {
            elem.stream.end();
        }
    }

    log.streams.forEach(closeStream);
    process.exit(1);
});

var config = null;
var msg = 'Starting coop app...';
log.info('===================================');
log.info(msg);
console.warn(msg);

async.series([
    function(callback) {
        log.info('Reading config...');
        fs.readJSON(props.getConfigJson(), function(err, data) {
            if (err) {
                var msg = 'Error reading config file: ' + props.getConfigJson();
                console.error(msg);
                log.error(msg);
                callback(new Error(msg));
            } else {
                log.trace({
                    config: data
                }, 'Read configuration');
                config = data;
                callback();
            }
        });
    },
    function(callback) {
        log.info('Verifying certs...');
        var certMgr = new CertificateManager();
        certMgr.verifyCertsDir(function(err) {
            if (err) {
                log.error({
                    err: err
                }, 'Error verifying certs dir');
                callback(err);
            } else {
                log.trace('Verified certs dir');
                certMgr.isKeyPairInstalled(function(installed) {
                    if (!installed) {
                        log.trace('Keypair is not installed, generating...');
                        certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath(), callback);
                    } else {
                        log.trace('Keypair is installed');
                        callback();
                    }
                });
            }
        });
    },
    function(callback) {
        log.trace('Constructing coop app');
        var app = new CoopApp();
        log.trace('Starting coop app');
        app.start(props.getHttpKeyPath(), props.getHttpCertPath(), callback);
    }
], function(err, results) {
    if (err) {
        log.error({
            err: err
        }, 'Error starting app');
        console.error('Error: ' + err);
    }
});
