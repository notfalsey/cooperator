'use strict';

var CertificateManager = require('./CertificateManager.js'),
    CoopApp = require('./CoopApp.js'),
    Promise = require('bluebird'),
    props = require('./Properties.js'),
    fs = Promise.promisifyAll(require('fs-extra')),
    log = require('./logger.js')();

// to prevent unhandled rejecttions from hiding
Promise.onPossiblyUnhandledRejection((error) => {
    throw error;
});

// add an uncaught exception handler that allows us to log the final bits and anything else before the ship sinks
process.on('uncaughtException', (err) => {
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

log.info('Reading config...');
fs.readJSONAsync(props.getConfigJson()).then((data) => {
    log.trace({
        config: data
    }, 'Read configuration');
    config = data;
}).then(() => {
    log.info('Verifying certs...');
    var certMgr = new CertificateManager();
    return certMgr.verifyCertsDir().then(() => {
        log.trace('Verified certs dir');
        return certMgr.isKeyPairInstalled().then(() => {
            log.trace('Keypair is installed');
        }).catch(() => {
            log.trace('Keypair is not installed, generating...');
            return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
        });
    }).catch((err) => {
        log.error({
            err: err
        }, 'Error verifying certs dir');
        throw err;
    });
}).then(() => {
    log.trace('Constructing coop app');
    var config = fs.readJsonSync(props.getConfigJson());
    var app = new CoopApp(config);
    log.trace('Starting coop app');
    return app.start(props.getHttpKeyPath(), props.getHttpCertPath());
}).catch((err) => {
    log.error({
        err: err
    }, 'Error starting app');
    console.error('Error: ' + err);
    process.exit(1);
});
