'use strict';

const execa = require('execa');
const { parse: parseTap } = require('tap-parser');

const ANDROID_EMULATOR = process.env.ANDROID_EMULATOR || 'Pixel_API_28_AOSP';

test('tests pass', async () => {
    const process = await execa('./cli/index.js', [
        '--platform',
        'android',
        '--emulator',
        'Pixel_API_28_AOSP',
        'fixtures/pass.test.js',
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
        'android',
        '--emulator',
        ANDROID_EMULATOR,
        'fixtures/fail.test.js',
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
        'android',
        '--emulator',
        ANDROID_EMULATOR,
        'fixtures/glob/**/?(*.)+(spec|test).js',
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
            'android',
            '--emulator',
            ANDROID_EMULATOR,
            'fixtures/nested.test.js',
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
            'android',
            '--emulator',
            ANDROID_EMULATOR,
            'fixtures/only.test.js',
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
            'android',
            '--emulator',
            ANDROID_EMULATOR,
            'fixtures/only.test.js',
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
        expect(error.exitCode).toBe(1);
        expect(error.stdout).toMatchInlineSnapshot(`
            "TAP version 13
            # should not run 2
            not ok 1 - I should not run 2
              ---
                actual: \\"fail called\\"
                expected: \\"fail not called\\"
                operator: \\"fail\\"
                at: \\"getAssertionLocation@http://10.0.2.2:8081/index.bundle?platform=android&dev=true&minify=false:100170:24\\"
              ...
            # should run 2
            Bail out! Unhandled error."
        `);
    }
});
