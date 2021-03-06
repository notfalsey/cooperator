// Karma configuration
// Generated on Sun Oct 16 2016 21:07:24 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'sinon', 'chai'],

    // list of files / patterns to load in the browser
    files: [
      'client/deps/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/chai/chai.js',
      'client/src/js/app.js',
      'client/src/js/services/*.js',
      'client/src/js/controllers/*.js',
      'client/src/js/directives/*.js',
      { pattern: 'client/src/img/*.*', included: false, served: true },
      'client/src/views/*.html',
      'client/test/js/**/*.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        'client/src/views/*.html': ['ng-html2js']
    },
    
    ngHtml2JsPreprocessor: { 
        stripPrefix: 'client', 
        moduleName: 'templates' 
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha', 'progress'],

    mochaReporter: {
        output: 'autowatch' 
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
