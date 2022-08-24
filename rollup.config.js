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

const version = process.argv.includes('--watch')
  ? pkg.version.replace(/-.*$/, '-dev')
  : pkg.version;

/** @type {import('rollup').RollupOptions} */
const config = [
  {
    input: {
      cli: 'src/index.ts',
      electron: 'src/electron.ts',
    },
    output: {
      dir: 'dist',
      format: 'esm',
      chunkFileNames: '[name].js',
    },
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
        preferBuiltins: true,
      }),
      esbuild(),
      shebang(),
      {
        name: 'external-node-modules-pre',
        resolveId: {
          order: 'pre',
          handler(source) {
            if (builtinModules.includes(source)) {
              return { id: 'node:' + source, external: true };
            }
            return null;
          },
        },
      },
      {
        name: 'external-node-modules-post',
        resolveId: {
          order: 'post',
          handler(source) {
            if (source.split('/').includes('node_modules')) {
              return { id: source, external: true };
            }
            return null;
          },
        },
      },
    ],
  },
];

export default config;
