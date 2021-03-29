// Inspired by and adapted from: https://github.com/react-native-community/cli/tree/master/packages/platform-android/src/commands/runAndroid

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const execa = require('execa');
const pRetry = require('p-retry');
const pTap = require('p-tap');
const ora = require('ora');

const ADB_PATH = process.env.ANDROID_HOME ?
    `${process.env.ANDROID_HOME}/platform-tools/adb` :
    'adb';
const EMULATOR_PATH = process.env.ANDROID_HOME ?
    `${process.env.ANDROID_HOME}/emulator/emulator` :
    'emulator';

const getEmulatorsList = () => {
    const { stdout: emulators } = execa.sync(EMULATOR_PATH, ['-list-avds']);

    return emulators.split(os.EOL).filter(Boolean);
};

const terminateApp = async ({ emulatorId, packageName }) => {
    const adbArgs = ['-s', emulatorId, 'shell', 'pm', 'clear', '-n', `${packageName}`];
    const process = execa(ADB_PATH, adbArgs);
    const loader = ora();

    loader.start(`Terminating ${packageName}`);

    try {
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const launchApp = async ({ emulatorId, packageName, mainActivity }) => {
    const adbArgs = [
        '-s',
        emulatorId,
        'shell',
        'am',
        'start',
        '-n',
        `${packageName}/${mainActivity}`,
    ];
    const process = execa(ADB_PATH, adbArgs);
    const loader = ora();

    loader.start(`Launching ${packageName}`);

    try {
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const installApp = async ({ emulatorId, apkFilePath }) => {
    const adbArgs = ['-s', emulatorId, 'install', '-r', '-d', apkFilePath];
    const process = execa(ADB_PATH, adbArgs);
    const loader = ora();

    loader.start(`Installing ${apkFilePath} on ${emulatorId}`);

    try {
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const uninstallApp = async ({ emulatorId, packageName }) => {
    const process = execa('adb', [
        '-s',
        emulatorId,
        'uninstall',
        packageName,
    ]);

    const loader = ora();

    try {
        loader.start(`Uninstalling ${packageName}`);
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const buildApk = async ({ testAppRoot, metroPort }) => {
    const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const buildProcess = execa(
        `${gradle}`,
        // -PreactNativeDevServerPort works great!
        // https://github.com/facebook/react-native/pull/23616
        // https://github.com/react-native-community/cli/pull/421/files
        ['assembleDebug', `-PreactNativeDevServerPort=${metroPort}`],
        { cwd: testAppRoot },
    );
    const loader = ora();

    loader.start('Building Android app');

    try {
        await buildProcess;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const getConnectedDevices = () => {
    const { stdout: output } = execa.sync(ADB_PATH, ['devices']);
    const lines = output.split(os.EOL);

    return lines.reduce((devices, line) => {
        const result = line.split(/[ \t]+/).filter(Boolean);

        if (result.length !== 2) {
            return devices;
        }

        const id = result[0];
        const booted = result[1] === 'device';

        return [...devices, { id, booted }];
    }, []);
};

const didEmulatorBootCompleted = (emulatorId) => {
    const { stdout: output } = execa.sync(ADB_PATH, ['-s', emulatorId, 'shell', 'getprop', 'sys.boot_completed']);
    const lines = output.split(os.EOL);

    return lines.reduce((bootCompleted, line) => {
        line = line.trim();

        if (line.length > 1) {
            return bootCompleted;
        }

        return line === '1';
    }, false);
};

const getBootedEmulators = () => {
    const devices = getConnectedDevices();

    return devices.filter(({ id, booted }) => id.startsWith('emulator') && booted).map(({ id }) => id).sort();
};

const createEmulatorShutdown = (emulator, emulatorId) => async () => {
    const loader = ora();

    loader.start(
        `Shutting down headless AVD ${emulator} (${emulatorId})`,
    );

    try {
        execa.sync(ADB_PATH, ['-s', emulatorId, 'emu', 'kill']);

        await pRetry(
            async () => {
                const bootedEmulatorIds = getBootedEmulators();
                const didEmulatorShutdown = !bootedEmulatorIds.includes(emulatorId);

                if (!didEmulatorShutdown) {
                    return Promise.reject(
                        new Error(
                            `Android AVD ${emulator} (${emulatorId}) did not shutdown`,
                        ),
                    );
                }
            },
            {
                retries: 5,
                factor: 2,
                minTimeout: 10000,
            },
        );

        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const isAvdAlreadyRunning = ({ stdout: output, exitCode }) => {
    if (exitCode === 0) {
        return false;
    }

    const errorMsg = output.split(os.EOL).shift();

    return !!errorMsg.match(/emulator: ERROR: Running multiple emulators with the same AVD is an experimental feature./);
};

const bootHeadlessEmulator = async ({ emulator }) => {
    const bootedEmulatorIds = getBootedEmulators();

    if (!emulator) {
        if (bootedEmulatorIds.length > 1) {
            throw new Error(`Found more than one Android emulator booted up: ${bootedEmulatorIds.join(',')}`);
        }

        if (bootedEmulatorIds.length === 0) {
            throw new Error('Found no Android emulators booted up');
        }

        return {
            emulatorId: bootedEmulatorIds.shift(),
            shutdown: () => Promise.resolve(),
        };
    }

    const emulators = getEmulatorsList();

    if (!emulators.includes(emulator)) {
        throw new Error(`Android AVD ${emulator} not found`);
    }

    const loader = ora();

    loader.start(`Booting headless ${emulator} emulator`);

    const subprocess = execa(
        EMULATOR_PATH,
        [
            '-no-window',
            '-no-audio',
            '-no-snapshot-save',
            '-no-boot-anim',
            '-gpu',
            'swiftshader_indirect',
            `@${emulator}`,
        ],
        {
            detached: true,
        },
    );

    const retriableBootCompleteCheck = pRetry(
        async () => {
            const currentlyBootedEmulatorIds = getBootedEmulators();
            const emulatorStarted = currentlyBootedEmulatorIds.length > bootedEmulatorIds.length;

            if (!emulatorStarted) {
                return Promise.reject(
                    new Error(`Android AVD ${emulator} did not start`),
                );
            }

            const emulatorId = currentlyBootedEmulatorIds.pop();
            const emulatorBootCompleted = didEmulatorBootCompleted(emulatorId);

            if (!emulatorBootCompleted) {
                return Promise.reject(
                    new Error(`Android AVD ${emulator} boot is yet to complete`),
                );
            }

            loader.succeed(
                `Booting Android headless AVD ${emulator} (${emulatorId})`,
            );

            return ({
                emulatorId,
                shutdown: createEmulatorShutdown(emulator, emulatorId),
            });
        },
        {
            onFailedAttempt: (error) => {
                if (error.retriesLeft === 0) {
                    loader.fail();
                }
            },
            retries: 5,
            factor: 2,
            minTimeout: 10000,
        },
    );

    return Promise.race([
        subprocess.catch((error) => {
            loader.fail();

            if (isAvdAlreadyRunning(error)) {
                throw new Error(`Android emulator with AVD ${emulator} is already running`);
            }

            throw error;
        }),
        retriableBootCompleteCheck.catch(pTap.catch(() => loader.fail())),
    ]);
};

const getProjectSettings = ({ testAppRoot }) => {
    const manifestPath = path.join(
        testAppRoot,
        'app',
        'src',
        'main',
        'AndroidManifest.xml',
    );
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    const packageNameMatchResult = manifest.match(/package="(.+)"/);
    const [, packageName] = packageNameMatchResult;

    const buildDirectory = path.join(
        testAppRoot,
        'app',
        'build',
        'outputs',
        'apk',
        'debug',
    );

    const stringsPath = path.join(
        testAppRoot,
        'app',
        'src',
        'main',
        'res',
        'values',
        'strings.xml',
    );
    const strings = fs.readFileSync(stringsPath, 'utf8');
    const appNameMatchRsult = strings.match(
        /<string name="app_name">(.+)<\/string>/,
    );
    const [, appName] = appNameMatchRsult;

    return {
        appName,
        packageName,
        manifestPath,
        buildDirectory,
        apkFilePath: path.join(buildDirectory, 'app-debug.apk'),
        mainActivity: `${packageName}.MainActivity`,
    };
};

module.exports = async ({ emulator, testAppRoot, metroPort }) => {
    const { apkFilePath, mainActivity, packageName } = getProjectSettings({
        testAppRoot,
    });
    const {
        emulatorId,
        shutdown: shutdownEmulator,
    } = await bootHeadlessEmulator({ emulator });

    await buildApk({ testAppRoot, metroPort });
    await installApp({ emulatorId, apkFilePath });
    await launchApp({ emulatorId, mainActivity, packageName });

    return async () => {
        await terminateApp({ emulatorId, packageName });
        await uninstallApp({ emulatorId, packageName });
        await shutdownEmulator();
    };
};
