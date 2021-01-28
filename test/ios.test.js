'use strict';

const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');
const tempy = require('tempy');
const { parse: parseTap } = require('tap-parser');

const IOS_SIMULATOR = process.env.IOS_SIMULATOR || 'iPhone 11 (14.1)';

describe('zora', () => {
    test('tests pass', async () => {
        const process = await execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'zora',
            'fixtures/zora/pass.test.js',
        ]);

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('tests fail', async () => {
        expect.assertions(3);

        const process = execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'zora',
            'fixtures/zora/fail.test.js',
        ]);

        try {
            await process;
        } catch (error) {
            expect(error.exitCode).toBe(1);

            const tapCompleteEvent = parseTap(error.stdout).pop();
            const testResults = tapCompleteEvent[1];

            expect(testResults.ok).toBe(false);
            expect(testResults.fail).toBe(3);
        }
    });

    test('glob', async () => {
        const process = await execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'zora',
            'fixtures/zora/glob/**/?(*.)+(spec|test).js',
        ]);

        expect(process.stdout).toMatchInlineSnapshot(`
            "TAP version 13
            # glob/glob1
            ok 1 - should be truthy
            # glob/glob2
            ok 2 - should be truthy
            # glob/nested/glob3
            ok 3 - should be truthy
            # glob/nested/nested/glob4
            ok 4 - should be truthy
            1..4

            # ok
            # success: 4
            # skipped: 0
            # failure: 0"
        `);
    });

    test('indent nested tests', async () => {
        const process = await execa(
            './cli/index.js',
            [
                '--platform',
                'ios',
                '--simulator',
                IOS_SIMULATOR,
                '--runner',
                'zora',
                'fixtures/zora/nested.test.js',
            ],
            {
                env: {
                    INDENT: true,
                },
            },
        );

        const output = process.stdout.toString().replace(/[0-9]+ms/g, 'time');

        expect(output).toMatchInlineSnapshot(`
            "TAP version 13
            # Subtest: nested
                # Subtest: some nested tester
                    ok 1 - nested 1
                    ok 2 - nested 2
                    1..2
                ok 1 - some nested tester # time
                # Subtest: some nested tester bis
                    ok 1 - nested 1
                    # Subtest: deeply nested
                        ok 1 - deeply nested really
                        ok 2 - deeply nested again
                        1..2
                    ok 2 - deeply nested # time
                    ok 3 - nested 2
                    1..3
                ok 2 - some nested tester bis # time
                ok 3 - assert2
                1..3
            ok 1 - nested # time
            1..1

            # ok
            # success: 7
            # skipped: 0
            # failure: 0"
        `);
    });

    test('run only tests if RUN_ONLY is set', async () => {
        const process = await execa(
            './cli/index.js',
            [
                '--platform',
                'ios',
                '--simulator',
                IOS_SIMULATOR,
                '--runner',
                'zora',
                'fixtures/zora/only.test.js',
            ],
            {
                env: {
                    RUN_ONLY: true,
                },
            },
        );

        expect(process.stdout).toMatchInlineSnapshot(`
            "TAP version 13
            # should not run 2
            ok 1 - should not run 2 # SKIP
            # should run 2
            ok 2 - I ran 2
            # keep running 2
            # keeeeeep running 2
            ok 3 -  I got there 2
            # should not run 2
            ok 4 - should not run 2 # SKIP
            1..4

            # ok
            # success: 2
            # skipped: 2
            # failure: 0"
        `);
    });

    test('bail out if only test runs and RUN_ONLY is not set', async () => {
        expect.assertions(2);

        const process = execa(
            './cli/index.js',
            [
                '--platform',
                'ios',
                '--simulator',
                IOS_SIMULATOR,
                '--runner',
                'zora',
                'fixtures/zora/only.test.js',
            ],
            {
                env: {
                    RUN_ONLY: false,
                },
            },
        );

        try {
            await process;
        } catch (error) {
            // const output = error.stdout.replace(/[ \t]*at: .*\s*\.\.\.\n/g, '');
            expect(error.exitCode).toBe(1);
            expect(error.stdout).toMatchInlineSnapshot(`
                "TAP version 13
                # should not run 2
                not ok 1 - I should not run 2
                  ---
                    actual: \\"fail called\\"
                    expected: \\"fail not called\\"
                    operator: \\"fail\\"
                    at: \\"getAssertionLocation@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:99264:24\\"
                  ...
                # should run 2
                Bail out! Unhandled error."
            `);
        }
    });

    test('preloaded script', async () => {
        const process = await execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'zora',
            '--require',
            'fixtures/zora/before.js',
            'fixtures/zora/pass.test.js',
        ]);

        expect(process.exitCode).toBe(0);

        const tapOutput = parseTap(process.stdout);
        const tapExtraEvent = tapOutput.shift();
        const preloadedScriptOutput = tapExtraEvent[1];

        expect(preloadedScriptOutput).toEqual(expect.stringContaining('zora: before script'));

        const tapCompleteEvent = tapOutput.pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('load config file', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'zora',
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/zora/pass.test.js']);
        });

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('native module', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'zora',
                nativeModules: [
                    'react-native-get-random-values',
                ],
                require: 'fixtures/zora/crypto/before.js',
                removeNativeTestApp: true,
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/zora/crypto/native.test.js']);
        });

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(1);
    });

    test('patch test app dependencies', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'zora',
                removeNativeTestApp: true,
                patches: [
                    'node_modules/react-native-polyfill-globals/patches/react-native+0.63.3.patch',
                ],
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/zora/patch/test.js']);
        });

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(2);
    });
});

