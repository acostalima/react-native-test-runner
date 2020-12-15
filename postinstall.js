#!/usr/bin/env node

'use strict';

const path = require('path');
const execa = require('execa');

execa.sync('patch', ['-p1', '-i', path.join(__dirname, 'patches', 'zora+4.0.1.patch')]);
