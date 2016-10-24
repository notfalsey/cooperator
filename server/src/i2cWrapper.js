'use strict';

var Promise = require('bluebird');

var ret = null;

function i2cMock(address, config) {}
i2cMock.prototype = {
    read: (num) => {
        return Promise.resolve([]);
    },
    writeBytes: (command, args) => {
        return Promise.resolve();
    }
};
// if we are on linux return i2c; otherwise mock it out for development on mac
if (/^linux/.test(process.platform) === false) {
    // mock i2c
    ret = i2cMock;
} else {
    ret = Promise.promisifyAll(require('i2c'));
}

module.exports = ret;
