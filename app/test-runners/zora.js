const setup = () => {
    // Zora attempts to install an event listener on load, so we ignore that
    // https://github.com/lorenzofox3/zora/blob/8e2fae8154bdb0c8b789a3c41eb62a115eb8431b/src/index.ts#L93
    window.addEventListener = () => {};
    const zora = require('zora');

    return async () => {
        try {
            require('suite');
            await zora.report();
            console.log(zora.pass ? 'pass' : 'fail');
        } catch (error) {
            console.log('fail');
        } finally {
            delete window.addEventListener;
        }
    };
};

export default setup;
