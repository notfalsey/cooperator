'use strict';

var log = require('./logger.js')();

function NotifyService(config) {
	this.recipients = config.mailRecipients;
	this.from = config.mailFrom;
	this.mailgun = require('mailgun-js')({apiKey: config.mailApiKey, domain: config.mailDomain});
}

NotifyService.prototype = {
	notify: function(message, callback) {
		var data  = {
			from: this.from,
			to: this.recipients,
			subject: message,
			text: message
		};
		log.trace({message: message}, 'Sending email notification');
		this.mailgun.messages().send(data, function(err, body) {
			if(err) {
				log.error({err: err, body: body}, 'Error sending email notification');
			} else {
				log.trace({body: body, message: message}, 'Sent email notification');
			}
			if(callback) {
				callback(err);	
			}
		});
	}
};

module.exports = NotifyService;