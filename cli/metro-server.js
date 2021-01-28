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

const getTestAppDependencies = (nativeTestAppRoot) => {
    const testAppModulesPath = path.join(nativeTestAppRoot, 'node_modules');
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
            cliServerApi: require(path.join(testAppModulesPath, '@react-native-community', 'cli-server-api')),
            getPolyfills: require(path.join(reactNativePath, 'rn-get-polyfills')),
        },
        testAppModulesPath,
    };
};

const createResolveModule = (testRunner, testAppModulesPath) => (context, moduleName) => {
    const nativeTestRunnerPath = testRunner.resolveNativeModule && testRunner.resolveNativeModule(moduleName);

    if (nativeTestRunnerPath) {
        return nativeTestRunnerPath;
    }

    if (moduleName === './index' && context.originModulePath.endsWith('react-native-test-runner/.')) {
        return './app/index';
    }

    if (moduleName.match(/^react$|^react-native|^@babel|^prop-types$/)) {
        return path.join(testAppModulesPath, moduleName);
    }

    return moduleName;
};

const getMetroConfig = ({
    cwd,
    nativeTestAppRoot,
    monoRepoRoot,
    jsAppRoot,
    port,
    testRunner,
}) => {
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
    } = getTestAppDependencies(nativeTestAppRoot);

    const resolveModule = createResolveModule(testRunner, testAppModulesPath);
    const testRunnerConfigFilePath = testRunner.writeConfigFile();
    const { testSuiteFilePath, testDirectoryPaths } = testRunner.resolveTestSuite();

    return {
        resolver: {
            useWatchman: !isCI,
            extraNodeModules: {
                runner: testRunner.resolveNativeRunner(),
                'test-suite': testSuiteFilePath,
                'runner-config': testRunnerConfigFilePath,
            },
            resolverMainFields: ['react-native', 'browser', 'main'],
            platforms: ['ios', 'android', 'native'],
            resolveRequest: (context, realModuleName, platform, moduleName) => {
                moduleName = resolveModule(context, moduleName);

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
        projectRoot: jsAppRoot,
        watchFolders: [
            cwd,
            monoRepoRoot,
            jsAppRoot,
            nativeTestAppRoot,
            path.dirname(testSuiteFilePath),
            path.dirname(testRunnerConfigFilePath),
            ...testDirectoryPaths,
        ],
        reporter: testRunner.reporter,
        resetCache: isCI,
    };
};

const runServer = async (options) => {
    const {
        metroModules: {
            core: metro,
            config: { mergeConfig, getDefaultConfig },
        },
        reactNativeModules: {
            cliServerApi: { createDevServerMiddleware },
        },
    } = getTestAppDependencies(options.nativeTestAppRoot);

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
        const loader = ora();

        try {
            loader.start('Closing Metro server');
            await promisify(server.close).call(server);
            loader.succeed();
        } catch (error) {
            loader.fail();
        }
    };

    return closeServer;
};

module.exports = runServer;
