module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.initConfig({
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
                multistr: true
            }
        },
        bower: {
            install: {
                options: {
                    targetDir: './client/deps',
                    cleanTargetDir: true
                }
            }
        }
    });

    grunt.registerTask('default', ['bower:install', 'jshint']);
    
};
