var assert = require('assert'),
    nock = require('nock'),
    zlib = require('zlib'),
    VideoService = require('../src/VideoService.js');

describe('VideoService', () => {
    var videoService;
    var config = {
        cameraUser: 'test',
        cameraPassword: 'password',
        cameraIp: '1.2.3.4'
    };
    var url = 'http://' + config.cameraIp;


    beforeEach(() => {
        videoService = new VideoService(config);
    });

    it('should make request to pan up', () => {
        var dir = 'up';

        nock(url)
            .get('/decoder_control.cgi?onestep=1&command=' + 0 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.pan(dir);
    });

    it('should make request to pan down', () => {
        var dir = 'down';

        nock(url)
            .get('/decoder_control.cgi?onestep=1&command=' + 2 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.pan(dir);
    });


    it('should make request to set IR on', () => {
        nock(url)
            .get('/decoder_control.cgi?command=' + 95 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.setIR(true);
    });

    it('should make request to set IR off', () => {
        nock(url)
            .get('/decoder_control.cgi?command=' + 94 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.setIR(false);
    });

    it('should make request to go to preset 1', () => {
        nock(url)
            .get('/decoder_control.cgi?command=' + 31 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.goToPreset(1);
    });

    it('should make request to go to preset 2', () => {
        nock(url)
            .get('/decoder_control.cgi?command=' + 33 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);

        return videoService.goToPreset(2);
    });


    it('should handle video service down', (done) => {
        videoService.goToPreset(2).catch((err) => {
            assert(err);
            done();
        });
    });


    it('should non-success response from video service', (done) => {
        nock(url)
            .get('/decoder_control.cgi?command=' + 33 + '&user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(500);

        videoService.goToPreset(2).catch((err) => {
            assert(err);
            done();
        });
    });


    /*it.only('should get snapshot from video service', (done) => {
        nock(url)
            .get('/snapshot.cgi?user=' + config.cameraUser + '&pwd=' + config.cameraPassword)
            .reply(200);


        var res = {
            status: function(status) {
                this.status = status;
            },
            end: function() {
                done();
            }
        };
        return videoService.get(res);
    });*/

});
