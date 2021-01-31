const filterRNLogs = () => {
    const filters = [
        '^Running "Test"',
        'Require cycles are allowed, but can result in uninitialized values.',
    ].join('|');
    const filterRegExp = new RegExp(filters);

    [
        'trace',
        'info',
        'warn',
        'error',
        'log',
        'debug',
    ].forEach((level) => {
        const originalFn = console[level];

        console[level] = (...args) => {
            if (args?.[0]?.match?.(filterRegExp)) {
                return;
            }
            originalFn.apply(console, args);
        };
    });
};

export { filterRNLogs };
