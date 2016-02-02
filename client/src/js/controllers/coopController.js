'use strict';

var appName = 'coopApp';
angular.module(appName)
.controller(appName + '.coopController', 
	['$scope', '$interval',
	appName + '.coopService', 
	function($scope, $interval, coopService) {
		$scope.openTime = '?';
		$scope.closeTime = '?';
		$scope.doorState = '?';
		$scope.doorStateOk = null;
		$scope.uptime = '?';
		$scope.light = '?';
		$scope.nextOpMessage = '';

		var update = function() {
			coopService.getClosingTime(function(err, closeTime) {
				if(err) {
					$scope.closeTime = 'error';
					$scope.doorStateOk = false;
				} else {
					$scope.closeTime = closeTime;	
				}
				coopService.getOpeningTime(function(err, openTime) {
					if(err) {
						$scope.openTime = 'error';
						$scope.doorStateOk = false;
					} else {
						$scope.openTime = openTime;	
					}
					coopService.getDoorState(function(err, doorState) {
						if(err) {
							$scope.doorState = 'error';
							$scope.doorStateOk = false;
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
									$scope.doorStateOk = true;
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
									$scope.nextOpMessage = 'Opening in ' + deltaHours + ' hours and ' + deltaMins + ' minutes';
								} else {
									$scope.doorStateOk = false;
								}
							} else {
								if(currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
									$scope.doorStateOk = true;
									deltaHours = Math.floor((closeMinutes - currentMinutes) / 60);
									deltaMins = (closeMinutes - currentMinutes) % 60;

									$scope.nextOpMessage = 'Closing in ' + deltaHours + ' hours and ' + deltaMins + ' minutes';
								} else {
									$scope.doorStateOk = false;
								}
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
					$scope.uptime = days + ' days, ' + hours + ' hours, ' + minutes + ' minutes';	
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
