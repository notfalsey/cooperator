'use strict';

var assert = require('assert'),
    Promise = require('bluebird'),
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require('supertest'),
    sinon = require('sinon'),
    video = require('../../src/routes/video');

describe('routes/video', () => {
    var baseUri = '/video';
    var app;
    var videoService = {};

    beforeEach(() => {
        // set up for each test
        app = express();
        app.use(bodyParser.json()); // for parsing application/json
        video(app, baseUri, videoService);
    });

    it('put /pan should pan video when requested', () => {
        var testDir = 'up';
        var panStub = sinon.stub();
        panStub.withArgs(testDir).callsArgWith(1, null, 200);
        videoService.pan = panStub;
        return request(app)
            .put(baseUri + '/pan')
            .set('Accept', 'application/json')
            .send({
                dir: testDir
            })
            .expect(200)
            .then((response) => {
                assert(panStub.called);
            });
    });

    it('put /ir should set video ir when requested', () => {
        var testMode = 'on';
        var irStub = sinon.stub();
        irStub.withArgs(testMode).callsArgWith(1, null, 200);
        videoService.setIR = irStub;
        return request(app)
            .put(baseUri + '/ir')
            .set('Accept', 'application/json')
            .send({
                ir: testMode
            })
            .expect(200)
            .then((response) => {
                assert(irStub.called);
            });
    });

    it('put /preset should set video preset when requested', () => {
        var testPreset = 5;
        var presetStub = sinon.stub();
        presetStub.withArgs(testPreset).callsArgWith(1, null, 200);
        videoService.goToPreset = presetStub;
        return request(app)
            .put(baseUri + '/preset')
            .set('Accept', 'application/json')
            .send({
                preset: testPreset
            })
            .expect(200)
            .then((response) => {
                assert(presetStub.called);
            });
    });
});
