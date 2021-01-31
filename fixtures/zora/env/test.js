'use strict';

const { test } = require('zora');

console.log({ env: process.env });

test('environment variables loading works', (t) => {
    t.eq(process.env.FOO, 'foo');
    t.eq(process.env.BAR, 'bar');
});
