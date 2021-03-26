#!/usr/bin/env node

'use strict';

const path = require('path');
const os = require('os');
const meow = require('meow');
const semver = require('semver');
const { lilconfigSync: loadConfig } = require('lilconfig');
const mergeOptions = require('merge-options');
const runIOS = require('./run-ios');
const runAndroid = require('./run-android');
const runMetroServer = require('./metro-server');
const createTestApp = require('./create-test-app');
const createTestRunner = require('./test-runners');
const { findMonoRepoRoot } = require('./utils');

const cli = meow(`
Usage
    $ rn-test --platform ['ios' | 'android'] [--simulator ios_simulator | --emulator android_avd] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js.

Options
    --plaform, -p          Platform on which to run the test suite on. One of: 'ios', 'android'.
    --simulator, -s        iOS simulator to run the test suite on.
    --emulator, -e         Android emulator or virtual device (AVD) to run the test suite on.
    --metro-port, -p       Port on which Metro's server should listen to. [Default: 8081]
    --cwd                  Current directory. [Default: process.cwd()]
    --rn                   React Native version to use. [Default: 0.63.4]
    --runner               Test runner to use. One of: 'zora', 'mocha'. [Default: 'zora']
    --require              Path to the module to load before the test suite. If not absolute, cwd is used to resolve the path.
    --app                  Path to the React Native test app root. [Default: ~/.rn-test-app]
    --reset-cache          Resets Metro's cache. [Default: false]

Examples
    # Run tests on iPhone 11 simulator with iOS version 14.1 runtime
    $ rn-test --platform ios --simulator 'iPhone 11 (14.1)' 'test/**/*.test.js'

    # Run tests on iPhone 11 simulator with whatever iOS version is available
    $ rn-test --platform ios --simulator 'iPhone 11' 'test/**/*.test.js'

    # Run tests on iOS simulator by UUID
    $ rn-test --platform ios --simulator 'DAC8A157-A03E-4E35-92E6-90752F95BB7A' 'test/**/*.test.js'

    # Run tests on Android emulator
    $ rn-test --platform android --emulator 'Pixel_API_28_AOSP' 'test/**/*.test.js'

Notes
    Do not use shell expansion for globs. Always wrap them in a string.
    $ rn-test 'test/**' ✅
    $ rn-test test/** ❌

    Check out the README for information about advanced options.
`,
{
    flags: {
        platform: {
            type: 'string',
            alias: 'p',
        },
        simulator: {
            type: 'string',
            alias: 's',
        },
        emulator: {
            type: 'string',
            alias: 'e',
        },
        metroPort: {
            type: 'number',
            alias: 'p',
        },
        cwd: {
            type: 'string',
        },
        rn: {
            type: 'string',
        },
        runner: {
            type: 'string',
        },
        require: {
            type: 'string',
            alias: 'r',
        },
        config: {
            type: 'string',
            alias: 'c',
        },
        app: {
            type: 'string',
        },
        resetCache: {
            type: 'boolean',
        },
    },
});

const CLI_DEFAULT_OPTIONS = {
    metroPort: 8081,
    cwd: process.cwd(),
    rn: '0.63.4',
    runner: 'zora',
    app: path.join(os.homedir(), '.rn-test-app'),
    resetCache: false,
};
const SUPPORTED_PLATFORMS = ['android', 'ios'];
const SUPPORTED_RUNNERS = ['zora', 'mocha'];

const fileConfigExplorer = loadConfig('rn-test', { stopDir: process.cwd() });
const fileConfigSearchResult = fileConfigExplorer.search();
const fileConfig = cli.flags.config ? fileConfigExplorer.load(cli.flags.config) : fileConfigSearchResult || {};
const options = mergeOptions({}, CLI_DEFAULT_OPTIONS, fileConfig.config, cli.flags);

if (!SUPPORTED_RUNNERS.includes(options.runner)) {
    console.error(`Unknown runner: ${options.runner}. Supported runners are: ${SUPPORTED_RUNNERS.join(', ')}.`);
    process.exit(2);
}

if (!SUPPORTED_PLATFORMS.includes(options.platform)) {
    console.error(`Unknown platform: ${options.platform}. Supported platforms are: ${SUPPORTED_PLATFORMS.join(', ')}.`);
    process.exit(2);
}

if (!semver.valid(options.rn)) {
    console.error(`Invalid React Native version scheme: ${options.rn}. Must be compliant with Semantic Version.`);
    process.exit(2);
}

const runTestApp = (options) => {
    options = {
        ...options,
        testAppRoot: path.join(options.app, options.platform),
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

const runTests = async (options, testFileGlobs) => {
    try {
        const monoRepoRoot = await findMonoRepoRoot(options.cwd);
        const jsAppRoot = path.join(__dirname, '..');
        const testRunner = createTestRunner(options, testFileGlobs);

        await createTestApp(options);
        await runMetroServer({
            cwd: options.cwd,
            port: options.metroPort,
            testAppRoot: options.app,
            monoRepoRoot,
            jsAppRoot,
            testRunner,
            testAppUserModules: options.modules,
            resetCache: options.resetCache,
        });

        const shutdownNativePlatform = await runTestApp(options);

        await testRunner.reporter.waitForTests();
        await shutdownNativePlatform();

        process.exit(testRunner.reporter.didPass() ? 0 : 1);
    } catch (error) {
        console.error(error);
        process.exit(3);
    }
};

runTests(options, cli.input);
