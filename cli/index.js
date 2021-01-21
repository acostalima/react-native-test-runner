#!/usr/bin/env node

'use strict';

const path = require('path');
const meow = require('meow');
const semver = require('semver');
const runIOS = require('./run-ios');
const runAndroid = require('./run-android');
const runMetroServer = require('./metro-server');
const createTestApp = require('./create-test-app');
const createTestRunner = require('./test-runners');

const cli = meow(`
Usage
    $ rn-test --platform ['ios' | 'android'] [--simulator ios_simulator | --emulator android_avd] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js.

Options
    --plaform, -p    Platform on which to run the test suite on. One of: 'ios', 'android'.
    --simulator, -s  iOS simulator to run the test suite on.
    --emulator, -e   Android emulator or virtual device (AVD) to run the test suite on.
    --metroPort, -p  Port on which Metro's server should listen to. [Default: 8081]
    --cwd            Current directory. [Default: process.cwd()]
    --rn             React Native version to use. [Default: 0.63.4]
    --runner, -r     Test runner to use. One of: 'zora', 'mocha'. [Default: 'zora']

Examples
    # Run tests on iPhone 11 simulator with iOS 14.1 runtime
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
        runner: {
            type: 'string',
            alias: 'r',
            default: 'zora',
        },
    },
});

const SUPPORTED_PLATFORMS = ['android', 'ios'];
const SUPPORTED_RUNNERS = ['zora', 'mocha'];

if (!SUPPORTED_RUNNERS.includes(cli.flags.runner)) {
    console.error(`Unknown runner: ${cli.flags.runner}. Supported runners are: ${SUPPORTED_RUNNERS.join(', ')}.`);
    process.exit(2);
}

if (!SUPPORTED_PLATFORMS.includes(cli.flags.platform)) {
    console.error(`Unknown platform: ${cli.flags.platform}. Supported platforms are: ${SUPPORTED_PLATFORMS.join(', ')}.`);
    process.exit(2);
}

if (!semver.valid(cli.flags.rn)) {
    console.error(`Invalid React Native version scheme: ${cli.flags.rn}. Must be compliant with Semantic Version.`);
    process.exit(2);
}

const runNativePlatform = (options) => {
    options = {
        projectPath: path.join(options.testAppPath, options.platform),
        ...options,
    };

    switch (options.platform) {
    case 'android':
        return runAndroid(options);
    case 'ios':
        return runIOS(options);
    default:
        throw new Error(`Developer error. Unknown platform: ${options.platform}`);
    }
};

const runTests = async () => {
    try {
        const testRunner = createTestRunner(cli.flags, cli.input);
        const testAppPath = await createTestApp({ reactNativeVersion: cli.flags.rn });

        await runMetroServer({
            cwd: cli.flags.cwd,
            port: cli.flags.metroPort,
            testAppPath,
            testRunner,
        });

        const shutdownNativePlatform = await runNativePlatform({ ...cli.flags, testAppPath });

        await testRunner.reporter.waitForTests();
        await shutdownNativePlatform();

        process.exit(testRunner.reporter.didPass() ? 0 : 1);
    } catch (error) {
        console.error(error);
        process.exit(3);
    }
};

runTests();
