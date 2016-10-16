'use strict';

var appName = 'coopApp';
angular.module(appName)
    .directive('coopController', function() {
        return {
            restrict: 'E',
            templateUrl: '/src/views/coop-controller.html'
        };
    });
