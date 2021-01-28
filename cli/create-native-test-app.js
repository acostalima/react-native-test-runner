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

const installNativeModules = async (loader, appPath, modules) => {
    if (modules.length === 0) {
        return;
    }

    loader.start('Installing dependencies with native modules in test app');
    await execa('npm', ['install', ...modules], { cwd: appPath });
    loader.succeed();
};

const getNativeModulesToInstall = (appPkg, modules) => modules.filter((module) => {
    const isAlreadyInstalled = !!appPkg.dependencies[module];

    return !isAlreadyInstalled;
});

const applyPatches = async (cwd, loader, appPath, patches) => {
    if (patches.length === 0) {
        return;
    }

    loader.start('Applying patches to test app');
    await Promise.all(patches.map((patch) => {
        patch = path.resolve(cwd, patch);

        return execa('git', ['apply', '--ignore-whitespace', patch], { cwd: appPath });
    }));
    loader.succeed();
};

module.exports = async ({
    cwd,
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
        await applyPatches(cwd, loader, nativeTestAppRoot, patches);

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
            await applyPatches(cwd, loader, nativeTestAppRoot, patches);
        });
    } catch (error) {
        loader.fail();

        await removeNativeTestApp();

        throw error;
    }

    return { nativeTestAppRoot, removeNativeTestApp };
};
