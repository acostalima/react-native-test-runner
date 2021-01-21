'use strict';

const { expect } = require('chai');

describe('pass', () => {
    it('test 1', () => {
        expect('foo').to.be.a('string');
    });

    it('test 2', () => {
        expect('bar').to.equal('bar');
    });

    it('test 3', () => {
        expect(['a', 'b', 'c']).to.have.lengthOf(3);
    });

    it('test 4', () => {
        expect({ foo: ['a', 'b', 'c'] }).to.have.property('foo').with.lengthOf(3);
    });
});
