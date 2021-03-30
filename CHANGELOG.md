# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.0.0](https://github.com/acostalima/react-native-test-runner/compare/v4.0.0...v5.0.0) (2021-03-30)


### ⚠ BREAKING CHANGES

* improve device management

### Features

* add option to reset metro's cache ([cdf241d](https://github.com/acostalima/react-native-test-runner/commit/cdf241da52a73d71782cbafb7d10b0895ddae463))


### Bug Fixes

* improve device management ([7585d03](https://github.com/acostalima/react-native-test-runner/commit/7585d03ed7cc9c2a8bc4be0ad185199e42f398d8))

## [4.0.0](https://github.com/acostalima/react-native-test-runner/compare/v3.0.2...v4.0.0) (2021-03-25)


### ⚠ BREAKING CHANGES

* renamed configFile option to config

* fix ios workflow ([2e2045b](https://github.com/acostalima/react-native-test-runner/commit/2e2045b7d1c02ccca8bb1fd73067def0d86b3f2a))

### [3.0.2](https://github.com/acostalima/react-native-test-runner/compare/v3.0.1...v3.0.2) (2021-03-03)

### [3.0.1](https://github.com/acostalima/react-native-test-runner/compare/v3.0.0...v3.0.1) (2021-03-03)


### Bug Fixes

* pick up test files located at cwd ([6c7a1f5](https://github.com/acostalima/react-native-test-runner/commit/6c7a1f5d1e078faec4179a79f5f33e7a53a0e140))

## [3.0.0](https://github.com/acostalima/react-native-test-runner/compare/v2.3.0...v3.0.0) (2021-03-02)


### ⚠ BREAKING CHANGES

* changed nativeModules option to just modules

### Bug Fixes

* modules installed in the test app are now resolved by metro ([b984fa9](https://github.com/acostalima/react-native-test-runner/commit/b984fa95446dd1612f7cc2fbd1f16a962f4137ea))

## [2.3.0](https://github.com/acostalima/react-native-test-runner/compare/v2.2.1...v2.3.0) (2021-01-31)


### Features

* add support to load and use process.env in the test app ([642d9b7](https://github.com/acostalima/react-native-test-runner/commit/642d9b70f030fe32909842f2e46328ad843a2035))

### [2.2.1](https://github.com/acostalima/react-native-test-runner/compare/v2.2.0...v2.2.1) (2021-01-28)


### Bug Fixes

* handle patch fail error correctly ([eddbccf](https://github.com/acostalima/react-native-test-runner/commit/eddbccffb5389d26e8ee78ee3bb8ee9dea8e420f))

## [2.2.0](https://github.com/acostalima/react-native-test-runner/compare/v2.1.0...v2.2.0) (2021-01-28)


### Features

* proceed on patch apply fail and allow to set cwd for patch ([e1f428c](https://github.com/acostalima/react-native-test-runner/commit/e1f428ce4166ca74b0669cb5a742d69d7edd1379))

## [2.1.0](https://github.com/acostalima/react-native-test-runner/compare/v2.0.0...v2.1.0) (2021-01-28)


### Features

* find project root in mono repositories ([495ff4a](https://github.com/acostalima/react-native-test-runner/commit/495ff4aa432124de3422d077d001022fc1daabd6))
* preload module, native modules and patches support ([3c66faf](https://github.com/acostalima/react-native-test-runner/commit/3c66faf9825551318ea2970d94f578c32631d518))

## [2.0.0](https://github.com/acostalima/react-native-test-runner/compare/v1.0.10...v2.0.0) (2021-01-25)


### ⚠ BREAKING CHANGES

* zora and mocha are dev dependencies

### Features

* add support for mocha test runner ([c9424ba](https://github.com/acostalima/react-native-test-runner/commit/c9424bab29c238621aedceb73cbc9ca5d0a3336f))

### [1.0.10](https://github.com/acostalima/react-native-test-runner/compare/v1.0.9...v1.0.10) (2021-01-11)


### Bug Fixes

* reset metro cache only on ci ([45cc6b0](https://github.com/acostalima/react-native-test-runner/commit/45cc6b09323beef9a8372fa8be5c1d357bfb9b1c))
* resolve module request for ./index should only target app root ([f0354c2](https://github.com/acostalima/react-native-test-runner/commit/f0354c2bd633c8474c1e4d7d020b3d459d8325ea))
* test results logging should receive metro client_log event data ([0ee436a](https://github.com/acostalima/react-native-test-runner/commit/0ee436a82d2de71548310470b7679c8a57764336))

### [1.0.9](https://github.com/acostalima/react-native-test-runner/compare/v1.0.8...v1.0.9) (2021-01-11)


### Bug Fixes

* do not log empty error data ([061a446](https://github.com/acostalima/react-native-test-runner/commit/061a446ad8ad76d96ebf97f92a7332001a3fd2c1))
* fail and pass check given output message ([b7898ae](https://github.com/acostalima/react-native-test-runner/commit/b7898ae99577598c5872dd08fd7226e789bb8c62))
* log errors captured by zora ([10a65cc](https://github.com/acostalima/react-native-test-runner/commit/10a65cc0e7cc1d4d99f72bdb1cb1c2e79d5fd9dd))
* resolve module requests for react native modules in metro ([abe3b64](https://github.com/acostalima/react-native-test-runner/commit/abe3b648529a35c0878e7f7b1963f9146e24b1e5))

### [1.0.8](https://github.com/acostalima/react-native-test-runner/compare/v1.0.7...v1.0.8) (2021-01-07)


### Bug Fixes

* add cwd to metro watch folders ([aa14795](https://github.com/acostalima/react-native-test-runner/commit/aa147959fca6c965d719a7372dcd1e23d079596d))

### [1.0.7](https://github.com/acostalima/react-native-test-runner/compare/v1.0.6...v1.0.7) (2021-01-07)


### Bug Fixes

* add zora to metro module resolution ([aefe141](https://github.com/acostalima/react-native-test-runner/commit/aefe14177d93bae5121bc2654db09793ca545d2e))

### [1.0.6](https://github.com/acostalima/react-native-test-runner/compare/v1.0.5...v1.0.6) (2021-01-07)


### Bug Fixes

* add babel dependencies to metro module resolution ([57d9c48](https://github.com/acostalima/react-native-test-runner/commit/57d9c48447441a37dcee2ae290335941f7e943b0))

### [1.0.5](https://github.com/acostalima/react-native-test-runner/compare/v1.0.4...v1.0.5) (2021-01-07)


### Bug Fixes

* test app is now created by the cli and is no longer packaged ([f85f071](https://github.com/acostalima/react-native-test-runner/commit/f85f07161646664ed6e83aa34c87f1bac05f77fd))

### [1.0.4](https://github.com/acostalima/react-native-test-runner/compare/v1.0.3...v1.0.4) (2020-12-15)


### Bug Fixes

* patch zora automatically in development and release ([43be88a](https://github.com/acostalima/react-native-test-runner/commit/43be88a3acbc07b1775e42d07f792a76a09a4603))

### [1.0.3](https://github.com/acostalima/react-native-test-runner/compare/v1.0.2...v1.0.3) (2020-12-15)


### Bug Fixes

* add postinstall script ([ce94dfd](https://github.com/acostalima/react-native-test-runner/commit/ce94dfd0cfd7895535e8b6501a227a18cb15c5a6))

### [1.0.2](https://github.com/acostalima/react-native-test-runner/compare/v1.0.1...v1.0.2) (2020-12-15)


### Bug Fixes

* currently working directory to apply patch to zora ([745543f](https://github.com/acostalima/react-native-test-runner/commit/745543feaf28da720f2e9ba890da1c383cbe41ec))

### [1.0.1](https://github.com/acostalima/react-native-test-runner/compare/v1.0.0...v1.0.1) (2020-12-15)


### Bug Fixes

* reset metro's cache when running in ci ([3683917](https://github.com/acostalima/react-native-test-runner/commit/368391770bb66622999f90f4972dd65b5c1ea0f4))

## 1.0.0 (2020-12-11)
