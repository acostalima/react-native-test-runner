'use strict';

module.exports = () => {
    // Zora add an event listener to window on load, so we create a noop facility
    // https://github.com/lorenzofox3/zora/blob/8e2fae8154bdb0c8b789a3c41eb62a115eb8431b/src/index.ts#L93
    global.addEventListener = () => {};
    const zora = require('zora');

    return async () => {
        try {
            require('test-suite');
            await zora.report();
            console.log(zora.pass ? 'pass' : 'fail');
        } catch (error) {
            console.log('fail', { error });
        } finally {
            delete global.addEventListener;
        }
    };
};
