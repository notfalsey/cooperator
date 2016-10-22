var assert = require('assert'),
    nock = require('nock'),
    sinon = require('sinon'),
    WeatherService = require('../src/WeatherService.js');

describe('WeatherService', () => {

    beforeEach(() => {
        this.clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        this.clock = sinon.restore();
    });

    it('should refresh on configured period', () => {
        var config = {
            wundergroundApiKey: 'testkey',
            state: 'NC',
            city: 'Carrboro',
            astronomyUpdatePeriod: 1
        };
        var refreshSpy = sinon.spy(WeatherService.prototype, 'refresh');
        var getDataSpy = sinon.spy(WeatherService.prototype, 'getData');
        var weatherService = new WeatherService(config);

        this.clock.tick(2);
        // once immediately, and once per clock tick after that since the refresh 
        // perios was configured to be one ms (clock tick) 
        assert(refreshSpy.callCount, 3);
        assert(getDataSpy.callCount, 3);
    });

    it('should make reqeusts for the configured location', () => {
        var config = {
            wundergroundApiKey: 'testkey',
            state: 'NC',
            city: 'Carrboro'
        };
        var testSunset = {
            hour: 20,
            minute: 15
        };
        var testSunrise = {
            hour: 6,
            minute: 7
        };
        var baseUrl = 'http://api.wunderground.com';
        var uri = '/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
        var url = baseUrl + uri;
        nock(baseUrl)
            .get(uri)
            .times(2)
            .reply(200, {
                sun_phase: {
                    sunset: testSunset,
                    sunrise: testSunrise
                }
            });

        var weatherService = new WeatherService(config);

        return weatherService.refresh().then(() => {
            assert.deepEqual(weatherService.getSunrise(), testSunrise);
            assert.deepEqual(weatherService.getSunset(), testSunset);
        });
    });

    it('should handle error on bad response status for wunderground request', () => {
        var config = {
            wundergroundApiKey: 'testkey',
            state: 'NC',
            city: 'Carrboro'
        };
        var baseUrl = 'http://api.wunderground.com';
        var uri = '/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
        var url = baseUrl + uri;
        nock(baseUrl)
            .get(uri)
            .times(2)
            .reply(500);

        var weatherService = new WeatherService(config);

        return weatherService.refresh().then(() => {
            // one error for the reqeust on construction and one for the 
            // manual refresh request
            assert.equal(weatherService.getErrorCount(), 2);
        });
    });

    it('should handle error on no data for wunderground request', () => {
        var config = {
            wundergroundApiKey: 'testkey',
            state: 'NC',
            city: 'Carrboro'
        };
        var baseUrl = 'http://api.wunderground.com';
        var uri = '/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
        var url = baseUrl + uri;
        nock(baseUrl)
            .get(uri)
            .times(2)
            .reply(200);

        var weatherService = new WeatherService(config);

        return weatherService.refresh().then(() => {
            // one error for the reqeust on construction and one for the 
            // manual refresh request
            assert.equal(weatherService.getErrorCount(), 2);
        });
    });


    it('should handle error on invalid url for wunderground request', () => {
        var config = {
            wundergroundApiKey: 'invalid : test : key',
            state: 'NC',
            city: 'Carrboro'
        };
        var baseUrl = 'http://api.wunderground.com';
        var uri = '/api/' + config.wundergroundApiKey + '/astronomy/q/' + config.state + '/' + config.city + '.json';
        var url = baseUrl + uri;
        nock(baseUrl)
            .get(uri)
            .times(2)
            .reply(200);

        var weatherService = new WeatherService(config);

        return weatherService.refresh().then(() => {
            // one error for the reqeust on construction and one for the 
            // manual refresh request
            assert.equal(weatherService.getErrorCount(), 2);
        });
    });
});
