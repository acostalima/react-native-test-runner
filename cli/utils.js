'use strict';

const path = require('path');
const globby = require('globby');
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
        const isCwdParentOfFile = !relativePath.startsWith('..');

        if (!isCwdParentOfFile) {
            continue;
        }

        const filePathParts = filePath.split(path.sep);

        if (filePathParts.length === 1) {
            directories.add(cwd);

            break;
        }

        const commonParent = filePathParts.shift();

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

const findMonoRepoRoot = async (cwd) => {
    const rootPkgFilePath = await findUp('package.json', { cwd: path.resolve(cwd, '../..') });

    if (!rootPkgFilePath) {
        // Assume we're already at root
        return cwd;
    }

    return path.dirname(rootPkgFilePath);
};

module.exports = {
    expandGlobs,
    getCommonParentDirectories,
    findMonoRepoRoot,
};
