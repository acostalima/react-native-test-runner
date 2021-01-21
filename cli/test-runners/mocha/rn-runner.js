/* global mocha */

'use strict';

module.exports = () => {
    // Mocha asks for the value of global.location.search, so we define global.location
    global.location = { search: undefined };
    require('mocha/mocha');

    mocha.setup(require('runner-config'));

    return async () => {
        try {
            require('test-suite');
            mocha.run((failures) => {
                console.log(failures ? 'fail' : 'pass');
            });
        } catch (error) {
            console.log('fail', { error });
        } finally {
            delete global.location;
        }
    };
};
