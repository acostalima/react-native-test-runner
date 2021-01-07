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
const isCI = require('is-ci');
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

const getDependencyModules = (testAppPath) => {
    const testAppModulesPath = path.join(testAppPath, 'node_modules');
    const reactNativePath = path.join(testAppModulesPath, 'react-native');

    return {
        metroModules: {
            core: require(path.join(testAppModulesPath, 'metro')),
            resolver: require(path.join(testAppModulesPath, 'metro-resolver')),
            createModuleIdFactory: require(path.join(testAppModulesPath, 'metro', 'src', 'lib', 'createModuleIdFactory')),
            asyncRequireModulePath: path.join(testAppModulesPath, 'metro-runtime', 'src', 'modules', 'asyncRequire'),
            babelTransformerPath: path.join(testAppModulesPath, 'metro-react-native-babel-transformer'),
            workerPath: path.join(testAppModulesPath, 'metro', 'src', 'DeltaBundler', 'Worker'),
            minifierPath: path.join(testAppModulesPath, 'metro-minify-uglify'),
            assetRegistryPath: path.join(reactNativePath, 'Libraries', 'Image', 'AssetRegistry'),
            config: require(path.join(testAppModulesPath, 'metro-config')),
        },
        reactNativeModules: {
            corePath: reactNativePath,
            initializeCorePath: require.resolve(path.join(reactNativePath, 'Libraries', 'Core', 'InitializeCore')),
            cliServerApi: require(path.join(testAppModulesPath, '@react-native-community/cli-server-api')),
            getPolyfills: require(path.join(reactNativePath, 'rn-get-polyfills')),
        },
        testAppModulesPath,
    };
};

const resolveModule = (moduleName, testAppModulesPath) => {
    if (moduleName === './index') {
        return './app/index';
    }

    if (moduleName === 'zora') {
        return path.join(__dirname, 'test-runners', 'zora', 'setup');
    }

    if (moduleName.match(/^react$|^react-native$|^@babel|^prop-types$/)) {
        return path.join(testAppModulesPath, moduleName);
    }

    return moduleName;
};

const getMetroConfig = ({ cwd = process.cwd(), testFileGlobs, port = 8081, testAppPath } = {}) => {
    const {
        testAppModulesPath,
        reactNativeModules,
        metroModules: {
            resolver,
            createModuleIdFactory,
            asyncRequireModulePath,
            babelTransformerPath,
            workerPath,
            minifierPath,
            assetRegistryPath,
        },
    } = getDependencyModules(testAppPath);
    const projectRoot = path.join(__dirname, '..');

    const reporter = new TestReporter();
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
                moduleName = resolveModule(moduleName, testAppModulesPath);

                const originalResolveRequest = context.resolveRequest;

                delete context.resolveRequest;

                try {
                    return resolver.resolve(context, moduleName, platform);
                } finally {
                    context.resolveRequest = originalResolveRequest;
                }
            },
        },
        serializer: {
            getModulesRunBeforeMainModule: () => [reactNativeModules.initializeCorePath],
            getPolyfills: () => reactNativeModules.getPolyfills(),
            createModuleIdFactory,
        },
        server: {
            port,
            runInspectorProxy: false,
            useGlobalHotkey: false,
        },
        symbolicator: {
            customizeFrame: (frame) => {
                const collapse = !!frame && INTERNAL_CALLSITES_REGEX.test(frame.file);

                return { collapse };
            },
        },
        transformer: {
            asyncRequireModulePath,
            babelTransformerPath,
            workerPath,
            minifierPath,
            assetRegistryPath,
            getTransformOptions: async () => ({
                transform: {
                    experimentalImportSupport: false,
                    inlineRequires: false,
                },
            }),
        },
        projectRoot,
        watchFolders: [
            process.cwd(),
            testAppPath,
            projectRoot,
            path.dirname(testSuiteFilePath),
            path.dirname(zoraConfigFilePath),
            ...testDirectories,
        ],
        reporter,
        resetCache: true,
    };
};

const runServer = async (options) => {
    const loader = ora();
    const { metroModules, reactNativeModules } = getDependencyModules(options.testAppPath);
    const { mergeConfig, getDefaultConfig } = metroModules.config;
    const { createDevServerMiddleware } = reactNativeModules.cliServerApi;
    const metro = metroModules.core;

    const defaultConfig = await getDefaultConfig();
    const config = mergeConfig(defaultConfig, getMetroConfig(options));

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
module.exports.getConfig = getMetroConfig;
