'use strict';

var ChildProcess = require('child_process'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    path = require('path'),
    props = require('./Properties.js'),
    log = require('./logger.js')();

class CertificateManager {

    constructor() {}

    verifyCertsDir(callback) {
        return fs.ensureDirAsync(props.getCertsDir());
    }

    isKeyPairInstalled(callback) {
        var promises = [];
        promises.push(fs.accessAsync(props.getHttpCertPath(), fs.R_OK));
        promises.push(fs.accessAsync(props.getHttpKeyPath(), fs.R_OK));
        return Promise.all(promises);
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
        return new Promise((resolve, reject) => {
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
                                    var promises = [];
                                    promises.push(fs.moveAsync(tempKeyPath, keyPath, {
                                        clobber: true
                                    }));
                                    promises.push(fs.moveAsync(tempCertPath, certPath, {
                                        clobber: true
                                    }));
                                    Promise.all(promises).then(() => {
                                        resolve();
                                    }).catch((err) => {
                                        reject(err);
                                    });
                                } else {
                                    log.error({
                                        stdout: stdout,
                                        stderr: stderr,
                                        error: err
                                    }, 'Error self-signing certificate');
                                    reject(new Error('There was an error self-signing the certificate.  Check logs for detail.'));
                                }
                            });
                        } else {
                            log.error({
                                stdout: stdout,
                                stderr: stderr,
                                error: err
                            }, 'Error creating CSR');
                            reject(new Error('There was an error creating the CSR.  Check logs for detail.'));
                        }
                    });
                } else {
                    log.error({
                        stdout: stdout,
                        stderr: stderr,
                        error: err
                    }, 'Error generating private key');
                    reject(new Error('There was an error generating key.  Check logs for detail.'));
                }
            });
        });
    }
}

module.exports = CertificateManager;
