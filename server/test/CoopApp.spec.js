var assert = require('assert'),
    props = require('../src/Properties.js'),
    mockery = require('mockery');

describe('CoopApp', () => {
    var CoopApp;

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
    });

    afterEach(() => {
        mockery.deregisterAll();
    });

    after(() => {
        mockery.disable();
    });

    it('should start and stop server', () => {
        var config = {
            httpsPort: 9443,
            doAuth: false
        }
        var coopApp = new CoopApp(config);
        return coopApp.start(props.getHttpKeyPath(), props.getHttpCertPath()).then(() => {
            return coopApp.stop();
        });
    });
});
