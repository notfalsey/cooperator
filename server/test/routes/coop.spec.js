'use strict';

var assert = require('assert'),
    Promise = require('bluebird'),
    bodyParser = require('body-parser'),
    express = require('express'),
    //request = require('supertest-as-promised'),
    request = require('supertest'),
    sinon = require('sinon'),
    coop = require('../../src/routes/coop');

describe('routes/coop', () => {
    var baseUri = '/coop';
    var app;
    var mockCoopController;

    before(() => {
        // setup for test suite
    });

    beforeEach(() => {
        // set up for each test
        mockCoopController = {};
        app = express();
        app.use(bodyParser.json()); // for parsing application/json
        coop(app, baseUri, mockCoopController);
    });

    afterEach(() => {
        // tear down for each test		
    });

    after(() => {
        // tear down for test suite
    });

    describe('/door', () => {
        function testGet(uri, backendMethod, backendStatus, expectedString) {
            var readDoorStub = sinon.stub();
            readDoorStub.returns(backendStatus);
            mockCoopController[backendMethod] = readDoorStub;

            return request(app)
                .get(baseUri + uri)
                .set('Accept', 'application/json')
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, expectedString);
                    assert(readDoorStub.called);
                });
        }

        it('get /door should return correct door status', () => {
            var expects = [{
                value: 0,
                string: 'open'
            }, {
                value: 1,
                string: 'transitioning'
            }, {
                value: -1,
                string: 'transitioning'
            }, {
                value: 'junk',
                string: 'transitioning'
            }, {
                value: 10,
                string: 'transitioning'
            }, {
                value: 2,
                string: 'closed'
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/door', 'readDoor', expect.value, expect.string);
            });
        });

        it('get /mode should return correct mode status', () => {
            var expects = [{
                value: 0,
                string: 'auto'
            }, {
                value: 1,
                string: 'manual'
            }, {
                value: -1,
                string: 'auto'
            }, {
                value: 'junk',
                string: 'auto'
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/mode', 'readMode', expect.value, expect.string);
            });
        });

        it('get /light should return correct light values', () => {
            var expects = [{
                value: 0,
                expect: 0
            }, {
                value: 100,
                expect: 100
            }, {
                value: 7000,
                expect: 7000
            }, {
                value: -80,
                expect: -80
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/light', 'readLight', expect.value, expect.expect);
            });
        });

        it('get /temp should return correct temp values', () => {
            var expects = [{
                value: 0,
                expect: 0
            }, {
                value: 100,
                expect: 100
            }, {
                value: 7000,
                expect: 7000
            }, {
                value: -80,
                expect: -80
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/temp', 'readTemp', expect.value, expect.expect);
            });
        });

        it('get /uptime should return correct uptime values', () => {
            var currentTime = new Date().getTime();
            var expects = [{
                value: 0,
                expect: 0
            }, {
                value: 1000000,
                expect: 1000000
            }, {
                value: currentTime,
                expect: currentTime
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/uptime', 'readUptime', expect.value, expect.expect);
            });
        });

        it('put /door should open door when requested', () => {
            var openDoorStub = sinon.stub();
            openDoorStub.callsArg(0);
            mockCoopController.openDoor = openDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'open'
                })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Door is opening');
                });
        });

        it('put /door should return 500 when open door fails', () => {
            var openDoorStub = sinon.stub();
            openDoorStub.callsArgWith(0, new Error('failed to open'));
            mockCoopController.openDoor = openDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'open'
                })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Error opening door');
                });
        });

        it('put /door should return 422 when invalid direction is sent', () => {
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'invalid'
                })
                .expect(422)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Invalid door direction');
                });
        });

        it('put /door should close door when requested', () => {
            var closeDoorStub = sinon.stub();
            closeDoorStub.callsArg(0);
            mockCoopController.closeDoor = closeDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'close'
                })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Door is closing');
                });
        });

        it('put /door should return 500 when close door fails', () => {
            var closeDoorStub = sinon.stub();
            closeDoorStub.callsArgWith(0, new Error('failed to close'));
            mockCoopController.closeDoor = closeDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'close'
                })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Error closing door');
                });
        });

        it('put /door should put door into auto mode when requested', () => {
            var autoDoorStub = sinon.stub();
            autoDoorStub.callsArg(0);
            mockCoopController.autoDoor = autoDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'auto'
                })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Door is in auto mode');
                });
        });

        it('put /door should return 500 when set auto mode fails', () => {
            var autoDoorStub = sinon.stub();
            autoDoorStub.callsArgWith(0, new Error('failed to set auto mode'));
            mockCoopController.autoDoor = autoDoorStub;
            return request(app)
                .put(baseUri + '/door')
                .set('Accept', 'application/json')
                .send({
                    dir: 'auto'
                })
                .expect(500)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.equal(response.body, 'Error setting door to auto mode');
                });
        });
    });
});
