'use strict';

var mongoose = require('mongoose'),
    log = require('./logger.js')();

var doorActivitySchema = new mongoose.Schema({
    time: Date,
    type: String
});
var DoorActivity = mongoose.model('DoorActivity', doorActivitySchema);

class DatabaseManager {

    constructor(config) {
        mongoose.Promise = require('bluebird');
        this.dbUrl = config.dbUrl;
        this.dbName = config.dbName;
        this.connected = false;
        mongoose.connect(this.dbUrl);
        this.db = mongoose.connection;
        this.db.on('error', (err) => {
            log.error({
                err: err
            }, 'Mongo Connection error');
        });
        this.db.on('open', () => {
            log.info('Mongo Connection successful');
            this.connected = true;
        });
    }

    recordDoorActivity(time, type) {
        var record = new DoorActivity({
            time: time,
            type: type
        });
        return record.save();
    }

    getDoorActivity() {
        return DoorActivity.find();
    }
}

module.exports = DatabaseManager;
