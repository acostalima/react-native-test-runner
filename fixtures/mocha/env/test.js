'use strict';

const { expect } = require('chai');

it('environment variables loading works', () => {
    expect(process.env.HELLO).to.equal('hello');
    expect(process.env.WORLD).to.equal('world');
});

