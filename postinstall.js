#!/usr/bin/env node

'use strict';

const path = require('path');
const execa = require('execa');

const isDependency = path.basename(path.dirname(process.cwd())) === 'node_modules';
const cwd = isDependency ? path.join(process.cwd(), '..', '..') : process.cwd();

const patchZora = () => {
    const zoraPatchFilePath = path.join(__dirname, 'patches', 'zora+4.0.1.patch');

    execa.sync('patch', ['-p1', '-i', zoraPatchFilePath], { cwd });
};

patchZora();
