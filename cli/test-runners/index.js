'use strict';

const createSignal = require('pico-signals');
const { expandGlobs, writeTestSuiteEntryFile, getCommonParentDirectories } = require('../utils');
const OraBundleProgress = require('../bundle-progress/ora');

const METRO_EVENTS = [
    'bundle_build_started',
    'bundle_transform_progressed',
    'bundle_build_done',
    'bundling_error',
    'client_log',
];

const createTestReporter = (testRunner) => {
    const progress = new OraBundleProgress(testRunner);
    const doneSignal = createSignal();
    let running = false;
    let pass = null;

    // Metro's log reporter interface
    const update = (event) => {
        if (!METRO_EVENTS.includes(event.type)) {
            return;
        }

        switch (event.type) {
        case 'bundle_build_started':
            pass = null;
            progress.onStart(event);
            break;
        case 'bundle_build_done':
            running = true;
            progress.onSucceed(event);
            break;
        case 'bundling_error':
            progress.onError(event);
            break;
        case 'bundle_build_failed': {
            progress.onFail(event);
            break;
        }
        case 'bundle_transform_progressed': {
            progress.onProgress(event);
            break;
        }
        case 'client_log':
            handleClientLogEvent(event);
            break;
        default:
            break;
        }
    };

    const waitForTests = async () => {
        if (pass !== null) {
            return Promise.resolve();
        }

        let removeSignal;

        await new Promise((resolve) => {
            removeSignal = doneSignal.add(resolve);
        });

        removeSignal();
    };

    const handleClientLogEvent = ({ data }) => {
        let testOutput = data[0];

        if (testOutput === 'pass' || testOutput === 'fail') {
            running = false;
            pass = testOutput === 'pass';

            if (!pass && data[1]) {
                console.error(data[1]);
            }

            doneSignal.dispatch();

            return;
        }

        testOutput = testRunner.transformTestOutput(data);

        console.log(testOutput);
    };

    return ({
        update,
        didPass: () => pass,
        isRunning: () => running,
        waitForTests,
    });
};

module.exports = ({ cwd, runner }, testFileGlobs = []) => {
    const testFilePaths = expandGlobs(testFileGlobs.length === 0 ? ['**/test?(s)/**/?(*.)+(spec|test).js'] : testFileGlobs, cwd);
    const testSuiteFilePath = writeTestSuiteEntryFile(testFilePaths, cwd);
    const testDirectoryPaths = getCommonParentDirectories(testFilePaths, cwd);

    const createTestRunner = require(`./${runner}`);
    const testRunner = createTestRunner();
    const testReporter = createTestReporter(testRunner);

    return {
        reporter: testReporter,
        resolveTestSuite: () => ({ testSuiteFilePath, testDirectoryPaths }),
        ...testRunner,
    };
};