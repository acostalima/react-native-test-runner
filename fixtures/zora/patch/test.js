/* eslint-disable no-undef */

'use strict';

const { test } = require('zora');

function createBlobReader(blob) {
    const reader = new FileReader();
    const fileReaderReady = new Promise((resolve, reject) => {
        reader.onload = function () {
            resolve(reader.result);
        };
        reader.onerror = function () {
            reject(reader.error);
        };
    });

    return {
        readAsArrayBuffer: async () => {
            reader.readAsArrayBuffer(blob);

            return fileReaderReady;
        },
        readAsText: async () => {
            reader.readAsText(blob);

            return fileReaderReady;
        },
    };
}

test('FormData patch works', (t) => {
    /* eslint-disable-next-line no-undef */
    t.ok(typeof FormData.prototype.set === 'function');
});

test('FileReader.readAsArrayBuffer patch works', async (t) => {
    const blob = new Blob(['foo']);

    t.ok(await createBlobReader(blob).readAsArrayBuffer());
});
