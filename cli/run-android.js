// Inspired by and adapted from:
// - https://github.com/react-native-community/cli/tree/master/packages/platform-android/src/commands/runAndroid

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const execa = require('execa');
const pRetry = require('p-retry');
const ora = require('ora');
const processExists = require('process-exists');

const ADB_PATH = process.env.ANDROID_HOME ?
    `${process.env.ANDROID_HOME}/platform-tools/adb` :
    'adb';
const EMULATOR_PATH = process.env.ANDROID_HOME ?
    `${process.env.ANDROID_HOME}/emulator/emulator` :
    'emulator';

const getEmulators = () => {
    const { stdout: emulators } = execa.sync(EMULATOR_PATH, ['-list-avds']);

    return emulators.split(os.EOL).filter(Boolean);
};

const terminateApp = async ({ packageName }) => {
    const adbArgs = ['shell', 'pm', 'clear', '-n', `${packageName}`];
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

const launchApp = async ({ packageName, mainActivity }) => {
    const adbArgs = [
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

const uninstallApp = async ({ packageName }) => {
    const process = execa('adb', [
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

const buildApk = async ({ projectPath, metroPort }) => {
    const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const buildProcess = execa(
        `${gradle}`,
        // -PreactNativeDevServerPort works great!
        // https://github.com/facebook/react-native/pull/23616
        // https://github.com/react-native-community/cli/pull/421/files
        ['assembleDebug', `-PreactNativeDevServerPort=${metroPort}`],
        { cwd: projectPath },
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

const getDevices = () => {
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

const findBootedEmulator = () => {
    const devices = getDevices();

    for (const { id, booted } of devices) {
        if (id.startsWith('emulator') && booted) {
            return id;
        }
    }

    return null;
};

const bootHeadlessEmulator = async ({ emulator }) => {
    const emulatorId = findBootedEmulator();

    if (emulatorId) {
        return { emulatorId, shutdown: () => Promise.resolve() };
    }

    const emulators = getEmulators();

    if (!emulators.includes(emulator)) {
        throw new Error(`Android emulator ${emulator} not found`);
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
            stdio: 'ignore',
        },
    );

    subprocess.unref();

    const retriableBootCheck = pRetry(
        () => {
            const emulatorId = findBootedEmulator();

            if (!emulatorId) {
                return Promise.reject(
                    new Error(`Android emulator ${emulator} did not boot`),
                );
            }

            loader.succeed(
                `Booting headless ${emulator} emulator (${emulatorId})`,
            );

            return ({
                emulatorId,
                shutdown: createKillSubprocess(emulatorId),
            });
        },
        {
            onFailedAttempt: (error) => {
                if (error.retriesLeft === 0) {
                    loader.fail();
                }
            },
            retries: 3,
            factor: 2,
            minTimeout: 3000,
            maxTimeout: 15000,
        },
    );

    const createKillSubprocess = (emulatorId) => async () => {
        loader.start(
            `Shutting down headless ${emulator} emulator (${emulatorId})`,
        );

        subprocess.kill('SIGTERM', { forceKillAfterTimeout: 5000 });

        try {
            await pRetry(
                async () => {
                    if (await processExists(subprocess.pid)) {
                        return Promise.reject(
                            new Error(
                                `Android emulator ${emulator} (${emulatorId}) did not shutdown`,
                            ),
                        );
                    }
                },
                {
                    retries: 3,
                    factor: 2,
                    minTimeout: 3000,
                    maxTimeout: 15000,
                },
            );
            loader.succeed();
        } catch (error) {
            loader.fail();
            throw error;
        }
    };

    return Promise.race([
        new Promise((resolve, reject) => {
            process.on('error', (error) => {
                loader.fail();

                reject(error);
            });
        }),
        retriableBootCheck,
    ]);
};

const getProjectSettings = ({ projectPath }) => {
    const manifestPath = path.join(
        projectPath,
        'app',
        'src',
        'main',
        'AndroidManifest.xml',
    );
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    const packageNameMatchResult = manifest.match(/package="(.+)"/);
    const [, packageName] = packageNameMatchResult;

    const buildDirectory = path.join(
        projectPath,
        'app',
        'build',
        'outputs',
        'apk',
        'debug',
    );

    const stringsPath = path.join(
        projectPath,
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

module.exports = async ({ emulator, projectPath, metroPort }) => {
    const { apkFilePath, mainActivity, packageName } = getProjectSettings({
        projectPath,
    });
    const {
        emulatorId,
        shutdown: shutdownEmulator,
    } = await bootHeadlessEmulator({ emulator });

    await buildApk({ projectPath, metroPort });
    await installApp({ emulatorId, apkFilePath });
    await launchApp({ mainActivity, packageName });

    return async () => {
        await terminateApp({ packageName });
        await uninstallApp({ packageName });
        await shutdownEmulator();
    };
};
