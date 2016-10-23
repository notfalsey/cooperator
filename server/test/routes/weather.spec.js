'use strict';

var assert = require('assert'),
    Promise = require('bluebird'),
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require('supertest'),
    sinon = require('sinon'),
    weather = require('../../src/routes/weather');

describe('routes/weather', () => {
    var baseUri = '/weather';
    var app;
    var weatherService = {};

    beforeEach(() => {
        // set up for each test
        app = express();
        app.use(bodyParser.json()); // for parsing application/json
        weather(app, baseUri, weatherService);
    });

    it('should get sunset successfully', () => {
        var testSunset = {
            hour: 18,
            minute: 30
        };
        var sunsetStub = sinon.stub();
        sunsetStub.returns(testSunset);
        weatherService.getSunset = sunsetStub;
        return request(app)
            .get(baseUri + '/sunset')
            .set('Accept', 'application/json')
            .expect(200)
            .then((response) => {
                assert(sunsetStub.called);
                assert.deepEqual(response.body, testSunset);
            });
    });

    it('should get sunrise successfully', () => {
        var testSunrise = {
            hour: 18,
            minute: 30
        };
        var sunriseStub = sinon.stub();
        sunriseStub.returns(testSunrise);
        weatherService.getSunrise = sunriseStub;
        return request(app)
            .get(baseUri + '/sunrise')
            .set('Accept', 'application/json')
            .expect(200)
            .then((response) => {
                assert(sunriseStub.called);
                assert.deepEqual(response.body, testSunrise);
            });
    });

    it('should get error count successfully', () => {
        var testCount = 5;
        var errStub = sinon.stub();
        errStub.returns(testCount);
        weatherService.getErrorCount = errStub;
        return request(app)
            .get(baseUri + '/errors')
            .set('Accept', 'application/json')
            .expect(200)
            .then((response) => {
                assert(errStub.called);
                assert.equal(response.body, testCount);
            });
    });
});
