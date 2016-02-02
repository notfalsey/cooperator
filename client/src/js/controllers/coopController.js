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
		$scope.doorStateOk = false;
		$scope.uptime = '?';
		$scope.light = '?';

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

							if(doorState === 'closed') {
								if(currentMinutes <= openMinutes || currentMinutes >= closeMinutes) {
									$scope.doorStateOk = true;
								} else {
									$scope.doorStateOk = false;
								}
							} else {
								if(currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
									$scope.doorStateOk = true;
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
			coopService.commandDoor({dir: 'auto'}, function(err){});
		};

		$scope.closeDoor = function() {
			coopService.commandDoor({dir: 'close'}, function(err){});
		};

		$scope.openDoor = function() {
			coopService.commandDoor({dir: 'open'}, function(err){});
		};

		$scope.reset = function() {
			coopService.reset(function(err){});
		};

		$interval(update, 5000);
}]);
