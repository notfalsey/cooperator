describe('videoService test', function() {
    var assert = chai.assert;
    var videoServiceInstance, $httpBackend;
    var moduleName = 'coopApp';
    var baseUrl = '/video';
    var serviceName = 'videoService';

    beforeEach(function() {
        module(moduleName);
    });

    beforeEach(inject(function(_$httpBackend_, $injector) {
        $httpBackend = _$httpBackend_;
        videoServiceInstance = $injector.get(serviceName);
    }));

    it('should fetch video snapshot', function(done) {
        var videoTestData = 'the video';
        $httpBackend.expectGET(baseUrl).respond(200, videoTestData);
        videoServiceInstance.getVideo().then(function(data) {
            assert.equal(data, videoTestData);
            done();
        }, function(err) {
            done(new Error('Unexpected error occurred'));
        });
        $httpBackend.flush();
    });

    it('should handle error on video snapshot fetch', function(done) {
        var videoTestData = 'the video';
        $httpBackend.expectGET(baseUrl).respond(500, videoTestData);
        videoServiceInstance.getVideo().then(function() {
            done(new Error('Should have returned an error'));
        }, function(err) {
            assert(err);
            done();
        });
        $httpBackend.flush();
    });

    it('should pan video in the requested direction', function(done) {
        var testDir = 'up';
        $httpBackend.expectPUT(baseUrl + '/pan', {
            dir: testDir
        }).respond(200);
        videoServiceInstance.pan(testDir).then(function(data) {
            done();
        }, function(err) {
            done(new Error('Unexpected error occurred'));
        });
        $httpBackend.flush();
    });

    it('should handle error on pan video', function(done) {
        var testDir = 'up';
        $httpBackend.expectPUT(baseUrl + '/pan', {
            dir: testDir
        }).respond(500);
        videoServiceInstance.pan(testDir).then(function(data) {
            done(new Error('Should have returned an error'));
        }, function(err) {
            assert(err);
            done();
        });
        $httpBackend.flush();
    });

    it('should set infrared video mode', function(done) {
        var testIr = 'on';
        $httpBackend.expectPUT(baseUrl + '/ir', {
            ir: testIr
        }).respond(200);
        videoServiceInstance.setIR(testIr).then(function() {
            done();
        }, function(err) {
            done(new Error('Unexpected error occurred'));
        });
        $httpBackend.flush();
    });

    it('should handle error when setting infrared mode', function(done) {
        var testIr = 'on';
        $httpBackend.expectPUT(baseUrl + '/ir', {
            ir: testIr
        }).respond(500);
        videoServiceInstance.setIR(testIr).then(function() {
            done(new Error('Should have returned an error'));
        }, function(err) {
            assert(err);
            done();
        });
        $httpBackend.flush();
    });

    it('should make request to return to preset', function(done) {
        var testPreset = 1;
        $httpBackend.expectPUT(baseUrl + '/preset', {
            preset: testPreset
        }).respond(200);
        videoServiceInstance.goToPreset(testPreset).then(function() {
            done();
        }, function(err) {
            done(new Error('Unexpected error occurred'));
        });
        $httpBackend.flush();
    });

    it('should handle error when reqeusting return to preset', function(done) {
        var testPreset = 1;
        $httpBackend.expectPUT(baseUrl + '/preset', {
            preset: testPreset
        }).respond(500);
        videoServiceInstance.goToPreset(testPreset).then(function() {
            done(new Error('Should have returned an error'));
        }, function(err) {
            assert(err);
            done();
        });
        $httpBackend.flush();
    });
});
