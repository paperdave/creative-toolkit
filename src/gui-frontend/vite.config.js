import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [
    //
    sveltekit(),
    nodePolyfills({ protocolImports: true }),
  ],
  server: {
    fs: {
      allow: ['./', '../../assets/'],
    },
  },
};

export default config;
