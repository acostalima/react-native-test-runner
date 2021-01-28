# react-native-test-runner

[![npm version][npm-image]][npm-url] [![ci][github-ci-image]][github-ci-url] [![codecov][codecov-image]][codecov-url]

[npm-url]:https://www.npmjs.com/package/react-native-test-runner
[npm-image]:https://img.shields.io/npm/v/react-native-test-runner.svg
[github-ci-url]:https://github.com/acostalima/react-native-test-runner/actions
[github-ci-image]:https://github.com/acostalima/react-native-test-runner/workflows/Node%20CI/badge.svg
[codecov-url]:https://codecov.io/gh/acostalima/react-native-test-runner?branch=master
[codecov-image]:https://codecov.io/gh/acostalima/react-native-test-runner/badge.svg?branch=master

> Run tests in React Native's environment.

## Installation

```sh
$ npm install -D react-native-test-runner
```

## Features 

- Supported test runners:
    - [Zora](https://github.com/lorenzofox3/zora)
    - [Mocha](https://github.com/mochajs/mocha/)
- Supported assertion libraries:
    - [Chai](https://github.com/chaijs/chai)
- React Native version selection.
- iOS runtime and simulator selection.
- Android emulator (AVD) selection.
- Support to use and test libraries with native modules.

## Limitations

- No coverage output.
- No support for Windows and MacOS.
- JavaScriptCore (JSC) engine only on both Android and iOS.
- No TypeScript (TS) support yet.
## Usage

```
Usage
    $ rn-test --platform ['ios' | 'android'] [--simulator ios_simulator | --emulator android_avd] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js.

Options
    --plaform, -p          Platform on which to run the test suite on. One of: 'ios', 'android'.
    --simulator, -s        iOS simulator to run the test suite on.
    --emulator, -e         Android emulator or virtual device (AVD) to run the test suite on.
    --metroPort, -p        Port on which Metro's server should listen to. [Default: 8081]
    --cwd                  Current directory. [Default: process.cwd()]
    --rn                   React Native version to use. [Default: 0.63.4]
    --runner               Test runner to use. One of: 'zora', 'mocha'. [Default: 'zora']
    --require              Path to the module to load before the test suite. If not absolute, cwd is used to resolve the path.
    --removeNativeTestApp  Removes the natuve test app directory after running the test suite. [Default: false]

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

### Advanced options

The following options are only available via configuration file loaded by [lilconfig](https://github.com/antonk52/lilconfig).
All CLI options are supported in the configuration file approach as well, but the options defined in the file override those provided to the CLI. Although this works, we do not recommend mixing up CLI and file configuration approaches. If you need the advanced options, just use the configuration file only.   

Example `.rn-testrc.json`:

```json
{
    "platform": "ios",
    "simulator": "iPhone 11 (14.1)",
    "runner": "mocha"
}
```

Run the CLI:

```
$ rn-test 'test/**/*.test.js'
```

#### nativeModules

Type: `array`

Install React Native libraries which have a native iOS and/or Android component.

Example:

```json
{
    "nativeModules": ["react-native-get-random-values"]
}
```

#### patches

Type: `array`

Paths to the patch files to apply to the test app. If not absolute, the current directory is used to resolve the path.
This might be useful if you need to patch the React Native source temporarily to fix a bug or add missing functionality.

Example:

```json
{
    "patches": ["node_modules/react-native-polyfill-globals/patches/react-native+0.63.3.patch"]
}
```
## Known issues

- `metroPort` option does not work on iOS. While Metro does listen to the specified port, the app, as a client, still attempts to load the bundle from port 8081. See https://github.com/facebook/react-native/issues/9145.
## License

MIT © [André Costa Lima](https://github.com/acostalima)
