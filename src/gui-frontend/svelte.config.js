import { Logger } from '@paperdave/logger';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),
  kit: {
    alias: {
      $data: './data',
      $components: './components',
      $assets: '../../assets/',
    },
    adapter: {
      adapt() {
        Logger.warn('do not vite build this yet');
      },
      name: 'noop',
    },
    files: {
      appTemplate: './index.html',
      routes: './routes',
      params: './params',
      hooks: {
        client: './hooks.ts',
      },
    },
    trailingSlash: 'always',
  },
};

export default config;
