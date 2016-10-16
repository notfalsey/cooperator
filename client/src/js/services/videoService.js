'use strict';

var appName = 'coopApp';
angular.module(appName)
    .factory(appName + '.videoService', ['$http', '$log', '$interval', '$location', function($http, $log, $interval, $location) {

        var baseUrl = '/video';

        var getVideo = function(callback) {
            $http.get(baseUrl)
                .success(function(data, status, headers, config) {
                    if (callback) {
                        callback(null, data);
                    }
                })
                .error(function(data, status, headers, config) {
                    $log.error('Error getting video: ' + status + ': ' + data);
                    if (callback) {
                        callback(new Error(data));
                    }
                });
        };

        var pan = function(dir, callback) {
            $http.put(baseUrl + '/pan', {
                    dir: dir
                })
                .success(function(data, status, headers, config) {
                    if (callback) {
                        callback(null, data);
                    }
                })
                .error(function(data, status, headers, config) {
                    $log.error('Error getting video: ' + status + ': ' + data);
                    if (callback) {
                        callback(new Error(data));
                    }
                });
        };

        var setIR = function(ir, callback) {
            $http.put(baseUrl + '/ir', {
                    ir: ir
                })
                .success(function(data, status, headers, config) {
                    if (callback) {
                        callback(null, data);
                    }
                })
                .error(function(data, status, headers, config) {
                    $log.error('Error getting video: ' + status + ': ' + data);
                    if (callback) {
                        callback(new Error(data));
                    }
                });
        };

        var goToPreset = function(preset, callback) {
            $http.put(baseUrl + '/preset', {
                    preset: preset
                })
                .success(function(data, status, headers, config) {
                    if (callback) {
                        callback(null, data);
                    }
                })
                .error(function(data, status, headers, config) {
                    $log.error('Error getting video: ' + status + ': ' + data);
                    if (callback) {
                        callback(new Error(data));
                    }
                });
        };

        return {
            getVideo: getVideo,
            goToPreset: goToPreset,
            pan: pan,
            setIR: setIR
        };
    }]);
