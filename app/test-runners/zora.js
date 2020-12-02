const setup = () => {
    window.addEventListener = () => {};
    const zora = require('zora');

    return async () => {
        try {
            require('suite');
            await zora.report();
            console.log(zora.pass ? 'pass' : 'fail');
        } catch (error) {
            console.log('fail');

            throw error;
        } finally {
            delete window.addEventListener;
        }
    };
};

export default setup;
