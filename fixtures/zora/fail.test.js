'use strict';

const { test } = require('zora');

test('some grouped assertions 1', (t) => {
    t.ok(true, 'true is truthy');
    t.equal('bar', 'bar', 'that both string are equivalent');
    t.isNot({}, {}, 'those are not the same reference');
});

test('some grouped assertions 2', (t) => {
    t.ok(true, 'true is truthy');

    t.test('a group inside another one', (t) => {
        t.equal('bar', 'bar', 'that both string are equivalent');
        t.isNot({}, {}, 'those are not the same reference');
    });
});

test('tester 1', (t) => {
    t.notOk(true, 'assert1'); // This one will fail

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

        t.notOk(true, 'nested 2'); // This one will fail
    });

    t.ok(true, 'assert2');
});

test('tester 2', (t) => {
    t.ok(true, 'assert3');

    t.test('nested in two', (t) => {
        t.ok(true, 'still happy');
    });

    t.notOk(true, 'assert4'); // This one will fail
});
