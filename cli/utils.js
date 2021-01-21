'use strict';

const path = require('path');
const fs = require('fs-extra');
const globby = require('globby');
const tempy = require('tempy');

const expandGlobs = (globPatterns = [], cwd = process.cwd()) => {
    const filePaths = globby.sync(globPatterns, {
        cwd,
        ignore: [
            'node_modules',
            '.git',
            'coverage',
            '**/test?(s)/**/fixture?(s)/**/*',
            '**/__tests__/**/__fixture?(s)__/**/*',
        ],
    });

    // console.log(`Test file globs: ${globPatterns}`);
    // console.log('Expanded test file paths:');
    // console.log(`${filePaths.map((file) => `   - ${file}`).join('\n')}`);

    return filePaths;
};

const writeTestSuiteEntryFile = (testFilePaths, cwd = process.cwd()) => {
    const tempFile = tempy.file({
        name: 'test-suite.js',
    });
    const testSuite = testFilePaths
        .map((file) => `require('${path.resolve(cwd, file)}');`)
        .join('\n');

    fs.writeFileSync(tempFile, testSuite);

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
const getCommonParentDirectories = (files, cwd = process.cwd()) => {
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
    expandGlobs,
    writeTestSuiteEntryFile,
    getCommonParentDirectories,
};
