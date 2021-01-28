'use strict';

const path = require('path');
const os = require('os');
const { promisify } = require('util');
const fs = require('fs-extra');
const tempy = require('tempy');
const execa = require('execa');
const ora = require('ora');
const readPkg = require('read-pkg');
const semver = require('semver');

const rmdir = promisify(fs.rmdir);

const installNativeModules = async (loader, nativeTestAppRoot, modules) => {
    if (modules.length === 0) {
        return;
    }

    loader.start('Installing dependencies with native modules in test app');
    await execa('npm', ['install', ...modules], { cwd: nativeTestAppRoot });
    loader.succeed();
};

const getNativeModulesToInstall = (appPkg, modules) => modules.filter((module) => {
    const isAlreadyInstalled = !!appPkg.dependencies[module];

    return !isAlreadyInstalled;
});

const applyPatches = (loader, nativeTestAppRoot, patches) => {
    if (patches.length === 0) {
        return;
    }

    patches.forEach(({ path: patchFilePath, cwd = nativeTestAppRoot }) => {
        patchFilePath = path.resolve(cwd, patchFilePath);

        loader.start(`Applying patch to test app: ${patchFilePath}`);
        try {
            execa.sync('git', ['apply', '--ignore-whitespace', patchFilePath], { cwd });
            loader.succeed();
        } catch (error) {
            if (error.message.match(/^error: patch failed:/)) {
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
    nativeTestAppRoot = path.join(os.homedir(), '.npm', 'rn-test-app'),
    nativeModules = [],
    patches = [],
} = {}) => {
    const loader = ora();

    const removeNativeTestApp = async () => {
        loader.start(`Removing test app at ${nativeTestAppRoot}`);
        try {
            await rmdir(nativeTestAppRoot, { recursive: true });
            loader.succeed();
        } catch (error) {
            loader.fail();
            throw error;
        }
    };

    let appPkg = null;

    try {
        appPkg = await readPkg({ cwd: nativeTestAppRoot });
    } catch (error) {
        // Test app not installed
    }

    if (appPkg && semver.neq(reactNativeVersion, appPkg.dependencies['react-native'])) {
        await removeNativeTestApp();
        appPkg = null;
    }

    if (appPkg) {
        const modulesToInstall = getNativeModulesToInstall(appPkg, nativeModules);

        await installNativeModules(loader, nativeTestAppRoot, modulesToInstall);
        await applyPatches(loader, nativeTestAppRoot, patches);

        return { nativeTestAppRoot, removeNativeTestApp };
    }

    try {
        await tempy.directory.task(async (reactNativeCliPkgPath) => {
            loader.start(`Initializing npm package for React Native CLI at ${reactNativeCliPkgPath}`);
            await execa('npm', ['init', '-y'], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            loader.start(`Installing React Native ${reactNativeVersion}`);
            await execa('npm', ['install', `react-native@${reactNativeVersion}`], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            loader.start(`Initializing test app with React Native ${reactNativeVersion} at ${nativeTestAppRoot}`);
            await execa('npx', [
                'react-native', 'init', 'Test', '--npm', '--version', reactNativeVersion, '--directory', nativeTestAppRoot, '--title', 'Test',
            ], { cwd: reactNativeCliPkgPath });
            loader.succeed();

            await installNativeModules(loader, nativeTestAppRoot, nativeModules);
            await applyPatches(loader, nativeTestAppRoot, patches);
        });
    } catch (error) {
        loader.fail();

        await removeNativeTestApp();

        throw error;
    }

    return { nativeTestAppRoot, removeNativeTestApp };
};
