'use strict';

const { test } = require('zora');
const { nanoid } = require('nanoid');

test('native crypto works', (t) => {
    t.ok(nanoid());
});

