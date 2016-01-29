'use strict';

var express = require('express'),
	fs = require('fs-extra'),
	https = require('https'),
	props = require('./Properties.js'),
	log = require('./logger.js')();

function configure (app) {
	app.use(express.static(props.getStaticFilesDir()));
}

function CoopApp() {
	this.app = express();
	configure(this.app);
}

CoopApp.prototype = {
	
	start: function(keyPath, certPath, callback) {
		var options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        var config = fs.readJsonSync(props.getConfigJson());

        var httpsServer = https.createServer(options, this.app).listen(
            config.httpsPort,
            function(err) {
                var mesg = 'HTTPS server listening on *:' + config.httpsPort;
                console.warn(mesg);
                log.info(mesg);
                if (callback) {
                    callback(err);
                }
            });        
	}
};

module.exports = CoopApp;
