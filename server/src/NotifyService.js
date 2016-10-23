'use strict';

var log = require('./logger.js')();

function NotifyService(config) {
    this.recipients = config.mailRecipients;
    this.from = config.mailFrom;
    this.mailgun = require('mailgun-js')({
        apiKey: config.mailApiKey,
        domain: config.mailDomain
    });
}

NotifyService.prototype = {
    notify: function(subject, message) {
        var data = {
            from: this.from,
            to: this.recipients,
            subject: subject,
            text: message
        };
        log.trace({
            subject: subject,
            message: message
        }, 'Sending email notification');
        return this.mailgun.messages().send(data);
    }
};

module.exports = NotifyService;
