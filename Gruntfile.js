module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    grunt.initConfig({
        jsbeautifier: {
            beautify: {
                src: ['Gruntfile.js', 'client/**/*.js', 'client/**/*.html', 'client/**/*.css',
                    'client/**/*.json', 'server/**/*.js', 'server/**/*.json', '!client/deps/**/*'
                ]
            },
            check: {
                options: {
                    mode: 'VERIFY_ONLY'
                },
                src: ['Gruntfile.js', 'client/**/*.js', 'client/**/*.html', 'client/**/*.css',
                    'client/**/*.json', 'server/**/*.js', 'server/**/*.json', '!client/deps/**/*'
                ]
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'server/**/*.js', 'client/**/*.js', '!client/deps/**/*'],
            options: {
                globals: {
                    angular: false,
                    jQuery: true,
                    // for mocha tests
                    describe: false,
                    xdescribe: false,
                    it: false,
                    xit: false,
                    before: false,
                    beforeEach: false,
                    after: false,
                    afterEach: false,
                    // for protractor/jasmine tests
                    beforeAll: false,
                    browser: false,
                    by: false,
                    element: false,
                    expect: false,
                    jasmine: false,
                    protractor: false
                },
                node: true,
                multistr: true,
                esversion: 6
            }
        },
        karma: {
            dev: {
                configFile: 'karma.js'
            },
            debug: {
                configFile: 'karma.debug.js'
            }
        },
        exec: {
            bower: "bower install"
        },
        mocha_istanbul: {
            server: {
                src: 'server/test/**/*',
                options: {
                    mask: '*.spec.js',
                    coverage: true
                },
                check: {
                    lines: 80,
                    statements: 80
                }
            }
        }
    });


    grunt.registerTask('serverTest', 'mocha_istanbul:server');
    grunt.registerTask('clientTest', 'karma:dev');
    grunt.registerTask('default', ['exec:bower', 'jshint', 'jsbeautifier:check', 'karma:dev', 'mocha_istanbul:server']);
    grunt.registerTask('bfy', ['jsbeautifier:beautify']);
};
