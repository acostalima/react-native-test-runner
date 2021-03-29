'use strict';

const execa = require('execa');

const {
    REACT_NATIVE_VERSION,
    REACT_NATIVE_TEST_APP,
    ANDROID_EMULATOR,
    IOS_SIMULATOR,
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
        run(args = []) {
            if (IOS_SIMULATOR) {
                args = ['--simulator', IOS_SIMULATOR, ...args];
            }

            return cli.run(args);
        },
    };
};

const createAndroidCli = (testFileGlobs, options) => {
    const cli = createCli(testFileGlobs, options).platform('android');

    return {
        ...cli,
        run(args = []) {
            if (ANDROID_EMULATOR) {
                args = ['--emulator', ANDROID_EMULATOR, ...args];
            }

            return cli.run(args);
        },
    };
};

exports.createAndroidCli = createAndroidCli;
exports.createIOSCli = createIOSCli;

