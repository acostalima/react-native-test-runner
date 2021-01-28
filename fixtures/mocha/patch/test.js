/* eslint-disable no-undef */

'use strict';

const { expect } = require('chai');

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

it('FormData.set patch works', () => {
    /* eslint-disable-next-line no-undef */
    expect(FormData.prototype.set).to.be.a('function');
});

it('FileReader.readAsArrayBuffer patch works', async () => {
    const blob = new Blob(['foo']);

    expect(await createBlobReader(blob).readAsArrayBuffer()).not.to.be.an('undefined');
});
