module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    grunt.initConfig({
        jsbeautifier: {
            beautify: {
                src: ['Gruntfile.js', 'client/**/*.js', 'client/**/*.html', 'client/**/*.css',
                    'client/**/*.json', 'server/**/*.js', 'server/**/*.json', '!client/deps'
                ]
            },
            check: {
                options: {
                    mode: 'VERIFY_ONLY'
                },
                src: ['Gruntfile.js', 'client/**/*.js', 'client/**/*.html', 'client/**/*.css',
                    'client/**/*.json', 'server/**/*.js', 'server/**/*.json', '!client/deps'
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
        exec: {
            bower: "bower install"
        },
        mocha_istanbul: {
            coverage: {
                src: 'server/test/**/*',
                options: {
                    mask: '*.spec.js',
                    coverage: true
                        /*,
                                            istanbulOptions: ['--include-all-sources']*/
                },
                check: {
                    lines: 80,
                    statements: 80
                }
            }
        }
    });



    grunt.registerTask('default', ['exec:bower', 'jshint', 'jsbeautifier:check', 'mocha_istanbul:coverage']);
    grunt.registerTask('bfy', ['jsbeautifier:beautify']);
};
