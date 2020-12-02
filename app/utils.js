const filterRNLogs = () => {
    const filters = ['^Running "Test"'].join('|');
    const filterRegExp = new RegExp(filters);

    [
        'trace',
        'info',
        'warn',
        'error',
        'log',
        'group',
        'groupCollapsed',
        'groupEnd',
        'debug',
    ].forEach((level) => {
        const originalFunction = console[level];

        console[level] = (...args) => {
            if (args?.[0].match(filterRegExp)) {
                return;
            }
            originalFunction.apply(console, args);
        };
    });
};

export { filterRNLogs };
