'use strict';

var appName = 'coopApp';
angular.module(appName)
.controller(appName + '.coopController', 
	['$scope', '$interval',
	appName + '.coopService', 
	function($scope, $interval, coopService) {
		$scope.openTime = '?';
		$scope.closeTime = '?';
		$scope.doorStates = {
			danger: 'danger',
			ok: 'ok',
			transitioning: 'transitioning',
			error: 'error'
		};
		$scope.doorState = 'unknown';
		$scope.doorHealth = $scope.doorStates.transitioning;
		$scope.uptime = '?';
		$scope.light = '?';
		$scope.nextOpMessage = '';

		var update = function() {
			coopService.getClosingTime(function(err, closeTime) {
				if(err) {
					$scope.closeTime = 'error';
					$scope.doorHealth = $scope.doorStates.ok;
				} else {
					$scope.closeTime = closeTime;	
				}
				coopService.getOpeningTime(function(err, openTime) {
					if(err) {
						$scope.openTime = 'error';
						$scope.doorHealth = $scope.doorStates.error;
					} else {
						$scope.openTime = openTime;	
					}
					coopService.getDoorState(function(err, doorState) {
						if(err) {
							$scope.doorState = 'error';
							$scope.doorHealth = $scope.doorStates.error;
						} else {
							$scope.doorState = doorState;	
							var currentTime = new Date();
							var currentMinutes = currentTime.getHours()*60 + currentTime.getMinutes();
							var closeMinutes = closeTime.hour * 60 + closeTime.minute;
							var openMinutes = openTime.hour * 60 + openTime.minute;
							var deltaHours;
							var deltaMins;

							if(doorState === 'closed') {
								if(currentMinutes <= openMinutes || currentMinutes >= closeMinutes) {
									$scope.doorHealth = $scope.doorStates.ok;
									if(currentTime.getHours() < closeTime.hour) {
										// morning time
										deltaHours = Math.floor((openMinutes - currentMinutes) / 60);
										deltaMins = (openMinutes - currentMinutes) % 60;
									} else {
										// night time
										deltaHours = Math.floor((24*60 - currentMinutes) / 60);
										deltaMins = (24*60 - currentMinutes) % 60;
										deltaHours += Math.floor(openMinutes / 60);
										deltaMins += openMinutes % 60;
									}
									$scope.nextOpMessage = 'Opening in ' + deltaHours + ' hrs and ' + deltaMins + ' mins';
								} else {
									$scope.doorHealth = $scope.doorStates.danger;
								}
							} else if(doorState === 'open') {
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
					});
				});
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

			coopService.getLight(function(err, light) {
				if(err) {
					$scope.light = 'error';
				} else {
					$scope.light = light;	
				}
			});
		};

		$scope.autoDoor = function() {
			coopService.commandDoor('auto', function(err){});
		};

		$scope.closeDoor = function() {
			coopService.commandDoor('close', function(err){});
		};

		$scope.openDoor = function() {
			coopService.commandDoor('open', function(err){});
		};

		$scope.reset = function() {
			coopService.reset(function(err){
				update();
			});
		};

		$interval(update, 5000);
}]);
