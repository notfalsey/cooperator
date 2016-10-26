var assert = require('assert'),
    Mongoose = require('mongoose').Mongoose,
    mongoose = new Mongoose(),
    mockgoose = require('mockgoose'),
    DatabaseManager = require('../src/DatabaseManager.js');



describe('DatabaseManager', () => {
    var config = {
        dbUrl: "mongodb://localhost/coop"
    };

    before((done) => {
        mockgoose(mongoose).then(() => {
            mongoose.connect(config.dbUrl, () => {
                done();
            });
        });
    });

    afterEach(() => {
        return mockgoose.reset();
    });

    it('should record open activity', () => {
        var dbMgr = new DatabaseManager(config);
        return dbMgr.recordDoorActivity(new Date(), 'open').then(() => {
            return dbMgr.getDoorActivity().then((activity) => {
                assert(activity.length, 1);
            });
        });
    });

    it('should record close activity', () => {
        var dbMgr = new DatabaseManager(config);
        return dbMgr.recordDoorActivity(new Date(), 'close').then(() => {
            return dbMgr.getDoorActivity().then((activity) => {
                assert(activity.length, 1);
            });
        });
    });
});
