// Inspired by and adapted from:
// - https://github.com/react-native-community/cli/blob/c09733ad85ec79b6f0475cd5b0237a6fa20bbaac/packages/cli/src/commands/start/runServer.ts
// - https://github.com/react-native-community/cli/blob/c09733ad85ec79b6f0475cd5b0237a6fa20bbaac/packages/cli/src/tools/loadMetroConfig.ts
// - https://github.com/react-native-community/cli/blob/c09733ad85ec79b6f0475cd5b0237a6fa20bbaac/packages/cli/src/tools/metroPlatformResolver.ts
// - https://github.com/facebook/metro/blob/master/packages/metro-config/src/loadConfig.js
// - https://github.com/facebook/metro/blob/master/packages/metro-config/src/defaults/index.js

'use strict';

const path = require('path');
const { promisify } = require('util');
const ora = require('ora');
const metro = require('metro');
const isCI = require('is-ci');
const { mergeConfig, getDefaultConfig } = require('metro-config');
const metroResolver = require('metro-resolver');
const {
    createDevServerMiddleware,
} = require('@react-native-community/cli-server-api');
const TestReporter = require('./test-reporter');
const {
    writeTestSuiteEntryFile,
    findTestFiles,
    getCommonParentDirectories,
} = require('./utils');
const writeZoraConfigFile = require('./test-runners/zora/config');

const INTERNAL_CALLSITES_REGEX = new RegExp(
    [
        '/Libraries/Renderer/implementations/.+\\.js$',
        '/Libraries/BatchedBridge/MessageQueue\\.js$',
        '/Libraries/YellowBox/.+\\.js$',
        '/Libraries/LogBox/.+\\.js$',
        '/Libraries/Core/Timers/.+\\.js$',
        '/node_modules/react-devtools-core/.+\\.js$',
        '/node_modules/react-refresh/.+\\.js$',
        '/node_modules/scheduler/.+\\.js$',
    ].join('|'),
);

const resolveModule = (moduleName) => {
    if (moduleName === './index') {
        return './app';
    }

    if (moduleName === 'zora') {
        return path.join(__dirname, 'test-runners', 'zora', 'setup');
    }

    return moduleName;
};

const getConfig = ({ cwd = process.cwd(), testFileGlobs, port = 8081 } = {}) => {
    const reactNativePath = path.dirname(require.resolve('react-native'));
    const reporter = new TestReporter();
    const projectRoot = path.join(__dirname, '..');
    const testFiles = findTestFiles(testFileGlobs);
    const testSuiteFilePath = writeTestSuiteEntryFile(testFiles, cwd);
    const testDirectories = getCommonParentDirectories(testFiles, cwd);
    const zoraConfigFilePath = writeZoraConfigFile();

    return {
        resolver: {
            useWatchman: !isCI,
            extraNodeModules: {
                suite: testSuiteFilePath,
                config: zoraConfigFilePath,
            },
            resolverMainFields: ['react-native', 'browser', 'main'],
            platforms: ['ios', 'android', 'native'],
            resolveRequest: (context, realModuleName, platform, moduleName) => {
                moduleName = resolveModule(moduleName);

                const originalResolveRequest = context.resolveRequest;

                delete context.resolveRequest;

                try {
                    return metroResolver.resolve(context, moduleName, platform);
                } finally {
                    context.resolveRequest = originalResolveRequest;
                }
            },
        },
        serializer: {
            getModulesRunBeforeMainModule: () => [
                require.resolve(
                    path.join(
                        reactNativePath,
                        'Libraries',
                        'Core',
                        'InitializeCore',
                    ),
                ),
            ],
            getPolyfills: () =>
                require(path.join(reactNativePath, 'rn-get-polyfills'))(),
        },
        server: {
            port,
            runInspectorProxy: false,
            useGlobalHotkey: false,
        },
        symbolicator: {
            customizeFrame: (frame) => {
                const collapse = Boolean(
                    frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file),
                );

                return { collapse };
            },
        },
        transformer: {
            babelTransformerPath: require.resolve(
                'metro-react-native-babel-transformer',
            ),
            assetRegistryPath: path.join(
                reactNativePath,
                'Libraries',
                'Image',
                'AssetRegistry',
            ),
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: false,
                },
            }),
        },
        projectRoot,
        watchFolders: [
            projectRoot,
            path.dirname(testSuiteFilePath),
            path.dirname(zoraConfigFilePath),
            ...testDirectories,
        ],
        reporter,
        // resetCache: isCI,
    };
};

const runServer = async (options) => {
    const loader = ora();
    const defaultConfig = await getDefaultConfig();
    const config = mergeConfig(defaultConfig, getConfig(options));

    const { middleware } = createDevServerMiddleware({
        host: '',
        port: config.server.port,
        watchFolders: config.watchFolders,
    });

    const customEnhanceMiddleware = config.server.enhanceMiddleware;

    config.server.enhanceMiddleware = (metroMiddleware, server) => {
        if (customEnhanceMiddleware) {
            metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
        }

        return middleware.use(metroMiddleware);
    };

    const server = await metro.runServer(config, {
        hmrEnabled: true,
    });

    const closeServer = async () => {
        try {
            loader.start('Closing Metro server');
            await promisify(server.close).call(server);
            loader.succeed();
        } catch (error) {
            loader.fail();
        }
    };

    return { closeServer, testReporter: config.reporter };
};

module.exports = runServer;
module.exports.getConfig = getConfig;
