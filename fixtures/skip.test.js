'use strict';

const { skip, test } = require('zora');

test('hello world 1', (t) => {
    t.ok(true);
    t.skip('blah 1', (t) => {
        t.ok(false);
    });
    t.skip('for some reason 1');
});

skip('failing text 1', (t) => {
    t.ok(false);
});
