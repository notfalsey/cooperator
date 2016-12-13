'use strict';

var Promise = require('bluebird'),
    http = require('http'),
    querystring = require('querystring'),
    log = require('./logger.js')();

class NotifyService {
    constructor(config) {
        this.recipients = config.textRecipients;
        this.textHost = config.textHost;
    }

    notify(message, number) {
        log.trace({
            message: message,
            number: number
        }, 'Sending text notification');

        return new Promise((resolve, reject) => {
            var postData = querystring.stringify({
                number: number,
                message: message
            });

            var parms = {
                host: this.textHost,
                port: 80,
                path: '/text',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            var req = http.request(parms, (resp) => {
                log.trace({
                    statusCode: resp.statusCode
                }, 'Received notification response');
                resp.on('data', (data) => {});
                resp.on('end', () => {
                    if (resp.statusCode >= 200 && resp.statusCode < 300) {
                        log.info({
                            message: message,
                            number: number
                        }, 'Sent notification successfully');
                        resolve();
                    } else {
                        log.error({
                            statusCode: resp.statusCode
                        }, 'Notification failed');
                        reject(new Error('Notification failed.'));
                    }
                });
            });

            req.on('error', (err) => {
                log.error({
                    err: err
                }, 'Error received when sending notification');
                reject(err);
            });

            req.write(postData);
            req.end();
        });
    }

    notifyAll(message) {
        var notifications = [];
        for (var r of this.recipients) {
            notifications.push(this.notify(message, r));
        }
        return Promise.all(notifications);
    }
}

module.exports = NotifyService;
