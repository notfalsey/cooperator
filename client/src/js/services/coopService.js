'use strict';

var appName = 'coopApp';
angular.module(appName)
    .factory('coopService', ['$http', '$log', '$interval', '$location', function($http, $log, $interval, $location) {

        var baseUrl = '/coop';

        var commandDoor = function(dir) {
            return $http.put(baseUrl + '/door', {
                dir: dir
            }).then(function(response) {
                return response.data;
            });
        };

        var reset = function(callback) {
            return $http.put(baseUrl + '/reset', {}).then(function(response) {
                return response.data;
            });
        };

        var getCoopData = function(valueName) {
            return $http.get(baseUrl + '/' + valueName).then(function(response) {
                return response.data;
            });
        };

        var getDoorState = function() {
            return getCoopData('door');
        };

        var getUptime = function() {
            return getCoopData('uptime');
        };

        var getLight = function() {
            return getCoopData('light');
        };

        var getTemp = function() {
            return getCoopData('temp');
        };

        var getClosingTime = function() {
            return getCoopData('closetime');
        };

        var getOpeningTime = function() {
            return getCoopData('opentime');
        };

        var getHealth = function() {
            return getCoopData('health');
        };

        var getMode = function() {
            return getCoopData('mode');
        };

        return {
            commandDoor: commandDoor,
            getClosingTime: getClosingTime,
            getDoorState: getDoorState,
            getHealth: getHealth,
            getLight: getLight,
            getMode: getMode,
            getOpeningTime: getOpeningTime,
            getTemp: getTemp,
            getUptime: getUptime,
            reset: reset
        };
    }]);
