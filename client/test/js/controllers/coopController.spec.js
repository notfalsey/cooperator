describe('coopController test', function() {
    var coopController, coopService, videoService, $scope, $injector, $q, $rootScope;
    var moduleName = 'coopApp';
    var coopServiceName = 'coopService';
    var ctrlName = 'coopController';

    beforeEach(function() {
        module(moduleName);
    });

    beforeEach(inject(function($controller, _$q_, _$injector_, _$rootScope_, _coopService_, _videoService_) {
        coopService = _coopService_;
        videoService = _videoService_;
        $injector = _$injector_;
        $q = _$q_;
        $rootScope = _$rootScope_;
        sinon.stub(coopService, 'getClosingTime', function() {
            return $q.when(new Date().getTime());
        });
        sinon.stub(coopService, 'getOpeningTime', function() {
            return $q.when(new Date().getTime());
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
        assert.deepEqual($scope.doorStates, {
            danger: 'danger',
            ok: 'ok',
            transitioning: 'transitioning',
            error: 'error',
            unknown: 'unknown'
        });
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
        $scope.autoDoor().then(function() {
            done();
        });
        $rootScope.$digest();
    });
});
