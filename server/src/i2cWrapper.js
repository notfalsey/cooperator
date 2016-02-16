var ret = null;
function i2cMock(address, config) {
}
i2cMock.prototype = {
	read: function(num, callback) {
		callback(null, []);
	},
	writeBytes: function(command, args, callback) {
		callback(null);
	}
};
// if we are on linux return i2c; otherwise mock it out to devlopment on mac
if(/^linux/.test(process.platform) === false) {
	
	// mock i2c
	ret = i2cMock;
} else {
	ret = require('i2c');
}

module.exports = ret;