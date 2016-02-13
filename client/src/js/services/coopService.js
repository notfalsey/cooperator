'use strict';

var appName = 'coopApp';
angular.module(appName)
.factory(appName + '.coopService', ['$http', '$log', '$interval', '$location', function($http, $log, $interval, $location) {

	var baseUrl = '/coop';

	var commandDoor = function(dir, callback) {
		$http.put(baseUrl + '/door', {
			dir: dir
		})
		.success(function(data, status, headers, config) {
			callback(null, data);
		})
		.error(function(data, status, headers, config) {
			$log.error('Error sending door command dir = ' +dir+', status=' + status + ': ' + data);
            callback(new Error(data));
		});
	};

	var reset = function(dir, callback) {
		$http.put(baseUrl + '/reset', {})
		.success(function(data, status, headers, config) {
			callback(null, data);
		})
		.error(function(data, status, headers, config) {
			$log.error('Error sending door command dir = ' +dir+', status=' + status + ': ' + data);
            callback(new Error(data));
		});
	};

	var getCoopData = function(valueName, callback) {
		$http.get(baseUrl + '/' + valueName, {
		})
		.success(function(data, status, headers, config) {
			callback(null, data);
		})
		.error(function(data, status, headers, config) {
			$log.error('Error getting coop data ('+valueName+'), status=' + status + ': ' + data);
            callback(new Error(data));
		});
	};

	var getDoorState = function(callback) {
		getCoopData('door', callback);
	};

	var getUptime = function(callback) {
		getCoopData('uptime', callback);
	};

	var getLight = function(callback) {
		getCoopData('light', callback);
	};

	var getTemp = function(callback) {
		getCoopData('temp', callback);
	};

	var getClosingTime = function(callback) {
		getCoopData('closetime', callback);
	};

	var getOpeningTime = function(callback) {
		getCoopData('opentime', callback);
	};

	var getWriteErrorCount = function(callback) {
		getCoopData('werrors', callback);
	};

	var getReadErrorCount = function(callback) {
		getCoopData('rerrors', callback);
	};

	var getAutoResetCount = function(callback) {
		getCoopData('autoresets', callback);
	};

	var getLastError = function(callback) {
		getCoopData('lasterror', callback);
	};

	var getLastRead = function(callback) {
		getCoopData('lastread', callback);
	};

	var getLastWrite = function(callback) {
		getCoopData('lastwrite', callback);
	};

	var getLongestUptime = function(callback) {
		getCoopData('longestuptime', callback);
	};

	var getMode = function(callback) {
		getCoopData('mode', callback);
	};

	return {
		commandDoor: commandDoor,
		getAutoResetCount: getAutoResetCount,
		getClosingTime: getClosingTime,
		getDoorState: getDoorState,
		getLastError: getLastError,
		getLastRead: getLastRead,
		getLastWrite: getLastWrite,
		getLongestUptime: getLongestUptime,
		getLight: getLight,
		getMode: getMode,
		getOpeningTime: getOpeningTime,
		getReadErrorCount: getReadErrorCount,
		getWriteErrorCount: getWriteErrorCount,
		getTemp: getTemp,
		getUptime: getUptime,
		reset: reset
	};
}]);