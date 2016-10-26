var assert = require('assert'),
    CertificateManager = require('../src/CertificateManager.js'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs-extra')),
    props = require('../src/Properties.js'),
    request = require('supertest'),
    mockery = require('mockery');

describe('CoopApp', function() {
    this.timeout(0);
    var CoopApp;
    var certMgr = new CertificateManager();
    var testHttpsPort = 9876;

    before(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('./CoopController.js', function() {});
        mockery.registerMock('./NotifyService.js', function() {});
        mockery.registerMock('./WeatherService.js', function() {});
        mockery.registerMock('./VideoService.js', function() {});
    });

    beforeEach(() => {
        CoopApp = require('../src/CoopApp.js');
        return fs.removeAsync(props.getCertsDir());
    });

    afterEach(() => {
        mockery.deregisterAll();
    });

    after(() => {
        mockery.disable();
    });

    it('should start and stop server', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        return certMgr.verifyCertsDir().then(() => {
            return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
        }).then(() => {
            return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath());
        }).then(() => {
            return coopApp.stop();
        });
    });

    it('should fail to start a server with bad cert', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        return certMgr.verifyCertsDir().then(() => {
            // cert junk cert
            var promises = [];
            promises.push(fs.writeFileAsync(props.getHttpKeyPath(), 'junk'));
            promises.push(fs.writeFileAsync(props.getHttpCertPath(), 'junk'));
            return Promise.all(promises);
        }).then(() => {
            return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath()).then(() => {
                assert.fail('should have failed to start with no cert');
            }).catch((err) => {
                assert(err);
            });
        });
    });

    it('should fail to stop app that is not started', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        coopApp.stop().then(() => {
            assert.fail('stopped app without starting');
        }).catch((err) => {
            assert(err);
        });
    });

    it('should rediect to login page', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        return certMgr.verifyCertsDir().then(() => {
            return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
        }).then(() => {
            return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath());
        }).then(() => {
            // should redirect to login
            return request(coopApp.getApp())
                .get('/')
                .expect(302)
                .expect('Location', '/login');
        }).then(() => {
            return coopApp.stop();
        });
    });

    it('should serve login page', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        return certMgr.verifyCertsDir().then(() => {
            return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
        }).then(() => {
            return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath());
        }).then(() => {
            // should redirect to login
            return request(coopApp.getApp())
                .get('/login')
                .expect(200)
                .then((response) => {
                    assert(response.text.indexOf('Login') != -1);
                });
        }).then(() => {
            return coopApp.stop();
        });
    });

    it('should rediect back to main page after logout', () => {
        var config = {
            httpsPort: testHttpsPort,
            googleOauthClientId: "fake.com"
        };
        var coopApp = new CoopApp(config);
        return certMgr.verifyCertsDir().then(() => {
            return certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath());
        }).then(() => {
            return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath());
        }).then(() => {
            // should redirect to login
            return request(coopApp.getApp())
                .get('/logout')
                .expect(302)
                .expect('Location', '/');
        }).then(() => {
            return coopApp.stop();
        });
    });
});
