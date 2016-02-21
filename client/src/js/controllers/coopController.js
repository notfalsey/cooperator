'use strict';

var appName = 'coopApp';
angular.module(appName)
.controller(appName + '.coopController', 
	['$scope', '$log', '$interval',
	appName + '.coopService', appName + '.videoService', 
	function($scope, $log, $interval, coopService, videoService) {
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
		$scope.light = '?';
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
										deltaHours = Math.floor((24*60 - currentMinutes + openMinutes) / 60);
										deltaMins = (24*60 - currentMinutes + openMinutes) % 60;
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
			coopService.getReadErrorCount(function(err, readErrors) {
				if(!err) {
					$scope.readErrors = readErrors;
				} else {
					$log.error('Error getting read error count');
				}
				coopService.getWriteErrorCount(function(err, writeErrors) {
					if(!err) {
						$scope.writeErrors = writeErrors;
					} else {
						$log.error('Error getting write error count');
					}
					coopService.getAutoResetCount(function(err, autoResets) {
						if(!err) {
							$scope.autoResets = autoResets;
							$scope.unhealthy = ($scope.autoResets + $scope.readErrors + $scope.writeErrors) > 0;
						} else {
							$log.error('Error getting auto reset count');
						}
						coopService.getLastRead(function(err, lastRead) {
							if(!err) {
								$scope.lastRead = new Date(lastRead).toString();
							} else {
								$log.error('Error getting last read');
							}
							coopService.getLastRead(function(err, lastWrite) {
								if(!err) {
									$scope.lastWrite = new Date(lastWrite).toString();
								} else {
									$log.error('Error getting last write');
								}	
								coopService.getLastError(function(err, lastError) {
									if(!err) {
										if(lastError === -1) {
											$scope.lastError = 'No errors yet';
										} else {
											$scope.lastError = new Date(lastError).toString();	
										}
										coopService.getLongestUptime(function(err, longestUptime) {
											if(!err) {
												var days = Math.floor(longestUptime / (24 * 3600 * 1000));
												var hours = Math.floor((longestUptime / (3600 * 1000)) % 24);
												var minutes = Math.floor((longestUptime / (60 * 1000)) % 60);
												$scope.longestUptime = days + ' days, ' + hours + ' hrs, ' + minutes + ' mins';	
											} else {
												$log.error('Error getting longest uptime');
											}	
										});
									} else {
										$log.error('Error getting last error');
									}	
								});
							});
						});
					});
				});
			});
		};

		$interval(update, 5000);

		getHealth();
}]);
