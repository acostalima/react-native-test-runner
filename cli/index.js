#!/usr/bin/env node

'use strict';

const path = require('path');
const meow = require('meow');
const runIOS = require('./run-ios');
const runAndroid = require('./run-android');
const runMetroServer = require('./metro-server');

const cli = meow(`
Usage
    $ rn-test [--platform 'ios' | --platform 'android'] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js

Options
    --plaform, -p    Platform on which to run the test suites on. Options: 'ios', 'android'.
    --simulator, -s  iOS simulator to run the test suites on.
    --emulator, -e   Android emulator to run the test suites on.
    --metroPort, -p  Port on which Metro's server should listen to. Default: 8081.
    --cwd            Current directory. Default: process.cwd().

Examples
    # Run tests on iPhone 11 simulator with iOS version 14.1
    $ rn-test --platform ios --simulator 'iPhone 11 (14.1)' 'test/**/*.test.js'

    # Run tests on iPhone 11 simulator with whatever iOS version is available
    $ rn-test --platform ios --simulator 'iPhone 11' 'test/**/*.test.js'

    # Run tests on iOS simulator by UUID
    $ rn-test --platform ios --simulator 'DAC8A157-A03E-4E35-92E6-90752F95BB7A' 'test/**/*.test.js'

    # Run tests on Android emulator
    $ rn-test --platform android --emulator 'Pixel_API_28_AOSP' 'test/**/*.test.js'
`,
{
    flags: {
        platform: {
            type: 'string',
            alias: 'p',
            isRequired: true,
        },
        simulator: {
            type: 'string',
            alias: 's',
            isRequired: (flags) => flags.platform === 'ios',
        },
        emulator: {
            type: 'string',
            alias: 'e',
            isRequired: (flags) => flags.platform === 'android',
        },
        metroPort: {
            type: 'number',
            alias: 'p',
            default: 8081,
        },
        cwd: {
            type: 'string',
            default: process.cwd(),
        },
    },
});

const { metroPort, cwd, emulator, simulator, platform } = cli.flags;
const testFileGlobs = cli.input;

const PLATFORMS = ['android', 'ios'];
const runTestsByPlatform = {
    ios: () => runIOS({
        simulator,
        projectPath: path.join(__dirname, '..', 'ios'),
        metroPort,
    }),
    android: () => runAndroid({
        emulator,
        projectPath: path.join(__dirname, '..', 'android'),
        metroPort,
    }),
};

if (!PLATFORMS.includes(platform)) {
    console.error(`Unknown platform: ${platform}. Supported platforms are: ${PLATFORMS.join(', ')}.`);
    process.exit(2);
}

const run = async () => {
    try {
        const { testReporter } = await runMetroServer({
            cwd,
            port: metroPort,
            testFileGlobs,
        });
        const runPlatform = runTestsByPlatform[platform];
        const shutdownPlatform = await runPlatform();

        await testReporter.waitForTests();
        await shutdownPlatform();

        process.exit(testReporter.pass ? 0 : 1);
    } catch (error) {
        console.error(error);
        process.exit(2);
    }
};

run();
