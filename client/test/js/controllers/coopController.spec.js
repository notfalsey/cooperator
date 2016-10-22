describe('coopController test', function() {
    var coopController, coopService, videoService, $scope, $injector, $q, $rootScope, $interval;
    var moduleName = 'coopApp';
    var coopServiceName = 'coopService';
    var ctrlName = 'coopController';


    var testDoorStates = {
        danger: 'danger',
        ok: 'ok',
        transitioning: 'transitioning',
        error: 'error',
        unknown: 'unknown'
    };

    beforeEach(function() {
        module(moduleName);
    });

    beforeEach(inject(function($controller, _$q_, _$injector_, _$rootScope_, _$interval_, _coopService_, _videoService_) {
        coopService = _coopService_;
        videoService = _videoService_;
        $injector = _$injector_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        $interval = _$interval_;
        sinon.stub(coopService, 'getClosingTime', function() {
            return $q.when({
                hour: 18,
                minute: 4
            });
        });
        sinon.stub(coopService, 'getOpeningTime', function() {
            return $q.when({
                hour: 5,
                minute: 43
            });
        });
        sinon.stub(coopService, 'getDoorState', function() {
            return $q.when('closed');
        });
        sinon.stub(coopService, 'getUptime', function() {
            return $q.when(0);
        });
        sinon.stub(coopService, 'getMode', function() {
            return $q.when('auto');
        });
        sinon.stub(coopService, 'getHealth', function() {
            return $q.when({
                readErrors: 0
            });
        });

        $scope = {};
        coopController = $controller(ctrlName, {
            $scope: $scope
        });
    }));

    it('should properly initialize', function() {
        assert.equal($scope.openTime, '?');
        assert.equal($scope.closeTime, '?');
        assert.deepEqual($scope.doorStates, testDoorStates);
        assert.equal($scope.doorState, 'unknown');
        assert.equal($scope.mode, 'unknown');
        assert.equal($scope.doorHealth, $scope.doorStates.unknown);
        assert.equal($scope.uptime, '?');
        assert.equal($scope.nextOpMessage, '');
        assert.equal($scope.readErrors, '?');
        assert.equal($scope.writeErrors, '?');
        assert.equal($scope.autoResets, '?');
        assert.equal($scope.lastError, '?');
        assert.equal($scope.lastRead, '?');
        assert.equal($scope.lastWrite, '?');
        assert.equal($scope.unhealthy, false);
        assert.equal($scope.resetActive, false);
        assert.equal($scope.closeActive, false);
        assert.equal($scope.openActive, false);
        $rootScope.$digest();
    });

    it('should set door in auto mode', function(done) {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'auto');
            return $q.when('');
        });
        $scope.autoDoor().then(done);
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should handle error when setting door in auto mode', function(done) {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'auto');
            return $q.reject('Error setting door in auto mode');
        });
        $scope.autoDoor().then(done);
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should close door', function() {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'close');
            return $q.when('');
        });

        assert.equal($scope.closeActive, false, 'close should not be active before requesting it');
        $scope.closeDoor();
        // must call digest to flush $q promises
        $rootScope.$digest();
        assert.equal($scope.closeActive, true, 'close should be active while it is closing');

        // now flush interval to expire the 20 sec update after close
        $interval.flush(25000);
        assert.equal($scope.closeActive, false, 'close should not be active after it is finished');
    });

    it('should handle error on close door', function(done) {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'close');
            return $q.reject('Error closing door');
        });
        $scope.closeDoor().then(function() {
            done();
        });
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should open door', function() {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'open');
            return $q.when('');
        });

        assert.equal($scope.openActive, false, 'open should not be active before requesting it');
        $scope.openDoor();
        // must call digest to flush $q promises
        $rootScope.$digest();
        assert.equal($scope.openActive, true, 'open should be active while it is opening');

        // now flush interval to expire the 20 sec update after close
        $interval.flush(25000);
        assert.equal($scope.openActive, false, 'open should not be active after it is finished');
    });

    it('should handle error on open door', function(done) {
        sinon.stub(coopService, 'commandDoor', function(command) {
            assert.equal(command, 'open');
            return $q.reject('Error opening door');
        });
        $scope.openDoor().then(function() {
            done();
        });
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should reset coop', function() {
        sinon.stub(coopService, 'reset', function() {
            return $q.when('');
        });

        assert.equal($scope.resetActive, false, 'reset should not be active before requesting it');
        $scope.reset();
        // must call digest to flush $q promises
        $rootScope.$digest();
        assert.equal($scope.resetActive, true, 'reset should be active while it is closing');

        // now flush interval to expire the 20 sec update after close
        $interval.flush(25000);
        assert.equal($scope.resetActive, false, 'reset should not be active after it is finished');
    });

    it('should handle error on reset coop', function(done) {
        sinon.stub(coopService, 'reset', function() {
            return $q.reject('Reset error');
        });
        $scope.reset().then(function() {
            done();
        });
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should pan video', function(done) {
        var testDir = 'up';
        sinon.stub(videoService, 'pan', function(dir) {
            assert.equal(dir, testDir);
            return $q.when('');
        });
        $scope.panVideo(testDir).then(done);
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should request video preset', function(done) {
        var testPreset = 2;
        sinon.stub(videoService, 'goToPreset', function(preset) {
            assert.equal(preset, testPreset);
            return $q.when('');
        });
        $scope.goToVideoPreset(testPreset).then(done);
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should request video IR set', function(done) {
        var testIR = 'on';
        sinon.stub(videoService, 'setIR', function(ir) {
            assert.equal(ir, testIR);
            return $q.when('');
        });
        $scope.setIR(testIR).then(done);
        // must call digest to flush $q promises
        $rootScope.$digest();
    });

    it('should return display open time', function() {
        var testHours = 9;
        var testMins = 12;
        $scope.openTime = {
            hour: testHours,
            minute: testMins
        };
        var displayTime = $scope.displayOpenTime();
        var parts = displayTime.split(':');
        assert.equal(parts[0], testHours, 'should display hours correctly');
        assert.equal(parts[1], testMins, 'should display minutes correctly');

        $scope.openTime = '?';
        assert.equal($scope.displayOpenTime(), $scope.openTime, 'should pass through uninitialized time value');
    });

    it('should return display close time', function() {
        var testHours = 5;
        var testMins = 23;
        $scope.closeTime = {
            hour: testHours,
            minute: testMins
        };
        var displayTime = $scope.displayCloseTime();
        var parts = displayTime.split(':');
        assert.equal(parts[0], testHours, 'should display hours correctly');
        assert.equal(parts[1], testMins, 'should display minutes correctly');

        $scope.closeTime = '?';
        assert.equal($scope.displayCloseTime(), $scope.closeTime, 'should pass through uninitialized time value');
    });

    it('should initialize handle errors on update', function() {
        // change all stub functions called by update to return an error
        coopService.getClosingTime.restore();
        sinon.stub(coopService, 'getClosingTime', function() {
            return $q.reject('Error');
        });
        coopService.getOpeningTime.restore();
        sinon.stub(coopService, 'getOpeningTime', function() {
            return $q.reject('Error');
        });
        coopService.getDoorState.restore();
        sinon.stub(coopService, 'getDoorState', function() {
            return $q.reject('Error');
        });
        coopService.getUptime.restore();
        sinon.stub(coopService, 'getUptime', function() {
            return $q.reject('Error');
        });
        coopService.getMode.restore();
        sinon.stub(coopService, 'getMode', function() {
            return $q.reject('Error');
        });
        coopService.getHealth.restore();
        sinon.stub(coopService, 'getHealth', function() {
            return $q.reject('Error');
        });

        $interval.flush(6000);

        assert.equal($scope.closeTime, 'error');
        assert.equal($scope.openTime, 'error');
        assert.equal($scope.doorState, 'error');
        assert.equal($scope.uptime, 'error');
        assert.equal($scope.mode, 'error');
        assert.equal($scope.health, 'error');
    });

    function testNextOpMessage(currentState, openTime, closeTime, now, expectedMsg, expectedHealth) {
        coopService.getClosingTime.restore();
        sinon.stub(coopService, 'getClosingTime', function() {
            return $q.when(closeTime);
        });
        coopService.getOpeningTime.restore();
        sinon.stub(coopService, 'getOpeningTime', function() {
            return $q.when(openTime);
        });
        coopService.getDoorState.restore();
        sinon.stub(coopService, 'getDoorState', function() {
            return $q.when(currentState);
        });
        var nowTime = new Date();
        nowTime.setHours(now.hour);
        nowTime.setMinutes(now.minute);
        sinon.useFakeTimers(nowTime.getTime());

        $rootScope.$digest();
        $interval.flush(6000);
        assert.equal($scope.nextOpMessage, expectedMsg);
        assert.equal($scope.doorHealth, expectedHealth);
    }

    it('should correctly compute next op message when closed at night after scheduled closing time', function() {
        var closeTime = {
            hour: 20,
            minute: 30
        };

        var openTime = {
            hour: 6,
            minute: 15
        };

        var currentTime = {
            hour: 21,
            minute: 0
        };

        testNextOpMessage('closed', openTime, closeTime, currentTime, 'Opening in 9 hrs and 15 mins', testDoorStates.ok);
    });

    it('should correctly compute next op message when closed in morning after scheduled closing time', function() {
        var closeTime = {
            hour: 20,
            minute: 30
        };

        var openTime = {
            hour: 6,
            minute: 15
        };

        var currentTime = {
            hour: 1,
            minute: 10
        };

        testNextOpMessage('closed', openTime, closeTime, currentTime, 'Opening in 5 hrs and 5 mins', testDoorStates.ok);
    });

    it('should correctly compute next op message when open after scheduled opening time', function() {
        var closeTime = {
            hour: 20,
            minute: 30
        };

        var openTime = {
            hour: 6,
            minute: 15
        };

        var currentTime = {
            hour: 7,
            minute: 20
        };

        testNextOpMessage('open', openTime, closeTime, currentTime, 'Closing in 13 hrs and 10 mins', testDoorStates.ok);
    });


    it('should indicate danger if door is still open after the scheduled closing time', function() {
        var closeTime = {
            hour: 20,
            minute: 30
        };

        var openTime = {
            hour: 6,
            minute: 15
        };

        var currentTime = {
            hour: 20,
            minute: 50
        };

        testNextOpMessage('open', openTime, closeTime, currentTime, 'Door failed to close when scheduled!!', testDoorStates.danger);
    });

    it('should indicate transioning state in health and report last op message when transitioning', function() {
        var closeTime = {
            hour: 20,
            minute: 30
        };

        var openTime = {
            hour: 6,
            minute: 15
        };

        var currentTime = {
            hour: 20,
            minute: 30
        };

        testNextOpMessage('transitioning', {}, {}, currentTime, 'Door is transitioning', testDoorStates.transitioning);
    });



});
