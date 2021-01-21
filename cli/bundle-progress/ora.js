'use strict';

const ora = require('ora');

class OraBundleProgressBar {
    loader = ora();

    constructor(testRunner) {
        this.testRunner = testRunner;
    }

    onStart() {
        this.loader.start(`Bundling JavaScript to execute tests with ${this.testRunner} test runner`);
    }

    onProgress(/* { transformedFileCount, totalFileCount } */) {}

    onSucceed() {
        this.loader.succeed();
    }

    onError({ error }) {
        this.loader.fail();
        console.error(error);
    }

    onFail() {
        this.loader.fail();
    }
}

module.exports = OraBundleProgressBar;
