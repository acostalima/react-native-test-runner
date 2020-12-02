'use strict';

const createSignal = require('pico-signals');
const OraBundleProgress = require('./bundle-progress/ora');

const METRO_EVENTS = [
    'bundle_build_started',
    'bundle_transform_progressed',
    'bundle_build_done',
    'bundling_error',
    'client_log',
];

class TestReporter {
    progress = new OraBundleProgress();
    running = false;
    pass = null;
    doneSignal = createSignal();

    update(event) {
        if (!METRO_EVENTS.includes(event.type)) {
            return;
        }

        switch (event.type) {
        case 'bundle_build_started':
            this.pass = null;
            this.progress.onStart(event);
            break;
        case 'bundle_build_done':
            this.progress.onSucceed(event);
            break;
        case 'bundling_error':
            this.progress.onError(event.error);
            break;
        case 'bundle_build_failed': {
            this.progress.onFail(event);
            break;
        }
        case 'bundle_transform_progressed': {
            this.progress.onProgress(event);
            break;
        }
        case 'client_log':
            this.logTestResults(event.data[0]);
            break;
        default:
            break;
        }
    }

    async waitForTests() {
        if (this.pass !== null) {
            return Promise.resolve();
        }

        let removeSignal;

        await new Promise((resolve) => {
            removeSignal = this.doneSignal.add(resolve);
        });

        removeSignal();
    }

    logTestResults(data) {
        if (data.match(/^TAP version/)) {
            this.pass = null;
            this.running = true;
        }

        if (data === 'fail' || data === 'pass') {
            this.running = false;
            this.pass = data === 'pass';
            this.doneSignal.dispatch();

            return;
        }

        console.log(data);
    }
}

module.exports = TestReporter;
