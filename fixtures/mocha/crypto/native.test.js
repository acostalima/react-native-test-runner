'use strict';

const { expect } = require('chai');
const { nanoid } = require('nanoid');

it('native crypto works', () => {
    expect(nanoid()).to.be.a('string');
});

