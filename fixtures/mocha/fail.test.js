'use strict';

const { expect } = require('chai');

describe('fail', () => {
    it('test 1', () => {
        expect('foo').not.to.be.a('string');
    });

    it('test 2', () => {
        expect('bar').not.to.equal('bar');
    });

    it('test 3', () => {
        expect(['a', 'b', 'c']).not.to.have.lengthOf(3);
    });

    it('test 4', () => {
        expect({ foo: ['a', 'b', 'c'] }).not.to.have.property('foo').with.lengthOf(3);
    });
});
