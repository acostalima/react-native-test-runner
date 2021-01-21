'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');
const tempy = require('tempy');
const yn = require('yn');

const writeConfigFile = (options = {}) => {
    const tempFile = tempy.file({ name: 'zora-config.js' });

    options = {
        runOnly: yn(process.env.RUN_ONLY, { default: false }),
        indent: yn(process.env.INDENT, { default: false }),
        ...options,
    };

    fs.writeFileSync(tempFile, `module.exports = ${util.inspect(options)}`);

    return tempFile;
};

module.exports = () => ({
    toString: () => 'Zora',
    writeConfigFile,
    resolveNativeRunner: () => path.join(__dirname, 'rn-runner'),
    resolveNativeModule: (moduleName) => moduleName === 'zora' ? path.join(__dirname, 'rn-module') : null,
    transformTestOutput: (output) => output[0],
});

