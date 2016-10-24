var assert = require('assert'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    props = require('../src/Properties.js'),
    CertificateManager = require('../src/CertificateManager.js');

describe('CertificateManager', () => {
    var certMgr;

    beforeEach(() => {
        return fs.removeAsync(props.getCertsDir()).then(() => {
            certMgr = new CertificateManager();
        });
    });

    it('should verify certs dir', () => {
        return certMgr.verifyCertsDir();
    });

    it('should check if keypair is installed', () => {
        return certMgr.isKeyPairInstalled().catch((err) => {
            assert(err);
            return certMgr.verifyCertsDir().then(() => {
                	return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
            	}).then(() => {
                	return certMgr.isKeyPairInstalled();
                });
        });
    });
});
