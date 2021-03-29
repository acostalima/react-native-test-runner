// Inspired by and adapted from: https://github.com/react-native-community/cli/blob/master/packages/platform-ios/src/commands/runIOS

'use strict';

const path = require('path');
const os = require('os');
const execa = require('execa');
const ora = require('ora');
const isUUID = require('is-uuid');

const getSimulatorsList = () => {
    const { stderr: output } = execa.sync('xcrun', [
        'xctrace',
        'list',
        'devices',
    ]);
    const lines = output.split(os.EOL);

    for (let line = lines.shift(); line.match(/^== Simulators ==$/);) {
        line = lines.shift();
    }

    return lines.reduce((simulators, line) => {
        const simulator = line.match(
            /(.*?) (\(([0-9.]+)\) )?\(([0-9A-F-]+)\)/i,
        );

        if (!simulator) {
            return simulators;
        }

        const [, name, , version, udid] = simulator;

        if (!version) {
            return simulators;
        }

        return [...simulators, { name, version, udid }];
    }, []);
};

const findSimulatorById = (simulatorId) => {
    const simulators = getSimulatorsList();

    return simulators.find(({ udid }) => udid === simulatorId);
};

const getMatchingSimulators = (simulatorQuery) => {
    const { stdout: output } = execa.sync('xcrun', [
        'simctl',
        'list',
        '--json',
        'devices',
    ]);

    const knownSimulators = JSON.parse(output).devices;
    let inputSimulatorVersion;
    let inputSimulatorName;

    if (simulatorQuery) {
        const simulatorMatchResult = simulatorQuery.match(/([\w- ]+)(?:(?<= )\((\d+\.\d+)\))?/);

        if (simulatorMatchResult) {
            inputSimulatorName = simulatorMatchResult[1].trim();
            inputSimulatorVersion = simulatorMatchResult[2];
        }
    }

    const eligibleSimulators = Object.entries(knownSimulators).reduce(
        (eligibleSimulators, [versionDescriptor, simulatorsForVersion]) => {
            const version = versionDescriptor.replace(
                /^com\.apple\.CoreSimulator\.SimRuntime\.([^-]+)-([^-]+)-([^-]+)$/g,
                '$1 $2.$3',
            );

            if (!version.match(/iOS|tvOS/)) {
                return eligibleSimulators;
            }

            if (inputSimulatorVersion && !version.endsWith(inputSimulatorVersion)) {
                return eligibleSimulators;
            }

            return [
                ...eligibleSimulators,
                ...simulatorsForVersion.map((d) => ({ ...d, version })),
            ];
        },
        [],
    );

    return eligibleSimulators
        .filter((simulator) => {
            if (!simulator.isAvailable) {
                return false;
            }

            if (inputSimulatorName && simulator.name !== inputSimulatorName) {
                return false;
            }

            return true;
        })
        .map((simulator) => ({
            ...simulator,
            booted: simulator.state === 'Booted',
        }));
};

const getProjectSettings = ({ testAppRoot }) => {
    const xcodebuildArgs = [
        '-workspace',
        'Test.xcworkspace',
        '-configuration',
        'Debug',
        '-scheme',
        'Test',
        '-sdk',
        'iphonesimulator',
        '-showBuildSettings',
        '-json',
    ];

    const { stdout } = execa.sync('xcodebuild', xcodebuildArgs, {
        cwd: testAppRoot,
    });
    const projectSettings = JSON.parse(stdout);

    for (const { buildSettings } of projectSettings) {
        if (buildSettings.WRAPPER_EXTENSION !== 'app') {
            continue;
        }

        return {
            buildDirectory: buildSettings.TARGET_BUILD_DIR,
            appFileName: buildSettings.EXECUTABLE_FOLDER_PATH,
            infoPlistPath: buildSettings.PRODUCT_SETTINGS_PATH,
            binaryFilePath: path.join(
                buildSettings.TARGET_BUILD_DIR,
                buildSettings.EXECUTABLE_FOLDER_PATH,
            ),
            bundleId: buildSettings.PRODUCT_BUNDLE_IDENTIFIER,
        };
    }
};

