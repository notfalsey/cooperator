'use strict';

var appName = 'coopApp';
angular.module(appName)
    .factory('videoService', ['$http', function($http, $log, $interval, $location) {

        var baseUrl = '/video';

        var getVideo = function(callback) {
            return $http.get(baseUrl).then(function(response) {
                return response.data;
            });
        };

        var pan = function(dir, callback) {
            return $http.put(baseUrl + '/pan', {
                dir: dir
            });
        };

        var setIR = function(ir, callback) {
            return $http.put(baseUrl + '/ir', {
                ir: ir
            });
        };

        var goToPreset = function(preset, callback) {
            return $http.put(baseUrl + '/preset', {
                preset: preset
            });
        };

        return {
            getVideo: getVideo,
            goToPreset: goToPreset,
            pan: pan,
            setIR: setIR
        };
    }]);
