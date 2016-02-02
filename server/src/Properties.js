'use strict';

var path = require('path');

var Properties = {

    getAppDir: function() {
        return path.resolve(__dirname, '..', '..');
    },

    getClientDir: function() {
		return path.join(this.getAppDir(), 'client');
    },

    getStaticFilesDir: function() {
    	return path.join(this.getClientDir(), 'src');
    },

    getServerDir: function() { 
    	return path.join(this.getAppDir(), 'server');	
    },

    getCertsDir: function() {
    	return path.join(this.getServerDir(), 'certs');
    },

    getConfigDir: function() {
    	return path.join(this.getServerDir(), 'config');
    },

    getConfigJson: function() {
    	return path.join(this.getConfigDir(), 'config.json');
    },

    getHttpKeyPath: function() {
    	return path.join(this.getCertsDir(), 'privKey.pem');	
    },

    getHttpCertPath: function() {
    	return path.join(this.getCertsDir(), 'publicCert.pem');	
    },

    getLogsDir: function() {
    	return path.join(this.getServerDir(), 'logs');
    },

    getLogFile: function() {
    	return path.join(this.getLogsDir(), 'coop.log');
    }
};

module.exports = Properties;
