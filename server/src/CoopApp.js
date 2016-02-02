'use strict';

var bodyParser = require('body-parser'),
    express = require('express'),
	fs = require('fs-extra'),
	https = require('https'),
	props = require('./Properties.js'),
    CoopController = require('./CoopController.js'),
    WeatherService = require('./WeatherService.js'),
	log = require('./logger.js')();

function configure (app, config) {
	app.use(express.static(props.getStaticFilesDir()));
    app.use(bodyParser.json()); // for parsing application/json
    var weatherService = new WeatherService(config);
    var coopController = new CoopController(config, weatherService);
    require('./routes/coop.js')(app, '/coop', coopController);
    require('./routes/weather.js')(app, '/weather', weatherService);
}

function CoopApp() {
    this.config = fs.readJsonSync(props.getConfigJson());
	this.app = express();
	configure(this.app, this.config);
}

CoopApp.prototype = {
	
	start: function(keyPath, certPath, callback) {
		var options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        var self = this;
        var httpsServer = https.createServer(options, this.app).listen(
            self.config.httpsPort,
            function(err) {
                var mesg = 'HTTPS server listening on *:' + self.config.httpsPort;
                console.warn(mesg);
                log.info(mesg);
                if (callback) {
                    callback(err);
                }
            });        
	}
};

module.exports = CoopApp;
