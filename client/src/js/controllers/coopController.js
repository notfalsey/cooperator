'use strict';

var appName = 'coopApp';
angular.module(appName)
.controller(appName + '.coopController', 
	['$scope', 
	appName + '.coopService', 
	function($scope, coopService) {
		$scope.openTime = '?';
		$scope.closeTime = '?';
		$scope.doorState = '?';
		$scope.uptime = '?';
		$scope.light = '?';
		$scope.temp = '?';

		coopService.getClosingTime(function(err, closeTime) {
			if(err) {
				$scope.closeTime = 'error';
			} else {
				$scope.closeTime = closeTime;	
			}
		});

		coopService.getDoorState(function(err, doorState) {
			if(err) {
				$scope.doorState = 'error';
			} else {
				$scope.doorState = doorState;	
			}
		});

		coopService.getOpeningTime(function(err, openTime) {
			if(err) {
				$scope.openTime = 'error';
			} else {
				$scope.openTime = openTime;	
			}
		});

		coopService.getUptime(function(err, uptime) {
			if(err) {
				$scope.uptime = 'error';
			} else {
				var days = uptime / (24 * 3600 * 1000);
				var hours = (uptime / (3600 * 1000)) % 24;
				var minutes = (uptime / (60 * 1000)) % 60;
				var seconds = (uptime / (1000)) % 60;
				$scope.uptime = uptime;	
			}
		});

		coopService.getLight(function(err, light) {
			if(err) {
				$scope.light = 'error';
			} else {
				$scope.light = light;	
			}
		});

		coopService.getTemp(function(err, temp) {
			if(err) {
				$scope.temp = 'error';
			} else {
				$scope.temp = temp;	
			}
		});

		$scope.autoDoor = function() {
			coopService.commandDoor({dir: 'auto'}, function(err){});
		};

		$scope.closeDoor = function() {
			coopService.commandDoor({dir: 'close'}, function(err){});
		};

		$scope.openDoor = function() {
			coopService.commandDoor({dir: 'open'}, function(err){});
		};
}]);
