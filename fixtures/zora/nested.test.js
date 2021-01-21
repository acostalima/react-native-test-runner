'use strict';

const { test } = require('zora');

test('nested', (t) => {
    t.test('some nested tester', (t) => {
        t.ok(true, 'nested 1');
        t.ok(true, 'nested 2');
    });

    t.test('some nested tester bis', (t) => {
        t.ok(true, 'nested 1');

        t.test('deeply nested', (t) => {
            t.ok(true, 'deeply nested really');
            t.ok(true, 'deeply nested again');
        });

        t.ok(true, 'nested 2');
    });

    t.ok(true, 'assert2');
});
