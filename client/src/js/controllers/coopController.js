'use strict';

var appName = 'coopApp';
angular.module(appName)
.controller(appName + '.coopController', 
	['$scope', '$log', '$interval', '$window',
	appName + '.coopService', appName + '.videoService', 
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

		var computeNextOpMessage = function() {
			if($scope.openTime !== '?' && $scope.closeTime !== '?' && $scope.doorState !== 'unknown') {
				var currentTime = new Date();
				var currentMinutes = currentTime.getHours()*60 + currentTime.getMinutes();
				var closeMinutes = $scope.closeTime.hour * 60 + $scope.closeTime.minute;
				var openMinutes = $scope.openTime.hour * 60 + $scope.openTime.minute;
				var deltaHours;
				var deltaMins;

				if($scope.doorState === 'closed') {
					if(currentMinutes <= openMinutes || currentMinutes >= closeMinutes) {
						$scope.doorHealth = $scope.doorStates.ok;
						if(currentTime.getHours() < $scope.closeTime.hour) {
							// morning time
							deltaHours = Math.floor((openMinutes - currentMinutes) / 60);
							deltaMins = (openMinutes - currentMinutes) % 60;
						} else {
							// night time
							deltaHours = Math.floor((24*60 - currentMinutes + openMinutes) / 60);
							deltaMins = (24*60 - currentMinutes + openMinutes) % 60;
						}
						$scope.nextOpMessage = 'Opening in ' + deltaHours + ' hrs and ' + deltaMins + ' mins';
					} else {
						$scope.doorHealth = $scope.doorStates.danger;
					}
				} else if($scope.doorState === 'open') {
					if(currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
						$scope.doorHealth = $scope.doorStates.ok;
					} else {
						$scope.doorHealth = $scope.doorStates.danger;
					}
					deltaHours = Math.floor((closeMinutes - currentMinutes) / 60);
					deltaMins = (closeMinutes - currentMinutes) % 60;

					$scope.nextOpMessage = 'Closing in ' + deltaHours + ' hrs and ' + deltaMins + ' mins';
				} else {
					$scope.doorHealth = $scope.doorStates.transitioning;
				}
			}
		};

		var update = function() {
			coopService.getClosingTime(function(err, closeTime) {
				if(err) {
					$scope.closeTime = 'error';
				} else {
					$scope.closeTime = closeTime;	
					computeNextOpMessage();
				}
			});

			coopService.getOpeningTime(function(err, openTime) {
				if(err) {
					$scope.openTime = 'error';
				} else {
					$scope.openTime = openTime;	
					computeNextOpMessage();
				}
			});

			coopService.getDoorState(function(err, doorState) {
				if(err) {
					$scope.doorState = 'error';
				} else {
					$scope.doorState = doorState;	
					computeNextOpMessage();
				}
			});

			coopService.getUptime(function(err, uptime) {
				if(err) {
					$scope.uptime = 'error';
				} else {
					var days = Math.floor(uptime / (24 * 3600 * 1000));
					var hours = Math.floor((uptime / (3600 * 1000)) % 24);
					var minutes = Math.floor((uptime / (60 * 1000)) % 60);
					$scope.uptime = days + ' days, ' + hours + ' hrs, ' + minutes + ' mins';	
				}
			});

			coopService.getMode(function(err, mode) {
				if(err) {
					$scope.mode = 'error';
				} else {
					$scope.mode = mode;	
				}
			});
		};

		$scope.autoDoor = function() {
			coopService.commandDoor('auto', function(err){});
		};

		$scope.closeDoor = function() {
			$scope.closeActive = true;
			setTimeout(function() {
				$scope.closeActive = false;
			}, 20000);
			coopService.commandDoor('close', function(err){});
		};

		$scope.openDoor = function() {
			$scope.openActive = true;
			setTimeout(function() {
				$scope.openActive = false;
			}, 20000);
			coopService.commandDoor('open', function(err){});
		};

		$scope.reset = function() {
			$scope.resetActive = true;
			setTimeout(function() {
				$scope.resetActive = false;
			}, 20000);
			coopService.reset(function(err){
				update();
			});
		};

		$scope.panVideo = function(dir) {
			videoService.pan(dir);
		};

		$scope.goToVideoPreset = function(preset) {
			videoService.goToPreset(preset);
		};

		$scope.setIR = function(ir) {
			videoService.setIR(ir);
		};

		var getHealth = function() {
			coopService.getHealth(function(err, health) {
				if(!err) {
					$scope.health = health;
				} else {
					$log.error('Error getting health');
				}
			});
		};

		var displayTime = function(time) {
			if(time === '?') {
				return time;
			}
			var d = new Date();
			d.setHours(time.hour);
			d.setMinutes(time.minute);
			d.setSeconds(0);
			return d.toLocaleTimeString($window.navigator.language, {hour: '2-digit', minute:'2-digit'});
		};

		$scope.displayCloseTime = function() {
			return displayTime($scope.closeTime);
		};

		$scope.displayOpenTime = function() {
			return displayTime($scope.openTime);
		};

		update();
		$interval(update, 5000);

		getHealth();
}]);
