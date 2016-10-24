'use strict';

var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    express = require('express'),
    flash = require('connect-flash'),
    fs = require('fs-extra'),
    https = require('https'),
    props = require('./Properties.js'),
    CoopController = require('./CoopController.js'),
    NotifyService = require('./NotifyService.js'),
    Promise = require('bluebird'),
    VideoService = require('./VideoService.js'),
    WeatherService = require('./WeatherService.js'),
    passport = require('passport'),
    session = require('express-session'),
    GoogleStrategy = require('passport-google-oauth20').Strategy,
    log = require('./logger.js')();

function configure(app, config) {
    log.trace('Configuring coop app');
    app.use(cookieParser());
    app.use(bodyParser.json()); // for parsing application/json
    app.use(flash());
    app.use(session({
        secret: 'cookie_secret',
        name: 'kaas',
        proxy: true,
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: true
        }
    }));

    app.set('trust proxy', 1); // trust first proxy 

    if (!config.hasOwnProperty('doAuth') || config.doAuth === true) {
        // Passport session setup.
        //   To support persistent login sessions, Passport needs to be able to
        //   serialize users into and deserialize users out of the session.  Typically,
        //   this will be as simple as storing the user ID when serializing, and finding
        //   the user by ID when deserializing.  However, since this example does not
        //   have a database of user records, the complete Google profile is
        //   serialized and deserialized.
        passport.serializeUser(function(user, done) {
            done(null, user);
        });

        passport.deserializeUser(function(obj, done) {
            done(null, obj);
        });
        passport.use(new GoogleStrategy({
                clientID: config.googleOauthClientId,
                clientSecret: config.googleOauthClientSecret,
                callbackURL: config.googleCallbackUrl
            },
            function(identifier, accessToken, refreshToken, profile, done) {
                log.trace({
                    identifier: identifier,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    profile: profile
                }, 'Got google profile');
                for (var i = 0; i < profile.emails.length; i++) {
                    if (config.allowedUsers.indexOf(profile.emails[i].value) !== -1) {
                        log.trace({
                            email: profile.emails[i].value
                        }, 'User is authorized');
                        done(null, profile);
                        return;
                    }
                }
                // none of the emails for this profile are in the authorized users list
                var msg = 'Invalid e-mail address or password';
                log.trace(msg);
                done(null, false, {
                    message: msg
                });
            }));

        app.use(passport.initialize());
        app.use(passport.session());

        // GET /auth/google
        //   Use passport.authenticate() as route middleware to authenticate the
        //   request.  The first step in Google authentication will involve
        //   redirecting the user to google.com.  After authorization, Google
        //   will redirect the user back to this application at /auth/google/callback
        app.get('/auth/google', passport.authenticate('google', {
            scope: [
                'https://www.googleapis.com/auth/plus.login',
                'https://www.googleapis.com/auth/plus.profile.emails.read'
            ]
        }));

        // GET /auth/google/callback
        //   Use passport.authenticate() as route middleware to authenticate the
        //   request.  If authentication fails, the user will be redirected back to the
        //   login page.  Otherwise, the primary route function function will be called,
        //   which, in this example, will redirect the user to the home page.
        app.get('/auth/google/callback',
            passport.authenticate('google', {
                successRedirect: '/',
                //failureRedirect: '/login',
                faliureFlash: true
            }));


        app.get('/login', function(req, res) {
            res.end('<a href="/auth/google">Login with Google</a>');
        });

        app.get('/logout', function(req, res) {
            req.logout();
            res.redirect('/');
        });

        // Simple route middleware to ensure user is authenticated.
        //   Use this route middleware on any resource that needs to be protected.  If
        //   the request is authenticated (typically via a persistent login session),
        //   the request will proceed.  Otherwise, the user will be redirected to the
        //   login page.
        app.use(function ensureAuthenticated(req, res, next) {
            if (req.isAuthenticated()) {
                log.trace('request is authenticated.');
                return next();
            }
            log.trace('request is not authenticated.');
            res.redirect('/login');
        });
    }

    app.use(express.static(props.getStaticFilesDir()));

    var weatherService = new WeatherService(config);
    var notifyService = new NotifyService(config);
    var coopController = new CoopController(config, weatherService, notifyService);
    require('./routes/coop.js')(app, '/coop', coopController);
    require('./routes/video.js')(app, '/video', new VideoService(config));
    require('./routes/weather.js')(app, '/weather', weatherService);
}

class CoopApp {
    constructor(config) {
        log.trace('Creating coop app');
        this.config = config;
        this.app = express();
        configure(this.app, this.config);
    }

    start(keyPath, certPath) {
        log.trace('Starting coop app');
        log.trace('Reading SSL key pair');
        var options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        var self = this;
        log.info('Starting HTTP server...');
        return new Promise((resolve, reject) => {
            this.httpsServer = https.createServer(options, this.app).listen(
                self.config.httpsPort,
                (err) => {
                    var mesg = 'HTTPS server listening on *:' + self.config.httpsPort;
                    log.info(mesg);
                    console.warn(mesg);
                    log.info(mesg);
                    if (err) {
                        return reject(err);
                    } else {
                        return resolve();
                    }
                });
        });
    }

    stop() {
        var msg = 'Stopping HTTP server...';
        log.info(msg);
        console.warn(msg);
        return new Promise((resolve, reject) => {
            if (this.httpsServer) {
                this.httpsServer.close(() => {
                    var msg = 'HTTP server stopped.'
                    log.info(msg);
                    console.warn(msg);
                    resolve();
                });
            } else {
                reject(new Error('Not started'));
            }
        });
    }
}

module.exports = CoopApp;