const buildApp = async ({ testAppRoot, simulator, metroPort }) => {
    const xcodebuildArgs = [
        '-workspace',
        'Test.xcworkspace',
        '-configuration',
        'Debug',
        '-scheme',
        'Test',
        '-sdk',
        'iphonesimulator',
        '-destination',
        `id=${simulator.udid}`,
    ];
    const loader = ora();

    const buildProcess = execa('xcodebuild', xcodebuildArgs, {
        cwd: testAppRoot,
        env: {
            ...process.env,
            RCT_NO_LAUNCH_PACKAGER: true,
            // Defining the port at build time does not seem to work right now...
            // See: https://github.com/facebook/react-native/issues/9145#issuecomment-552599789
            RCT_METRO_PORT: `${metroPort}`,
        },
    });

    loader.start('Building iOS app');

    try {
        await buildProcess;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const shutdownSimulator = async (simulator) => {
    const process = execa('xcrun', ['simctl', 'shutdown', `${simulator.udid}`]);
    const loader = ora();

    try {
        loader.start(
            `Shutting down headless ${simulator.name} (${simulator.version}) simulator (${simulator.udid})`,
        );
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const bootHeadlessSimulator = async (simulatorQuery) => {
    if (isUUID.v4(simulatorQuery)) {
        const simulatorUUID = simulatorQuery;
        const simulator = findSimulatorById(simulatorUUID);

        if (!simulator) {
            throw new Error(`iOS simulator ${simulatorUUID} not found`);
        }

        simulatorQuery = `${simulator.name} (${simulator.version})`;
    }

    const simulators = getMatchingSimulators(simulatorQuery);

    if (simulatorQuery && simulators.length === 0) {
        throw new Error(`iOS simulator ${simulatorQuery} not found`);
    }

    if (simulatorQuery && simulators.length > 1) {
        const simulatorIds = simulators.map(({ udid }) => udid);

        throw new Error(`Found multiple iOS simulators matching query: ${simulatorIds.join(',')}`);
    }

    let simulator;

    if (simulatorQuery) {
        simulator = simulators[0];
    } else {
        const bootedSimulators = simulators.filter(({ booted }) => booted);
        const bootedSimulatorIds = bootedSimulators.map(({ udid }) => udid);

        if (bootedSimulators.length === 0) {
            throw new Error('Found no iOS simulators booted up');
        }

        if (bootedSimulators.length > 1) {
            throw new Error(`Found multiple iOS simulators booted up: ${bootedSimulatorIds.join(',')}`);
        }

        simulator = bootedSimulators[0];
    }

    const simulatorAlreadyBooted = simulator.booted;

    if (simulatorAlreadyBooted) {
        return {
            simulator,
            shutdown: () => Promise.resolve(),
        };
    }

    const loader = ora();

    loader.start(
        `Booting headless ${simulator.name} (${simulator.version}) simulator (${simulator.udid})`,
    );

    const process = execa('xcrun', ['simctl', 'boot', `${simulator.udid}`]);

    try {
        await process;
        loader.succeed();

        return {
            simulator,
            shutdown: () => shutdownSimulator(simulator),
        };
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const installApp = async ({ simulator, binaryFilePath, bundleId }) => {
    const process = execa('xcrun', [
        'simctl',
        'install',
        `${simulator.udid}`,
        binaryFilePath,
    ]);

    const loader = ora();

    try {
        loader.start(`Installing ${bundleId} (${binaryFilePath})`);
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const uninstallApp = async ({ simulator, bundleId }) => {
    const process = execa('xcrun', [
        'simctl',
        'uninstall',
        `${simulator.udid}`,
        bundleId,
    ]);

    const loader = ora();

    try {
        loader.start(`Uninstalling ${bundleId}`);
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const launchApp = async ({ simulator, bundleId }) => {
    const process = execa('xcrun', [
        'simctl',
        'launch',
        `${simulator.udid}`,
        bundleId,
    ]);

    const loader = ora();

    try {
        loader.start(`Launching ${bundleId}`);
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const terminateApp = async ({ simulator, bundleId }) => {
    const process = execa('xcrun', [
        'simctl',
        'terminate',
        `${simulator.udid}`,
        bundleId,
    ]);

    const loader = ora();

    try {
        loader.start(`Terminating ${bundleId}`);
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

const runPodInstall = async ({ testAppRoot }) => {
    const loader = ora();
    const process = execa('pod', ['install'], {
        cwd: testAppRoot,
    });

    loader.start('Installing Pods');

    try {
        await process;
        loader.succeed();
    } catch (error) {
        loader.fail();
        throw error;
    }
};

module.exports = async ({
    simulator: simulatorQuery,
    testAppRoot,
    metroPort,
}) => {
    const { shutdown: shutdownSimulator, simulator } = await bootHeadlessSimulator(simulatorQuery);

    await runPodInstall({ testAppRoot });
    await buildApp({ testAppRoot, simulator, metroPort });

    const { binaryFilePath, bundleId } = getProjectSettings({ testAppRoot });

    await installApp({ simulator, binaryFilePath, bundleId });
    await launchApp({ simulator, bundleId });

    return async () => {
        await terminateApp({ simulator, bundleId });
        await uninstallApp({ simulator, bundleId });
        await shutdownSimulator();
    };
};
