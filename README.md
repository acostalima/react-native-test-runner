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

## Limitations

- Support for [Zora](https://github.com/lorenzofox3/zora) test runner only.
- No coverage.
- Only iOS simulators and Android emulators are supported.
- JavaScriptCore (JSC) engine only on both Android and iOS.
- No TypeScript (TS) support yet.
- Not yet possible to run tests against native modules.
## Usage

```
Usage
    $ rn-test [--platform 'ios' | --platform 'android'] [globs ...]

    Default glob: **/test?(s)/**/?(*.)+(spec|test).js.

Options
    --plaform, -p    Platform on which to run the test suites on. Options: 'ios', 'android'.
    --simulator, -s  iOS simulator to run the test suites on.
    --emulator, -e   Android emulator or virtual device (AVD) to run the test suites on.
    --metroPort, -p  Port on which Metro's server should listen to. Default: 8081.
    --cwd            Current directory. Default: process.cwd().
    --rn             React Native version to test against. Default: 0.63.4.
    --app            Absolute path to the test app. Default: ~/.npm/rn-test-app.

Examples
    # Run tests on iPhone 11 simulator with iOS version 14.1
    $ rn-test --platform ios --simulator 'iPhone 11 (14.1)' 'test/**/*.test.js'

    # Run tests on iPhone 11 simulator with whatever iOS version is available
    $ rn-test --platform ios --simulator 'iPhone 11' 'test/**/*.test.js'

    # Run tests on iOS simulator by UUID
    $ rn-test --platform ios --simulator 'DAC8A157-A03E-4E35-92E6-90752F95BB7A' 'test/**/*.test.js'

    # Run tests on Android emulator
    $ rn-test --platform android --emulator 'Pixel_API_28_AOSP' 'test/**/*.test.js'
```
## Known issues

- `metroPort` option does not work on iOS. While Metro does listen to the specified port, the app, as a client, still attempts to load the bundle from port 8081. See https://github.com/facebook/react-native/issues/9145.
## License

MIT © [André Costa Lima](https://github.com/acostalima)
