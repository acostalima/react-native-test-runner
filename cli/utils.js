'use strict';

const fs = require('fs');
const path = require('path');
const globby = require('globby');
const tempy = require('tempy');

const findTestFiles = (globPatterns = []) => {
    if (globPatterns.length === 0) {
        globPatterns = ['**/test?(s)/**/?(*.)+(spec|test).js'];
    }

    const files = globby.sync(globPatterns, { ignore: ['node_modules', '.git'] });

    // console.log(`Test file globs: ${globPatterns}`);
    // console.log('Expanded test file paths:');
    // console.log(`${files.map((file) => `   - ${file}`).join('\n')}`);

    return files;
};

const writeTestSuiteEntryFile = (testFiles, cwd) => {
    const tempFile = tempy.file({
        name: 'suite.js',
    });
    const requires = testFiles
        .map((file) => `require('${path.resolve(cwd, file)}');`)
        .join('\n');

    fs.writeFileSync(tempFile, requires);

    return tempFile;
};

// Cwd: .
// test-suite-1/test.js
// test-suite-1/foo/test.js
// test-suite-1/foo/bar/test.js
// test-suite-2/test.js
// test-suite-2/foo/test.js
// test-suite-2/foo/bar/test.js
// /test/test-suite-3/foo/bar/test.js
// => [./test-suite-1, ./test-suite-2]
const getCommonParentDirectories = (files, cwd) => {
    const directories = new Set();

    for (const file of files) {
        const absolutePath = path.resolve(cwd, file);
        const relativePath = path.relative(cwd, absolutePath);
        const isCwd = relativePath.length === 0;
        const isCwdParentOfFile = !relativePath.startsWith('..');

        if (!isCwdParentOfFile) {
            continue;
        }

        if (isCwd) {
            directories.add(cwd);

            return Array.from(directories);
        }

        const commonParent = file.split(path.sep).shift();

        directories.add(path.join(cwd, commonParent));
    }

    return Array.from(directories);
};

module.exports = {
    findTestFiles,
    writeTestSuiteEntryFile,
    getCommonParentDirectories,
};
