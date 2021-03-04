'use strict';

const path = require('path');
const fs = require('fs-extra');
const tempy = require('tempy');
const { parse: parseTap } = require('tap-parser');
const { createAndroidCli } = require('./utils/create-cli');

describe('zora', () => {
    test('tests pass', async () => {
        const process = await createAndroidCli('fixtures/zora/pass.test.js')
            .runner('zora')
            .run();

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('tests fail', async () => {
        expect.assertions(3);

        const process = createAndroidCli('fixtures/zora/fail.test.js')
            .runner('zora')
            .run();

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
        const process = await createAndroidCli('fixtures/zora/glob/**/?(*.)+(spec|test).js')
            .runner('zora')
            .run();

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
        const process = await createAndroidCli('fixtures/zora/nested.test.js', {
            env: {
                INDENT: true,
            },
        })
            .runner('zora')
            .run();

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
        const process = await createAndroidCli('fixtures/zora/only.test.js', {
            env: {
                RUN_ONLY: true,
            },
        })
            .runner('zora')
            .run();

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

        const process = createAndroidCli('fixtures/zora/only.test.js', {
            env: {
                RUN_ONLY: false,
            },
        })
            .runner('zora')
            .run();

        try {
            await process;
        } catch (error) {
            const output = error.stdout.replace(/[ \t]*at: .*\s*\.\.\.\n/g, '');

            expect(error.exitCode).toBe(1);
            expect(output).toMatchInlineSnapshot(`
                "TAP version 13
                # should not run 2
                not ok 1 - I should not run 2
                  ---
                    actual: \\"fail called\\"
                    expected: \\"fail not called\\"
                    operator: \\"fail\\"
                # should run 2
                Bail out! Unhandled error."
            `);
        }
    });

    test('preloaded script', async () => {
        const process = await createAndroidCli('fixtures/zora/pass.test.js')
            .runner('zora')
            .require('fixtures/zora/before.js')
            .run();

        expect(process.exitCode).toBe(0);

        const tapOutput = parseTap(process.stdout);
        const tapExtraEvent = tapOutput.shift();
        const preloadedScriptOutput = tapExtraEvent[1];

        expect(preloadedScriptOutput).toEqual(
            expect.stringContaining('zora: before script'),
        );

        const tapCompleteEvent = tapOutput.pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('load config file', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                runner: 'zora',
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/zora/pass.test.js')
                .config(configFilePath)
                .run();
        });

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(17);
    });

    test('user modules', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                runner: 'zora',
                modules: ['react-native-get-random-values'],
                require: 'fixtures/zora/crypto/before.js',
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/zora/crypto/native.test.js')
                .config(configFilePath)
                .run();
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
                runner: 'zora',
                patches: [
                    {
                        path: require.resolve(
                            'react-native-polyfill-globals/patches/react-native+0.63.3.patch',
                        ),
                    },
                ],
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/zora/patch/test.js')
                .config(configFilePath)
                .run();
        });

        expect(process.exitCode).toBe(0);

        const tapCompleteEvent = parseTap(process.stdout).pop();
        const testResults = tapCompleteEvent[1];

        expect(testResults.ok).toBe(true);
        expect(testResults.pass).toBe(2);
    });

    test('load environment variables', async () => {
        const process = await createAndroidCli('fixtures/zora/env/test.js', {
            env: {
                FOO: 'foo',
                BAR: 'bar',
            },
        })
            .runner('zora')
            .run();

        expect(process.exitCode).toBe(0);
    });
});

