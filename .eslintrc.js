'use strict';

const { rules: jestRules } = require('@moxy/eslint-config-jest/lib/rules/jest');

module.exports = {
    root: true,
    parser: "@babel/eslint-parser",
    env: {
        node: true,
    },
    extends: [
        "@moxy/eslint-config-base/cjs",
        "@moxy/eslint-config-jest"
    ],
    overrides: [
        {
            files: "fixtures/**",
            rules: Object.entries(jestRules).reduce((rules, [key, value]) => ({
                ...rules,
                [key]: 'off',
            }), {}),
        },
    ],
};
