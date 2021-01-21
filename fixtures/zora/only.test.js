'use strict';

const { only, test } = require('zora');

test('should not run 2', (t) => {
    t.fail('I should not run 2');
});

only('should run 2', (t) => {
    t.ok(true, 'I ran 2');

    t.only('keep running 2', (t) => {
        t.only('keeeeeep running 2', (t) => {
            t.ok(true, ' I got there 2');
        });
    });

    t.test('should not run 2', (t) => {
        t.fail('should not run 2');
    });
});