describe('mocha', () => {
    test('tests pass', async () => {
        const process = await execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'mocha',
            'fixtures/mocha/pass.test.js',
        ]);

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('test 1'));
        expect(process.stdout).toEqual(expect.stringContaining('test 2'));
        expect(process.stdout).toEqual(expect.stringContaining('test 3'));
        expect(process.stdout).toEqual(expect.stringContaining('test 4'));
        expect(process.stdout).toEqual(expect.stringContaining('4 passing'));
        // expect(process.stdout).toMatchInlineSnapshot(`
        //     "
        //     [0m[0m
        //     [0m  pass[0m
        //       [32m  ✓[0m[90m test 1[0m
        //       [32m  ✓[0m[90m test 2[0m
        //       [32m  ✓[0m[90m test 3[0m
        //       [32m  ✓[0m[90m test 4[0m

        //     [92m [0m[32m 4 passing[0m[90m (9ms)[0m
        //     "
        // `);
    });

    test('tests fail', async () => {
        expect.assertions(4);

        const process = execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'mocha',
            'fixtures/mocha/fail.test.js',
        ]);

        try {
            await process;
        } catch (error) {
            expect(error.exitCode).toBe(1);
            expect(error.stdout).toEqual(expect.stringContaining('test 1'));
            expect(error.stdout).toEqual(expect.stringContaining('1 failing'));
            expect(error.stdout).toEqual(expect.stringContaining("expected 'foo' not to be a string"));
            // expect(error.stdout).toMatchInlineSnapshot(`
            //     "
            //     [0m[0m
            //     [0m  fail[0m
            //       [31m  1) test 1[0m

            //     [92m [0m[32m 0 passing[0m[90m (5ms)[0m
            //     [31m  1 failing[0m

            //     [0m  1) fail
            //            test 1:
            //     [0m[31m     expected 'foo' not to be a string[0m[90m
            //       AssertionError@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:123299:24
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:124994:33
            //       an@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:125049:18
            //       chainableMethodWrapper@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:124743:54
            //       [native code]
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:123197:32
            //       callFn@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:118362:29
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:118348:15
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:119350:17
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:119452:23
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:119299:15
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:119276:13
            //       timeslice@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:123084:31
            //       _callTimer@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:30612:17
            //       callTimers@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:30820:19
            //       __callFunction@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:2811:36
            //       http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:2543:31
            //       __guard@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:2765:15
            //       callFunctionReturnFlushedQueue@http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false:2542:21
            //       callFunctionReturnFlushedQueue@[native code]
            //     [0m

            //     "
            // `);
        }
    });

    test('preloaded script', async () => {
        const process = await execa('./cli/index.js', [
            '--platform',
            'ios',
            '--simulator',
            IOS_SIMULATOR,
            '--runner',
            'mocha',
            '--require',
            'fixtures/mocha/before.js',
            'fixtures/mocha/pass.test.js',
        ]);

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('mocha: before script'));
    });

    test('load config file', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'mocha',
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/mocha/pass.test.js']);
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('test 1'));
        expect(process.stdout).toEqual(expect.stringContaining('test 2'));
        expect(process.stdout).toEqual(expect.stringContaining('test 3'));
        expect(process.stdout).toEqual(expect.stringContaining('test 4'));
        expect(process.stdout).toEqual(expect.stringContaining('4 passing'));
    });

    test('native module', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'mocha',
                nativeModules: [
                    'react-native-get-random-values',
                ],
                require: 'fixtures/mocha/crypto/before.js',
                removeNativeTestApp: true,
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/mocha/crypto/native.test.js']);
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('native crypto works'));
        expect(process.stdout).toEqual(expect.stringContaining('1 passing'));
    });

    test('patch test app dependencies', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                platform: 'ios',
                simulator: IOS_SIMULATOR,
                runner: 'mocha',
                removeNativeTestApp: true,
                patches: [
                    'node_modules/react-native-polyfill-globals/patches/react-native+0.63.3.patch',
                ],
            };
            const filePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(filePath, JSON.stringify(config));

            return execa('./cli/index.js', ['--configFile', filePath, 'fixtures/mocha/patch/test.js']);
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('FormData.set patch works'));
        expect(process.stdout).toEqual(expect.stringContaining('FileReader.readAsArrayBuffer patch works'));
        expect(process.stdout).toEqual(expect.stringContaining('2 passing'));
    });
});
