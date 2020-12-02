'use strict';

const { baseConfig, compose } = require('@moxy/jest-config-base');

module.exports = compose(
    baseConfig('node'),
    (config) => ({
        ...config,
        testPathIgnorePatterns: [
            ...config.testPathIgnorePatterns,
            '<rootDir>/fixtures',
        ],
        setupFilesAfterEnv: [
            ...config.setupFilesAfterEnv,
            require.resolve('./jest.setup.js'),
        ],
    }),
);
