var assert = require('assert'),
    i2cWrapper = require('../src/i2cWrapper.js');

describe('i2cWrapper', () => {
	var i2c;

	beforeEach(() => {
		i2c = new i2cWrapper();
	});

    it('should write bytes successfully', () => {
    	return i2c.writeBytes(0, []);
    });

    it('should read successfully', () => {
    	return i2c.read(0);
    });
});
