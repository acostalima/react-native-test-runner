'use strict';

const path = require('path');
const fs = require('fs-extra');
const globby = require('globby');
const tempy = require('tempy');
const findUp = require('find-up');

const expandGlobs = (cwd, globPatterns) => {
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

const writeTestSuiteEntryFile = (cwd, testFilePaths, { preloadModulePath } = {}) => {
    const tempFile = tempy.file({
        name: 'test-suite.js',
    });
    const testSuite = [preloadModulePath, ...testFilePaths]
        .filter(Boolean)
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
const getCommonParentDirectories = (cwd, filePaths) => {
    const directories = new Set();

    for (const filePath of filePaths) {
        const absolutePath = path.resolve(cwd, filePath);
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

        const commonParent = filePath.split(path.sep).shift();

        directories.add(path.join(cwd, commonParent));
    }

    return Array.from(directories);
};

// Typical mono repo structure:
// .
// ├── node_modules
// └── packages
//     ├── foo
//     │   └── node_modules
//     └── bar
//         └── node_modules

const findMonoRepoRoot = (cwd) => {
    const rootPkgFilePath = findUp.sync('package.json', { cwd: path.resolve(cwd, '../..') });

    if (!rootPkgFilePath) {
        // Assume we're already at root
        return cwd;
    }

    return path.dirname(rootPkgFilePath);
};

module.exports = {
    expandGlobs,
    writeTestSuiteEntryFile,
    getCommonParentDirectories,
    findMonoRepoRoot,
};
