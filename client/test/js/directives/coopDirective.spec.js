describe('coopDirective test', function() {
    var $scope;
    var moduleName = 'coopApp';
    var templateUri = '/src/views/coop-controller.html';
    var templatePath = 'client' + templateUri;
    var dirElement;
    var testDoorStates = {
        ok: 'ok',
        transitioning: 'transitioning',
        danger: 'danger',
        unknown: 'unknown',
        error: 'error'
    };

    beforeEach(module('templates'));
    beforeEach(module(moduleName, function($controllerProvider) {
        $controllerProvider.register('coopController', function($scope) {});
    }));

    beforeEach(inject(function($rootScope, $compile) {
        $scope = $rootScope.$new();
        dirElement = $compile(angular.element('<coop-controller></coop-controller>'))($scope);
    }));

    it('should initialize properly in closed/auto state', function() {
        var testDoorState = 'closed';
        $scope.mode = 'auto';
        $scope.doorState = testDoorState;
        $scope.doorStates = testDoorStates;
        $scope.doorHealth = $scope.doorStates.ok;
        $scope.$digest();

        var divs = dirElement[0].querySelectorAll('.label-success');
        assert.equal(divs.length, 1);
        assert.equal(divs[0].tagName, 'SPAN');
        assert.equal(angular.element(divs[0]).hasClass('ng-hide'), false, 'the door status should be ok');
        assert.equal(divs[0].textContent, testDoorState);

        divs = dirElement[0].querySelectorAll('.label-danger');
        assert.equal(divs.length, 2);
        assert.equal(divs[0].tagName, 'SPAN');
        assert.equal(angular.element(divs[0]).hasClass('ng-hide'), true, 'door status should not have danger style, since things should be normal');
        assert.equal(angular.element(divs[1]).parent().hasClass('ng-hide'), true, 'there should be no alert that the coop is manual mode');
    });

    it('should initialize properly in open/manual state', function() {
        var testDoorState = 'open';
        $scope.mode = 'manual';
        $scope.doorState = testDoorState;
        $scope.doorStates = testDoorStates;
        $scope.doorHealth = $scope.doorStates.ok;
        $scope.$digest();

        var divs = dirElement[0].querySelectorAll('.label-success');
        assert.equal(divs.length, 1);
        assert.equal(divs[0].tagName, 'SPAN');
        assert.equal(angular.element(divs[0]).hasClass('ng-hide'), false, 'the door status should be ok');
        assert.equal(divs[0].textContent, testDoorState);

        divs = dirElement[0].querySelectorAll('.label-danger');
        assert.equal(divs.length, 2);
        assert.equal(divs[0].tagName, 'SPAN');
        assert.equal(angular.element(divs[0]).hasClass('ng-hide'), true, 'door status should not have danger style, since things should be normal');
        assert.equal(angular.element(divs[1]).parent().hasClass('ng-hide'), false, 'there should be no alert that the coop is manual mode');
        assert(divs[1].textContent.indexOf($scope.mode) != -1, 'text should indicate that coop is in manual mode');
    });

    function getElementByClassAndText(doc, classToFind, text) {
        var elems = doc.querySelectorAll(classToFind);
        var ret = null;
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].textContent.indexOf(text) != -1) {
                ret = elems[i];
                break;
            }
        }
        return ret;
    }

    function getOpenButton() {
        return getElementByClassAndText(dirElement[0], '.btn-primary', 'Open');
    }

    function getCloseButton() {
        return getElementByClassAndText(dirElement[0], '.btn-primary', 'Close');
    }

    it('clicking close button should request controller to close', function(done) {
        var testDoorState = 'open';
        $scope.mode = 'auto';
        $scope.doorState = testDoorState;
        $scope.doorStates = testDoorStates;
        $scope.doorHealth = $scope.doorStates.ok;

        $scope.closeDoor = function() {
            done();
        };

        $scope.$digest();

        var closeButton = getCloseButton();
        assert(closeButton !== null, 'should have a close button');
        assert.equal(closeButton.getAttribute('disabled'), null, 'close button should not be disabled, when door is open');

        var openButton = getOpenButton();
        assert(openButton !== null, 'should have an open button');
        assert.equal(openButton.getAttribute('disabled'), 'disabled', 'open button should be disabled, when door is open');

        angular.element(closeButton).triggerHandler('click');

    });

    it('clicking close button should request controller to close', function(done) {
        var testDoorState = 'closed';
        $scope.mode = 'auto';
        $scope.doorState = testDoorState;
        $scope.doorStates = testDoorStates;
        $scope.doorHealth = $scope.doorStates.ok;

        $scope.openDoor = function() {
            done();
        };

        $scope.$digest();

        var closeButton = getCloseButton();
        assert(closeButton !== null, 'should have a close button');
        assert.equal(closeButton.getAttribute('disabled'), 'disabled', 'close button should be disabled, when door is closed');

        var openButton = getOpenButton();
        assert(openButton !== null, 'should have an open button');
        assert.equal(openButton.getAttribute('disabled'), null, 'open button should not be disabled, when door is closed');

        angular.element(openButton).triggerHandler('click');

    });
});
