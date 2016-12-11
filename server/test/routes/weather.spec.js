'use strict';

var assert = require('assert'),
    Promise = require('bluebird'),
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require('supertest'),
    sinon = require('sinon'),
    suncalc = require('suncalc'),
    weather = require('../../src/routes/weather');

describe('routes/weather', () => {
    var baseUri = '/weather';
    var app;
    var weatherService = {};
    var latitude = 35.910144;
    var longitude = -79.075289;

    beforeEach(() => {
        // set up for each test
        app = express();
        app.use(bodyParser.json()); // for parsing application/json
        weather(app, baseUri, latitude, longitude);
    });

    it('should get sunset successfully', () => {
        var times = suncalc.getTimes(new Date(), latitude, longitude);
        var testSunset = {
            hour: times.dusk.getHours(),
            minute: times.dusk.getMinutes()
        };
        return request(app)
            .get(baseUri + '/sunset')
            .set('Accept', 'application/json')
            .expect(200)
            .then((response) => {
                assert.deepEqual(response.body, testSunset);
            });
    });

    it('should get sunrise successfully', () => {
        var times = suncalc.getTimes(new Date(), latitude, longitude);
        var testSunrise = {
            hour: times.sunrise.getHours(),
            minute: times.sunrise.getMinutes()
        };
        return request(app)
            .get(baseUri + '/sunrise')
            .set('Accept', 'application/json')
            .expect(200)
            .then((response) => {
                assert.deepEqual(response.body, testSunrise);
            });
    });
});
