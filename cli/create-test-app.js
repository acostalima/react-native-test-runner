'use strict';

const path = require('path');
const { promisify } = require('util');
const fs = require('fs-extra');
const tempy = require('tempy');
const execa = require('execa');
const ora = require('ora');
const readPkg = require('read-pkg');
const semver = require('semver');

const rmdir = promisify(fs.rmdir);

const installModules = async (loader, testAppRoot, modules) => {
    if (modules.length === 0) {
        return;
    }

    loader.start('Installing user modules in the test app');
    await execa('npm', ['install', ...modules], { cwd: testAppRoot });
    loader.succeed();
};

const getModulesToInstall = (appPkg, modules) => modules.filter((module) => {
    const isAlreadyInstalled = !!appPkg.dependencies[module];

    return !isAlreadyInstalled;
});

const applyPatches = (loader, testAppRoot, patches) => {
    if (patches.length === 0) {
        return;
    }

    patches.forEach(({ path: patchFilePath, cwd = testAppRoot }) => {
        patchFilePath = path.resolve(cwd, patchFilePath);

        loader.start(`Applying patch ${patchFilePath}`);
        try {
            execa.sync('git', ['apply', '--ignore-whitespace', patchFilePath], { cwd });
            loader.succeed();
        } catch (error) {
            if (error.stderr.match(/^error: patch failed:/)) {
                loader.warn(`Patch failed: ${patchFilePath}. Proceeding anyway`);
            } else {
                loader.fail();
                throw error;
            }
        }
    });
};

module.exports = async ({
    rn: reactNativeVersion = '0.63.4',
    app: testAppRoot,
    modules = [],
    patches = [],
} = {}) => {
    const loader = ora();

    const removeTestApp = async () => {
        loader.start(`Removing test app at ${testAppRoot}`);
        try {
            await rmdir(testAppRoot, { recursive: true });
            loader.succeed();
        } catch (error) {
            loader.fail();
            throw error;
        }
    };

    let appPkg = null;

    try {
        appPkg = await readPkg({ cwd: testAppRoot });
    } catch (error) {
        // Test app not installed
    }

    if (appPkg && semver.neq(reactNativeVersion, appPkg.dependencies['react-native'])) {
        await removeTestApp();
        appPkg = null;
    }

    if (appPkg) {
        const modulesToInstall = getModulesToInstall(appPkg, modules);

        await installModules(loader, testAppRoot, modulesToInstall);
        await applyPatches(loader, testAppRoot, patches);

        return { removeTestApp };
    }

    try {
        await tempy.directory.task(async (reactNativeCliPkgPath) => {
            loader.start(`Initializing React Native CLI at ${reactNativeCliPkgPath}`);
            await execa('npm', ['init', '-y'], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            loader.start(`Installing React Native ${reactNativeVersion}`);
            await execa('npm', ['install', `react-native@${reactNativeVersion}`], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            loader.start(`Initializing test app with React Native ${reactNativeVersion} at ${testAppRoot}`);
            await execa('npx', [
                'react-native', 'init', 'Test', '--npm', '--version', reactNativeVersion, '--directory', testAppRoot, '--title', 'Test',
            ], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            await installModules(loader, testAppRoot, modules);
            await applyPatches(loader, testAppRoot, patches);
        });
    } catch (error) {
        loader.fail();

        await removeTestApp();

        throw error;
    }

    return { removeTestApp };
};
