'use strict';

var appName = 'coopApp';
angular.module(appName)
    .controller('coopController', ['$scope', '$log', '$interval', '$window',
        'coopService', 'videoService',
        function($scope, $log, $interval, $window, coopService, videoService) {
            $scope.openTime = '?';
            $scope.closeTime = '?';
            $scope.doorStates = {
                danger: 'danger',
                ok: 'ok',
                transitioning: 'transitioning',
                error: 'error',
                unknown: 'unknown'
            };
            $scope.doorState = 'unknown';
            $scope.mode = 'unknown';
            $scope.doorHealth = $scope.doorStates.unknown;
            $scope.uptime = '?';
            $scope.nextOpMessage = '';
            $scope.readErrors = '?';
            $scope.writeErrors = '?';
            $scope.autoResets = '?';
            $scope.lastError = '?';
            $scope.lastRead = '?';
            $scope.lastWrite = '?';
            $scope.unhealthy = false;
            $scope.resetActive = false;
            $scope.closeActive = false;
            $scope.openActive = false;
            $scope.Math = $window.Math;

            var computeNextOpMessage = function() {
                if ($scope.openTime !== '?' && $scope.closeTime !== '?' && $scope.doorState !== 'unknown') {
                    var currentTime = new Date();
                    var currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                    var closeMinutes = $scope.closeTime.hour * 60 + $scope.closeTime.minute;
                    var openMinutes = $scope.openTime.hour * 60 + $scope.openTime.minute;
                    var deltaHours;
                    var deltaMins;

                    if ($scope.doorState === 'closed') {
                        if (currentMinutes <= openMinutes || currentMinutes >= closeMinutes) {
                            $scope.doorHealth = $scope.doorStates.ok;
                            if (currentTime.getHours() < $scope.closeTime.hour) {
                                // morning time
                                deltaHours = Math.floor((openMinutes - currentMinutes) / 60);
                                deltaMins = (openMinutes - currentMinutes) % 60;
                            } else {
                                // night time
                                deltaHours = Math.floor((24 * 60 - currentMinutes + openMinutes) / 60);
                                deltaMins = (24 * 60 - currentMinutes + openMinutes) % 60;
                            }
                            $scope.nextOpMessage = 'Opening in ' + deltaHours + ' hrs and ' + deltaMins + ' mins';
                        } else {
                            $scope.doorHealth = $scope.doorStates.danger;
                            $scope.nextOpMessage = 'Door failed to open when scheduled';
                        }
                    } else if ($scope.doorState === 'open') {
                        if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
                            $scope.doorHealth = $scope.doorStates.ok;
                            deltaHours = Math.floor((closeMinutes - currentMinutes) / 60);
                            deltaMins = (closeMinutes - currentMinutes) % 60;

                            $scope.nextOpMessage = 'Closing in ' + deltaHours + ' hrs and ' + deltaMins + ' mins';
                        } else {
                            // this is really bad!! The coop door is open and its past closing
                            // CHICKENS MAY DIE !!!!!!
                            $scope.doorHealth = $scope.doorStates.danger;
                            $scope.nextOpMessage = 'Door failed to close when scheduled!!';
                        }
                    } else {
                        $scope.doorHealth = $scope.doorStates.transitioning;
                        $scope.nextOpMessage = 'Door is transitioning';
                    }
                }
            };

            var update = function() {
                coopService.getClosingTime().then(function(closeTime) {
                    $scope.closeTime = closeTime;
                    computeNextOpMessage();
                }, function(err) {
                    $log.error('Error getting closing time, err: ', err);
                    $scope.closeTime = 'error';
                });

                coopService.getOpeningTime().then(function(openTime) {
                    $scope.openTime = openTime;
                    computeNextOpMessage();
                }, function(err) {
                    $log.error('Error getting opening time, err: ', err);
                    $scope.openTime = 'error';
                });

                coopService.getDoorState().then(function(doorState) {
                    $scope.doorState = doorState;
                    computeNextOpMessage();
                }, function(err) {
                    $log.error('Error getting door state, err: ', err);
                    $scope.doorState = 'error';
                });

                coopService.getUptime().then(function(uptime) {
                    var days = Math.floor(uptime / (24 * 3600 * 1000));
                    var hours = Math.floor((uptime / (3600 * 1000)) % 24);
                    var minutes = Math.floor((uptime / (60 * 1000)) % 60);
                    $scope.uptime = days + ' days, ' + hours + ' hrs, ' + minutes + ' mins';
                }, function(err) {
                    $log.error('Error getting uptime, err: ', err);
                    $scope.uptime = 'error';
                });

                coopService.getMode().then(function(mode) {
                    $scope.mode = mode;
                }, function(err) {
                    $log.error('Error getting mode, err: ', err);
                    $scope.mode = 'error';
                });

                coopService.getHealth().then(function(health) {
                    $scope.health = health;
                }, function(err) {
                    $log.error('Error getting health, err: ' + err);
                    $scope.health = 'error';
                });
            };

            $scope.autoDoor = function() {
                return coopService.commandDoor('auto').then(function() {
                    $log.debug('Door auto command sent successfully.');
                }, function(err) {
                    $log.error('Error commanding door into auto mode, err: ', err);
                });
            };

            $scope.closeDoor = function() {
                $scope.closeActive = true;
                $interval(function() {
                    $scope.closeActive = false;
                }, 20000, 1);
                return coopService.commandDoor('close').then(function() {
                    $log.debug('Door close command sent successfully.');
                }, function(err) {
                    $log.error('Error commanding door ito close, err: ', err);
                });
            };

            $scope.openDoor = function() {
                $scope.openActive = true;
                $interval(function() {
                    $scope.openActive = false;
                }, 20000, 1);
                return coopService.commandDoor('open').then(function() {
                    $log.debug('Door open command sent successfully.');
                }, function(err) {
                    $log.error('Error commanding door ito open, err: ', err);
                });
            };

            $scope.reset = function() {
                $scope.resetActive = true;
                $interval(function() {
                    $scope.resetActive = false;
                }, 20000, 1);
                return coopService.reset().then(function() {
                    update();
                }, function(err) {
                    $log.error('Error resetting coop, err: ', err);
                });
            };

            $scope.panVideo = function(dir) {
                return videoService.pan(dir);
            };

            $scope.goToVideoPreset = function(preset) {
                return videoService.goToPreset(preset);
            };

            $scope.setIR = function(ir) {
                return videoService.setIR(ir);
            };

            var displayTime = function(time) {
                if (time === '?') {
                    return time;
                }
                var d = new Date();
                d.setHours(time.hour);
                d.setMinutes(time.minute);
                d.setSeconds(0);
                return d.toLocaleTimeString($window.navigator.language, {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };

            $scope.displayCloseTime = function() {
                return displayTime($scope.closeTime);
            };

            $scope.displayOpenTime = function() {
                return displayTime($scope.openTime);
            };

            update();
            $interval(update, 5000);
        }
    ]);
