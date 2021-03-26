# react-native-test-runner

[![npm version][npm-image]][npm-url] [![ci][github-ci-image]][github-ci-url]

[npm-url]:https://www.npmjs.com/package/react-native-test-runner
[npm-image]:https://img.shields.io/npm/v/react-native-test-runner.svg
[github-ci-url]:https://github.com/acostalima/react-native-test-runner/actions
[github-ci-image]:https://github.com/acostalima/react-native-test-runner/workflows/Node%20CI/badge.svg

> Run tests in React Native's environment.

## Installation

```sh
$ npm install -D react-native-test-runner
```

## Features 

- Supported test runners:
    - [zora](https://github.com/lorenzofox3/zora)
    - [mocha](https://github.com/mochajs/mocha/)
- Supported assertion libraries:
    - [chai](https://github.com/chaijs/chai)
- React Native version selection.
- iOS runtime and simulator selection.
- Android emulator (AVD) selection.
- Support to use and test libraries with native modules.

## Limitations

- No coverage output.
- Stack traces are not source mapped.
- No support for [React Native Windows](https://github.com/microsoft/react-native-windows) and [React Native macOS](https://github.com/microsoft/react-native-macos).
- JavaScriptCore (JSC) engine only on both Android and iOS.
- No TypeScript (TS) support.

## Usage

```
Usage
    $ rn-test --platform ['ios' | 'android'] [--simulator ios_simulator | --emulator android_avd] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js.

Options
    --plaform, -p          Platform on which to run the test suite on. One of: 'ios', 'android'.
    --simulator, -s        iOS simulator to run the test suite on.
    --emulator, -e         Android emulator or virtual device (AVD) to run the test suite on.
    --metro-port, -p       Port on which Metro's server should listen to. [Default: 8081]
    --cwd                  Current directory. [Default: process.cwd()]
    --rn                   React Native version to use. [Default: 0.63.4]
    --runner               Test runner to use. One of: 'zora', 'mocha'. [Default: 'zora']
    --require              Path to the module to load before the test suite. If not absolute, cwd is used to resolve the path.
    --app                  Path to the React Native test app root. [Default: ~/.rn-test-app]
    --reset-cache          Resets Metro's cache. [Default: false]

Examples
    # Run tests on iPhone 11 simulator with iOS version 14.1 runtime
    $ rn-test --platform ios --simulator 'iPhone 11 (14.1)' 'test/**/*.test.js'

    # Run tests on iPhone 11 simulator with whatever iOS version is available
    $ rn-test --platform ios --simulator 'iPhone 11' 'test/**/*.test.js'

    # Run tests on iOS simulator by UUID
    $ rn-test --platform ios --simulator 'DAC8A157-A03E-4E35-92E6-90752F95BB7A' 'test/**/*.test.js'

    # Run tests on Android emulator
    $ rn-test --platform android --emulator 'Pixel_API_28_AOSP' 'test/**/*.test.js'

Notes
    Do not use shell expansion for globs. Always wrap them in a string.
    $ rn-test 'test/**' ✅
    $ rn-test test/** ❌

    Check out the README for information about advanced options.
```

### Device orchestration

Both `simulator` and `emulator` options are optional.

When they're not passed, the CLI attempts to find the currently booted device. If none or more than one is found, the CLI exits with an error. If only one is found, the CLI installs and launches the test app in that device. The device is not shutdown before the CLI exits. This feature might be useful when running in CI servers which are often responsible for setting up the appropriate test environment.

When they're passed, unless the device cannot be found in the system, the CLI boots the device and shuts it down automatically before exiting. In case of iOS, if the passed simulator is already booted, the CLI behaves exactly as if it was not, i.e., the device is not shutdown before the CLI exists.

### Advanced options

The following options are only available via configuration file loaded by [lilconfig](https://github.com/antonk52/lilconfig).
All CLI options are supported in the configuration file approach as well, but the options passed to the CLI override those defined in the file.  

Example `rn-test.config.js`:

```js
{
    platform: "ios",
    simulator: "iPhone 11 (14.1)",
    runner: "mocha"
}
```

Run the CLI:

```
$ rn-test 'test/**/*.test.js'
```

#### modules

Type: `array`

Install packages in the test app. This is mostly useful when you are using modules that have a native iOS and/or Android component or the code under test depends on them.

Example:

```js
module.exports = {
    modules: ["react-native-get-random-values"]
}
```

#### patches

Type: `array`

Paths to the patch files to apply to the test app.
This might be useful if you need to patch the React Native's source temporarily to fix a bug or add missing functionality.

Example:

```js
module.exports = {
    "patches": [{
        path: require.resolve("react-native-polyfill-globals/patches/react-native+0.63.3.patch")
    }]
}
```

If not absolute, the current working directory (`cwd`) is used to resolve the path. Alternatively, you can specify your own `cwd` for the each patch to apply:

```js
module.exports = {
    "patches": [{
        path: "node_modules/react-native-polyfill-globals/patches/react-native+0.63.3.patch"
        cwd: process.cwd()
    }]
}
```

## Tests

This section is about how you can run the test suite locally.

### Environment setup

The test suite can be parameterized with the following environment variables:

| Variable | CLI option | Default |
|----------|------------|---------|
| `REACT_NATIVE_VERSION` | `rn` | CLI default |
| `REACT_NATIVE_TEST_APP` | `app` | CLI default |
| `IOS_SIMULATOR` | `simulator` | - |
| `ANDROID_SIMULATOR`| `emulator` | - |

Both `IOS_SIMULATOR` and `ANDROID_EMULATOR` must be set according to what iOS simulators and Android emulators you have installed in your system.

You can find the list of iOS simulators available in your system by running the following command:

```
$ xcrun xctrace list devices
```

For the list of Android emulators, run:

```
$ emulator -list-avds
```

### Run on iOS

⚠️ A machine with macOS operating system is required!

```
$ npm t -- ios
```

### Run on Android

```
$ npm t -- android
```

## Known issues

- While `metroPort` works in [Android](https://github.com/facebook/react-native/pull/23616), it doesn't on [iOS](https://github.com/facebook/react-native/issues/9145). Metro does listen to the specified port but, the app, as a client, still attempts to load the bundle from port 8081.
## License

MIT © [André Costa Lima](https://github.com/acostalima)
