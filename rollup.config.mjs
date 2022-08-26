// This configuration is modelled after what SvelteKit uses to bundle their app.
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import shebang from 'rollup-plugin-add-shebang';
import external from 'rollup-plugin-all-external';
import del from 'rollup-plugin-delete';
import { readJSONSync } from '@paperdave/utils';

const pkg = readJSONSync('package.json');

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
      external(),
      del({ targets: 'dist/**/*' }),
    ],
  },
];

export default config;
