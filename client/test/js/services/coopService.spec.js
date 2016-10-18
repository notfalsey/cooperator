describe('coopService test', function() {
    var assert = chai.assert;
    var coopServiceInstance;
    var httpBackend, interval, location;
    var moduleName = 'coopApp';
    var baseUrl = '/coop';
    var serviceName = moduleName + '.coopService';

    beforeEach(function() {
        module(moduleName);
    });

    beforeEach(inject(function($httpBackend, $injector) {
        httpBackend = $httpBackend;
        coopServiceInstance = $injector.get(serviceName);
    }));

    var statusTests = [{
        url: '/door',
        method: 'getDoorState',
        value: 'closed'
    }, {
        url: '/health',
        method: 'getHealth',
        value: {
            readErrors: 2
        }
    }, {
        url: '/uptime',
        method: 'getUptime',
        value: 1234531317
    }, {
        url: '/closetime',
        method: 'getClosingTime',
        value: {
            hour: 18,
            minute: 54
        }
    }, {
        url: '/opentime',
        method: 'getOpeningTime',
        value: {
            hour: 6,
            minute: 54
        }
    }, {
        url: '/mode',
        method: 'getMode',
        value: 'auto'
    }, {
        url: '/temp',
        method: 'getTemp',
        value: 45
    }, {
        url: '/light',
        method: 'getLight',
        value: 795
    }];

    statusTests.forEach(function(statusTest) {
        it('should return ' + statusTest.url + ' status', function(done) {
            httpBackend.expectGET(baseUrl + statusTest.url).respond(200, statusTest.value);
            coopServiceInstance[statusTest.method]().then(function(content) {
                assert.deepEqual(statusTest.value, content);
                done();
            }, done);
            httpBackend.flush();
        });
    });

    statusTests.forEach(function(statusTest) {
        it('should handle error on ' + statusTest.url + ' status', function(done) {
            httpBackend.expectGET(baseUrl + statusTest.url).respond(500, statusTest.value);
            coopServiceInstance[statusTest.method]().then(function(content) {
                // we expect an error to be returned
                assert.fail();
                done(new Error('should have thrown error'));
            }, function(err) {
                assert(err);
                done();
            });
            httpBackend.flush();
        });
    });

    it('should properly command door', function(done) {
        var dirToTest = 'close';
        httpBackend.expectPUT(baseUrl + '/door', {
            dir: dirToTest
        }).respond(200);

        coopServiceInstance.commandDoor(dirToTest).then(function() {
            done();
        }, done);

        httpBackend.flush();
    });

    it('should handle error on door command', function(done) {
        var dirToTest = 'close';
        httpBackend.expectPUT(baseUrl + '/door', {
            dir: dirToTest
        }).respond(500);

        coopServiceInstance.commandDoor(dirToTest).then(function() {
            console.log('no error returned');
            // we should have failed
            assert.fail();
            done(new Error('should have thrown error'));
        }, function(err) {
            // this is expected
            assert(err);
            done();
        });

        httpBackend.flush();
    });

    it('should properly reset coop', function(done) {
        httpBackend.expectPUT(baseUrl + '/reset', {}).respond(200);

        coopServiceInstance.reset().then(function() {
            done();
        }, done);

        httpBackend.flush();
    });

    it('should handle error on reset coop', function(done) {
        httpBackend.expectPUT(baseUrl + '/reset', {}).respond(500);

        coopServiceInstance.reset().then(function() {
            assert.fail();
            done(new Error('should have thrown error'));
        }, function(err) {
            //this is expected
            assert(err);
            done();
        });

        httpBackend.flush();
    });

});
