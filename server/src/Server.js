'use strict';

var async = require('async'),
    CertificateManager = require('./CertificateManager.js'),
    CoopApp = require('./CoopApp.js'),
    props = require('./Properties.js'),
    fs = require('fs-extra');

var config = null;

async.series([
        function(callback) {
            fs.readJSON(props.getConfigJson(), function(err, data) {
                if(err) {
                    var msg = 'Error reading config file: ' + props.getConfigJson();
                    console.error(msg);
                    callback(new Error(msg));
                } else {
                    config = data;
                    callback();    
                }
            });
        },
        function(callback) {
            var certMgr = new CertificateManager();
            certMgr.verifyCertsDir(function(err) {
                if(err) {
                    callback(err);
                } else {
                    certMgr.isKeyPairInstalled(function(installed) {
                        if(!installed) {
                            certMgr.generateKeyPair('localhost', props.getHttpCertPath(), props.getHttpKeyPath(), callback);
                        } else {
                            callback();
                        }
                    });                
                }
            });
        }, 
        function(callback) {
            var app = new CoopApp();
            app.start(props.getHttpKeyPath(), props.getHttpCertPath(), callback);
        }
    ], function(err, results){
        if(err) {
            console.error('Error: ' + err);
        }
    });
