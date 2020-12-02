'use strict';

const fs = require('fs');
const tempy = require('tempy');
const yn = require('yn');

const writeConfigFile = () => {
    const tempFile = tempy.file({
        name: 'zora-config.js',
    });

    fs.writeFileSync(tempFile, `
global.zora = {
    runOnly: ${yn(process.env.RUN_ONLY, { default: false })},
    indent: ${yn(process.env.INDENT, { default: false })}
};`,
    );

    return tempFile;
};

module.exports = writeConfigFile;
