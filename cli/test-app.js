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

const createTestApp = async ({
    reactNativeVersion = '0.63.4',
    appPath = path.join(os.homedir(), '.npm', 'rn-test-app'),
} = {}) => {
    const loader = ora();

    const removeApp = async () => {
        loader.start(`Removing test app at ${appPath}`);
        try {
            await rmdir(appPath, { recursive: true });
            loader.succeed();
        } catch (error) {
            loader.fail();
            throw error;
        }
    };

    let appPkg = null;

    try {
        appPkg = await readPkg({ cwd: appPath });
    } catch (error) {
        // Test app not installed
    }

    if (appPkg && semver.neq(reactNativeVersion, appPkg.dependencies['react-native'])) {
        await removeApp();
        appPkg = null;
    }

    if (appPkg) {
        return ({ removeApp, appPath });
    }

    try {
        await tempy.directory.task(async (reactNativeCliPath) => {
            loader.start(`Initializing npm package for React Native CLI at ${reactNativeCliPath}`);
            await execa('npm', ['init', '-y'], { cwd: reactNativeCliPath });
            loader.succeed();

            loader.start(`Installing React Native ${reactNativeVersion}`);
            await execa('npm', ['install', `react-native@${reactNativeVersion}`], { cwd: reactNativeCliPath });
            loader.succeed();

            loader.start(`Initializing test app with React Native ${reactNativeVersion} at ${appPath}`);
            await execa('npx', [
                'react-native', 'init', 'Test', '--npm', '--version', reactNativeVersion, '--directory', appPath, '--title', 'Test',
            ], { cwd: reactNativeCliPath });
            loader.succeed();
        });
    } catch (error) {
        loader.fail();
        throw error;
    }

    return ({
        removeApp,
        appPath,
    });
};

module.exports = {
    createTestApp,
};
