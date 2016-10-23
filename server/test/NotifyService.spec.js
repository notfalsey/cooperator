var assert = require('assert'),
    mockery = require('mockery'),
    sinon = require('sinon'),
    NotifyService = require('../src/NotifyService.js');

describe('NotifyService', () => {
    var config = {
        mailRecipients: ['test@email.com'],
        mailFrom: 'test@no-reply.com',
        mailApiKey: 'testkey',
        mailDomain: 'testDomain'
    };

    before(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnRegistered: false
        });
    });

    afterEach(() => {
        mockery.deregisterAll();
    });

    after(() => {
        mockery.disable();
    });

    it('notify should call mail gun service', () => {
        var mailgunMock = function() {
            return {
                messages: function() {
                    return {
                        send: function() {
                            return Promise.resolve('success');
                        }
                    };
                }
            };
        };
        mockery.registerMock('mailgun-js', mailgunMock);
        var notifyService = new NotifyService(config);
        return notifyService.notify('Coop closed', 'Coop closed at ' + new Date());
    });

    it('notify should handle error on call notify call', (done) => {
        var mailgunMock = function() {
            return {
                messages: function() {
                    return {
                        send: function(data, callback) {
                            return Promise.reject(new Error('test'));
                        }
                    };
                }
            };
        };
        mockery.registerMock('mailgun-js', mailgunMock);
        var notifyService = new NotifyService(config);
        notifyService.notify('Coop closed', 'Coop closed at ' + new Date())
            .catch((err) => {
                assert(err);
                done();
            });
    });
});
