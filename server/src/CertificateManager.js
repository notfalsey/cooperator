'use strict';

var async = require('async'),
    ChildProcess = require('child_process'),
    fs = require('fs-extra'),
    path = require('path'),
    props = require('./Properties.js'),
    log = require('./logger.js')();

class CertificateManager {

    constructor() {}

    verifyCertsDir(callback) {
        fs.ensureDir(props.getCertsDir(), (err) => {
            if (err) {
                log.error({
                    err: err
                }, 'There was an error creating dir: ' + props.getCertsDir());
                callback(err);
            } else {
                callback(null);
            }
        });
    }

    isKeyPairInstalled(callback) {
        fs.exists(props.getHttpCertPath(),
            (exists) => {
                if (exists) {
                    fs.exists(props.getHttpKeyPath(), (exists) => {
                        callback(exists);
                    });
                } else {
                    callback(exists);
                }
            }
        );
    }

    validateKeyCertPair(certPath, keyPath, callback) {
        log.trace({
            certPath: certPath,
            keyPath: keyPath
        }, 'Entered validateKeyCertPairWithOpenSsl');

        var keyModulusArgs = ['rsa', '-noout', '-modulus', '-in', keyPath];
        var certModulusArgs = ['x509', '-noout', '-modulus', '-in', certPath];

        async.series(
            [
                (callback) => {
                    ChildProcess.execFile('openssl', keyModulusArgs, callback);
                },
                (callback) => {
                    ChildProcess.execFile('openssl', certModulusArgs, callback);
                }
            ],
            (err, results) => {
                if (err) {
                    log.error({
                        err: err
                    }, 'Error validating key/certificate pair.');
                    callback(err, null);
                } else {
                    if (results && results.length == 2) {
                        if (!results[0].error && !results[1].error) {
                            // The modulus from the key and the certificate will be identical if they are a matching
                            // pair.
                            if (results[0][0] === results[1][0]) {
                                callback(null, true);
                            } else {
                                callback(null, false);
                            }
                        } else {
                            log.error({
                                results: results
                            }, 'Key modulus generation failed.');
                            callback('Key modulus generation failed.  Check logs for details.', null);
                        }
                    } else {
                        log.error({}, 'Incorrect number of results encountered.');
                        callback('Incorrect number of results encountered.  Check logs for details.', null);
                    }
                }
            }
        );
    }

    generateKeyPair(cn, certPath, keyPath, callback) {
        log.trace({
            cn: cn
        }, 'Entered generateKeyPairWithOpenSsl');
        var tempKeyPath = path.join(props.getCertsDir(), 'tmpPrivKey.pem');
        var tempCertPath = path.join(props.getCertsDir(), 'tmpPublicCert.pem');
        var tempCsrPath = path.join(props.getCertsDir(), 'tmpCsr.pem');
        var args = ['genrsa', '-out', tempKeyPath, '2048'];
        log.trace({
            args: args,
        }, 'Spawning openssl to generate key');
        ChildProcess.execFile('openssl', args, (err, stdout, stderr) => {
            log.trace({
                tempKeyPath: tempKeyPath,
                tempCsrPath: tempCsrPath,
                error: err
            }, 'Returned from generating key');
            if (!err) {
                args = ['req', '-new', '-key', tempKeyPath, '-out', tempCsrPath, '-subj', '/CN=' + cn];
                log.trace({
                    args: args
                }, 'Spawning openssl to generate cert');
                ChildProcess.execFile('openssl', args, (err, stdout, stderr) => {
                    log.trace({
                        tempCertPath: tempCertPath,
                        error: err
                    }, 'Returned from generating cert');
                    if (!err) {
                        args = ['x509', '-req', '-in', tempCsrPath, '-signkey', tempKeyPath, '-out', tempCertPath];
                        log.trace({
                                args: args,
                            },
                            'Spawning openssl to sign cert');
                        ChildProcess.execFile('openssl', args, (err, stdout, stderr) => {
                            log.trace({
                                error: err
                            }, 'Returned from signing cert');
                            if (!err) {
                                fs.move(tempKeyPath, keyPath, {
                                    clobber: true
                                }, (err) => {
                                    if (err) {
                                        log.error({
                                            err: err,
                                            from: tempKeyPath,
                                            to: keyPath
                                        }, 'Error moving file');
                                        callback(err);
                                    } else {
                                        log.trace({
                                            from: tempKeyPath,
                                            to: keyPath
                                        }, 'Moved key file');
                                        fs.move(tempCertPath, certPath, {
                                            clobber: true
                                        }, (err) => {
                                            if (err) {
                                                log.error({
                                                    err: err,
                                                    from: tempCertPath,
                                                    to: certPath
                                                }, 'Error moving file');
                                                callback(err);
                                            } else {
                                                log.trace({
                                                    from: tempCertPath,
                                                    to: certPath
                                                }, 'Moved cert file');
                                                log.info('Keypair generated and moved successfully.');
                                                callback(null);
                                            }
                                        });
                                    }
                                });
                            } else {
                                log.error({
                                    stdout: stdout,
                                    stderr: stderr,
                                    error: err
                                }, 'Error self-signing certificate');
                                callback(new Error('There was an error self-signing the certificate.  Check logs for detail.'));
                            }
                        });
                    } else {
                        log.error({
                            stdout: stdout,
                            stderr: stderr,
                            error: err
                        }, 'Error creating CSR');
                        callback(new Error('There was an error creating the CSR.  Check logs for detail.'));
                    }
                });
            } else {
                log.error({
                    stdout: stdout,
                    stderr: stderr,
                    error: err
                }, 'Error generating private key');
                callback(new Error('There was an error generating key.  Check logs for detail.'));
            }
        });
    }
}

module.exports = CertificateManager;
