// This configuration is modelled after what SvelteKit uses to bundle their app.
import fs from 'fs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import shebang from 'rollup-plugin-add-shebang';
import pkg from './package.json';
import { builtinModules } from 'module';

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');

/** @type {string[]} */
const external = [].concat(
  Object.keys(pkg.dependencies ?? {}),
  Object.keys(pkg.peerDependencies ?? {}),
  builtinModules
);

const version = process.argv.includes('--watch')
  ? pkg.version.replace(/-.*$/, '-dev')
  : pkg.version;

/** @type {import('rollup').RollupOptions} */
const config = {
  input: {
    cli: 'src/index.ts',
  },
  output: {
    dir: 'dist',
    format: 'esm',
    chunkFileNames: '[name].js',
  },
  external: id => id.startsWith('node:') || external.some(x => id.startsWith(x)),
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: version,
        v__VERSION__: 'v' + version,
      },
    }),
    resolve({
      extensions: ['.mjs', '.js', '.ts', '.json'],
    }),
    esbuild(),
    shebang(),
  ],
};

export default config;
