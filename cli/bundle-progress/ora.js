'use strict';

const ora = require('ora');

class OraBundleProgressBar {
    loader = ora();

    onStart() {
        this.loader.start('Bundling JavaScript');
    }

    onProgress(/* { transformedFileCount, totalFileCount } */) {}

    onSucceed() {
        this.loader.succeed();
    }

    onError(error) {
        this.loader.fail();
        console.error(error);
    }

    onFail() {
        this.loader.fail();
    }
}

module.exports = OraBundleProgressBar;
