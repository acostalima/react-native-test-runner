'use strict';

const execa = require('execa');

const {
    REACT_NATIVE_VERSION,
    REACT_NATIVE_TEST_APP,
    ANDROID_EMULATOR = 'Pixel_API_28_AOSP',
    IOS_SIMULATOR = 'iPhone 11 (14.1)',
} = process.env;

const createCli = (testFileGlobs = [], options) => {
    const args = new Map();

    if (!Array.isArray(testFileGlobs)) {
        testFileGlobs = [testFileGlobs];
    }

    const cli = {
        runner(runner) {
            args.set('--runner', runner);

            return this;
        },
        require(script) {
            args.set('--require', script);

            return this;
        },
        platform(platform) {
            args.set('--platform', platform);

            return this;
        },
        rn(rn = REACT_NATIVE_VERSION) {
            if (rn) {
                args.set('--rn', rn);
            }

            return this;
        },
        app(app = REACT_NATIVE_TEST_APP) {
            if (app) {
                args.set('--app', app);
            }

            return this;
        },
        config(config) {
            args.set('--config', config);

            return this;
        },
        run(moreArgs = []) {
            return execa(
                './cli/index.js',
                [
                    ...Array.from(args, ([argName, argValue]) => [argName, argValue]).flat(),
                    ...moreArgs,
                    ...testFileGlobs,
                ],
                options,
            );
        },
    };

    cli.app();
    cli.rn();

    return cli;
};

const createIOSCli = (testFileGlobs, options) => {
    const cli = createCli(testFileGlobs, options).platform('ios');

    return {
        ...cli,
        run(moreArgs = []) {
            return cli.run(['--simulator', IOS_SIMULATOR, ...moreArgs]);
        },
    };
};

const createAndroidCli = (testFileGlobs, options) => {
    const cli = createCli(testFileGlobs, options).platform('android');

    return {
        ...cli,
        run(moreArgs = []) {
            return cli.run(['--emulator', ANDROID_EMULATOR, ...moreArgs]);
        },
    };
};

exports.createAndroidCli = createAndroidCli;
exports.createIOSCli = createIOSCli;