describe('mocha', () => {
    test('tests pass', async () => {
        const process = await createAndroidCli('fixtures/mocha/pass.test.js')
            .runner('mocha')
            .run();

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

        //     [92m [0m[32m 4 passing[0m[90m (11ms)[0m
        //     "
        // `);
    });

    test('tests fail', async () => {
        expect.assertions(4);

        const process = createAndroidCli('fixtures/mocha/fail.test.js')
            .runner('mocha')
            .run();

        try {
            await process;
        } catch (error) {
            expect(error.exitCode).toBe(1);
            expect(error.stdout).toEqual(expect.stringContaining('test 1'));
            expect(error.stdout).toEqual(expect.stringContaining('1 failing'));
            expect(error.stdout).toEqual(
                expect.stringContaining("expected 'foo' not to be a string"),
            );
            // expect(error.stdout).toMatchInlineSnapshot(`
            //     "
            //     [0m[0m
            //     [0m  fail[0m
            //       [31m  1) test 1[0m

            //     [92m [0m[32m 0 passing[0m[90m (7ms)[0m
            //     [31m  1 failing[0m

            //     [0m  1) fail
            //            test 1:
            //     [0m[31m     expected 'foo' not to be a string[0m[90m
            //       AssertionError@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:123589:24
            //       assert@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:125284:33
            //       an@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:125339:18
            //       chainableMethodWrapper@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:125033:54
            //       [native code]
            //       http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:123487:32
            //       callFn@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:118652:29
            //       run@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:118638:15
            //       runTest@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:119640:17
            //       http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:119742:23
            //       http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:119589:15
            //       http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:119566:13
            //       timeslice@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:123374:31
            //       _callTimer@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:30544:17
            //       callTimers@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:30752:19
            //       __callFunction@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:2778:36
            //       http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:2510:31
            //       __guard@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:2732:15
            //       callFunctionReturnFlushedQueue@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:2509:21
            //       callFunctionReturnFlushedQueue@[native code]
            //     [0m

            //     "
            // `);
        }
    });

    test('preloaded script', async () => {
        const process = await createAndroidCli('fixtures/mocha/pass.test.js')
            .runner('mocha')
            .require('fixtures/mocha/before.js')
            .run();

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(
            expect.stringContaining('mocha: before script'),
        );
    });

    test('load config file', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                runner: 'mocha',
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/mocha/pass.test.js')
                .config(configFilePath)
                .run();
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(expect.stringContaining('test 1'));
        expect(process.stdout).toEqual(expect.stringContaining('test 2'));
        expect(process.stdout).toEqual(expect.stringContaining('test 3'));
        expect(process.stdout).toEqual(expect.stringContaining('test 4'));
        expect(process.stdout).toEqual(expect.stringContaining('4 passing'));
    });

    test('user modules', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                runner: 'mocha',
                modules: ['react-native-get-random-values'],
                require: 'fixtures/mocha/crypto/before.js',
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/mocha/crypto/native.test.js')
                .config(configFilePath)
                .run();
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(
            expect.stringContaining('native crypto works'),
        );
        expect(process.stdout).toEqual(expect.stringContaining('1 passing'));
    });

    test('patch test app dependencies', async () => {
        const process = await tempy.directory.task(async (directoryPath) => {
            const config = {
                runner: 'mocha',
                patches: [
                    {
                        path: require.resolve(
                            'react-native-polyfill-globals/patches/react-native+0.63.3.patch',
                        ),
                    },
                ],
            };
            const configFilePath = path.join(directoryPath, 'config.json');

            await fs.writeFile(configFilePath, JSON.stringify(config));

            return createAndroidCli('fixtures/mocha/patch/test.js')
                .config(configFilePath)
                .run();
        });

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(
            expect.stringContaining('FormData.set patch works'),
        );
        expect(process.stdout).toEqual(
            expect.stringContaining('FileReader.readAsArrayBuffer patch works'),
        );
        expect(process.stdout).toEqual(expect.stringContaining('2 passing'));
    });

    test('load environment variables', async () => {
        const process = await createAndroidCli('fixtures/mocha/env/test.js', {
            env: {
                HELLO: 'hello',
                WORLD: 'world',
            },
        })
            .runner('mocha')
            .run();

        expect(process.exitCode).toBe(0);
        expect(process.stdout).toEqual(
            expect.stringContaining('environment variables loading works'),
        );
    });
});
