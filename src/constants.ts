import pkg from '../package.json';

export { pkg };

export const TOOLKIT_VERSION = pkg.version.replaceAll('.', '-');
export const TOOLKIT_FORMAT = 2;
export const TOOLKIT_CODENAME = 'Two Step Process';
export const RUNTIME_NAME = process.isBun ? 'bun' : 'node';
export const RUNTIME_VERSION = process.isBun ? process.versions.bun : process.versions.node;
