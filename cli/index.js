#!/usr/bin/env node

'use strict';

const path = require('path');
const meow = require('meow');
const semver = require('semver');
const runIOS = require('./run-ios');
const runAndroid = require('./run-android');
const runMetroServer = require('./metro-server');
const { createTestApp } = require('./test-app');

const cli = meow(`
Usage
    $ rn-test [--platform 'ios' | --platform 'android'] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js

Options
    --plaform, -p    Platform on which to run the test suites on. Options: 'ios', 'android'.
    --simulator, -s  iOS simulator to run the test suites on.
    --emulator, -e   Android emulator or virtual device (AVD) to run the test suites on.
    --metroPort, -p  Port on which Metro's server should listen to. Default: 8081.
    --cwd            Current directory. Default: process.cwd().
    --rn             React Native version to test against. Default: 0.63.4.
    --app            Absolute path to the test app. Default: ~/.npm/rn-test-app.

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
        rn: {
            type: 'string',
            default: '0.63.4',
        },
    },
});

const SUPPORTED_PLATFORMS = ['android', 'ios'];

const { metroPort, cwd, emulator, simulator, platform, rn: reactNativeVersion } = cli.flags;
const testFileGlobs = cli.input.length === 0 ? ['**/test?(s)/**/?(*.)+(spec|test).js'] : cli.input;

if (!SUPPORTED_PLATFORMS.includes(platform)) {
    console.error(`Unknown platform: ${platform}. Supported platforms are: ${SUPPORTED_PLATFORMS.join(', ')}.`);
    process.exit(2);
}

if (!semver.valid(reactNativeVersion)) {
    console.error(`Invalid React Native version scheme: ${reactNativeVersion}. Must be compliant with Semantic Version.`);
    process.exit(2);
}

const runNativePlatform = (platform, testAppPath) => {
    const options = { projectPath: path.join(testAppPath, platform), metroPort };

    switch (platform) {
    case 'android':
        return runAndroid({ emulator, ...options });
    case 'ios':
        return runIOS({ simulator, ...options });
    default:
        throw new Error(`Developer error. Unknown platform: ${platform}`);
    }
};

const run = async () => {
    try {
        const { appPath: testAppPath } = await createTestApp({ reactNativeVersion });
        const { testReporter } = await runMetroServer({
            cwd,
            port: metroPort,
            testFileGlobs,
            testAppPath,
        });
        const shutdownNativePlatform = await runNativePlatform(platform, testAppPath);

        await testReporter.waitForTests();
        await shutdownNativePlatform();

        process.exit(testReporter.pass ? 0 : 1);
    } catch (error) {
        console.error(error);
        process.exit(2);
    }
};

run();
