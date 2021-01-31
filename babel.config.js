'use strict';

module.exports = {
    presets: ['module:metro-react-native-babel-preset'],
    plugins: [
        '@babel/plugin-proposal-async-generator-functions',
        'transform-inline-environment-variables',
    ],
};
