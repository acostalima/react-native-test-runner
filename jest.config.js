'use strict';

const { baseConfig, compose } = require('@moxy/jest-config-base');

module.exports = compose(
    baseConfig('node'),
    (config) => ({
        ...config,
        testPathIgnorePatterns: [
            ...config.testPathIgnorePatterns,
            'fixtures',
        ],
        setupFilesAfterEnv: [
            ...config.setupFilesAfterEnv,
            require.resolve('./jest.setup.js'),
        ],
        collectCoverageFrom: [
            '**/*.js',
        ],
        coveragePathIgnorePatterns: [
            'node_modules',
            'app',
            'fixtures',
            'jest.config.js',
            'jest.setup.js',
            '.eslintrc.js',
            'babel.config.js',
            'coverage',
        ],
        collectCoverage: false,
    }),
);
