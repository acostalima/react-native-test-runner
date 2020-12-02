/* global zora */

'use strict';

require('config');
const { createHarness } = require('zora/dist/bundle');

const harness = createHarness({
    indent: zora.indent,
    runOnly: zora.runOnly,
});

module.exports = harness;
