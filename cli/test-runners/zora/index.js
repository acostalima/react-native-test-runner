'use strict';

const path = require('path');
const util = require('util');
const fs = require('fs');
const tempy = require('tempy');
const yn = require('yn');

const writeConfigModule = (options = {}) => {
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
    writeConfigModule,
    resolveRunner: () => path.join(__dirname, 'rn-runner'),
    resolveRunnerSetup: (moduleName) => moduleName === 'zora' ? path.join(__dirname, 'harness') : undefined,
    transformTestOutput: (output) => output[0],
});

