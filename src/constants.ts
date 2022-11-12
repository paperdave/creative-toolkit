export const pkg = require('../package.json') as typeof import('../package.json');
export const TOOLKIT_VERSION = pkg.version;
export const TOOLKIT_DATE = TOOLKIT_VERSION.replaceAll('.', '-');
export const TOOLKIT_FORMAT = 2;
