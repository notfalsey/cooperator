'use strict';

var assert = require('assert'),
    Promise = require('bluebird'),
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require('supertest'),
    sinon = require('sinon-as-promised')(Promise),
    coop = require('../../src/routes/coop');

describe('routes/coop', function() {
    this.timeout(0);
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

    function testGet(uri, backendMethod, backendStatus, expected) {
        var methodStub = sinon.stub();
        methodStub.returns(backendStatus);
        mockCoopController[backendMethod] = methodStub;

        return request(app)
            .get(baseUri + uri)
            .set('Accept', 'application/json')
            .expect(200)
            .expect('Content-Type', /json/)
            .then((response) => {
                assert.deepEqual(response.body, expected);
                assert(methodStub.called);
            });
    }

    describe('/door', () => {
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

        it('put /door should open door when requested', () => {
            var openDoorStub = sinon.stub();
            openDoorStub.resolves();
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
                    assert(openDoorStub.called);
                });
        });

        it('put /door should return 500 when open door fails', () => {
            var openDoorStub = sinon.stub();
            openDoorStub.rejects(new Error('failed to open'));
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
                    assert(openDoorStub.called);
                });
        });

        it('put /door should return 422 when invalid direction is sent', function() {
            this.timeout(0);
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
            closeDoorStub.resolves();
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
                    assert(closeDoorStub.called);
                });
        });

        it('put /door should return 500 when close door fails', () => {
            var closeDoorStub = sinon.stub();
            closeDoorStub.rejects(new Error('failed to close'));
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
                    assert(closeDoorStub.called);
                });
        });

        it('put /door should put door into auto mode when requested', () => {
            var autoDoorStub = sinon.stub();
            autoDoorStub.resolves();
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
                    assert(autoDoorStub.called);
                });
        });

        it('put /door should return 500 when set auto mode fails', () => {
            var autoDoorStub = sinon.stub();
            autoDoorStub.rejects(new Error('failed to set auto mode'));
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
                    assert(autoDoorStub.called);
                });
        });
    });

    describe('/reset', () => {
        it('put /reset should send reset command to coop', () => {
            var resetStub = sinon.stub();
            resetStub.resolves();
            mockCoopController.reset = resetStub;
            return request(app)
                .put(baseUri + '/reset')
                .set('Accept', 'application/json')
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert(resetStub.called);
                });
        });

        it('put /reset should handle error', () => {
            var resetStub = sinon.stub();
            resetStub.rejects(new Error('failed'));
            mockCoopController.reset = resetStub;
            return request(app)
                .put(baseUri + '/reset')
                .set('Accept', 'application/json')
                .expect(500)
                .then((response) => {
                    assert(resetStub.called);
                });
        });
    });

    describe('/mode', () => {
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
    });

    describe('/light', () => {
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
    });

    describe('/temp', () => {
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
    });

    describe('/uptime', () => {
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
    });

    describe('/closetime', () => {
        it('get /closetime should return correct closetime values', () => {
            var currentTime = new Date().getTime();
            var expects = [{
                value: 0,
                expect: {
                    hour: 0,
                    minute: 0
                }
            }, {
                value: 18 * 60 + 30,
                expect: {
                    hour: 18,
                    minute: 30
                }
            }, {
                value: 23 * 60 + 3,
                expect: {
                    hour: 23,
                    minute: 3
                }
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/closetime', 'getClosingTime', expect.value, expect.expect);
            });
        });
    });

    describe('/opentime', () => {
        it('get /opentime should return correct opentime values', () => {
            var currentTime = new Date().getTime();
            var expects = [{
                value: 0,
                expect: {
                    hour: 0,
                    minute: 0
                }
            }, {
                value: 6 * 60 + 30,
                expect: {
                    hour: 6,
                    minute: 30
                }
            }, {
                value: 5 * 60 + 3,
                expect: {
                    hour: 5,
                    minute: 3
                }
            }];

            return Promise.mapSeries(expects, (expect) => {
                return testGet('/opentime', 'getOpeningTime', expect.value, expect.expect);
            });
        });
    });

    describe('/health', () => {
        it('get /health should return correct health values', () => {
            var testValue = 123;
            var valueStub = sinon.stub();
            valueStub.returns(123);
            mockCoopController.getReadErrorCount = valueStub;
            mockCoopController.getWriteErrorCount = valueStub;
            mockCoopController.getAutoResetCount = valueStub;
            var testTime = new Date();
            var timeStub = sinon.stub();
            timeStub.returns(testTime);
            mockCoopController.getLastError = timeStub;
            mockCoopController.getLastSuccessfulRead = timeStub;
            mockCoopController.getLastSuccessfulWrite = timeStub;
            mockCoopController.getLongestUptime = timeStub;

            var expectedResponse = {
                readErrors: testValue,
                writeErrors: testValue,
                autoResets: testValue,
                lastError: testTime.toString(),
                lastRead: testTime.toString(),
                lastWrite: testTime.toString(),
                longestUptime: testTime.toString()
            };

            return request(app)
                .get(baseUri + '/health')
                .set('Accept', 'application/json')
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    assert.deepEqual(response.body, expectedResponse);
                    assert.equal(valueStub.callCount, 3);
                    assert.equal(timeStub.callCount, 4);
                });
        });
    });
});
