var assert = require('assert'),
    nock = require('nock'),
    NotifyService = require('../src/NotifyService.js');

describe('NotifyService', () => {
    var config = {
        textRecipients: ['9196729862'],
        textHost: 'localhost'
    };

    it('notify should call text service', () => {
        nock('http://' + config.textHost).post('/text').reply(200, '');
        var notifyService = new NotifyService(config);
        return notifyService.notify('Coop closed', 'Coop closed at ' + new Date());
    });

    it('notify should handle error on notify call', () => {
        nock('http://' + config.textHost).post('/text').reply(500, '');
        var notifyService = new NotifyService(config);
        notifyService.notify('Coop closed', 'Coop closed at ' + new Date())
            .then(() => {
                assert.fail('should not succeed');
            })
            .catch((err) => {
                // do nothing
            });
    });
});
