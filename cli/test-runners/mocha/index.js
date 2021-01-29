'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');
const tempy = require('tempy');

const writeConfigModule = (options = {}) => {
    const tempFile = tempy.file({ name: 'mocha-config.js' });

    options = {
        allowUncaught: false,
        bail: true,
        reporter: 'spec',
        timeout: 5000,
        color: true,
        ui: 'bdd',
        ...options,
    };

    fs.writeFileSync(tempFile, `module.exports = ${util.inspect(options)}`);

    return tempFile;
};

const transformTestOutput = (output) => {
    if (!output[0]) {
        return '';
    }

    if (output.length === 1) {
        return output[0].replace(/\n$/, '');
    }

    return util.format(output[0], ...output.slice(1));
};

module.exports = () => ({
    toString: () => 'Mocha',
    writeConfigModule,
    resolveRunnerSetup: () => {},
    resolveRunner: () => path.join(__dirname, 'rn-runner'),
    transformTestOutput,
});
