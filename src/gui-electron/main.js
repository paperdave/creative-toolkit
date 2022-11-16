import path from 'path';
import { fileURLToPath } from 'url';
import { startViteDevServer } from './vite.js';

const gui = await startViteDevServer();

const win = new Electron.BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(path.dirname(fileURLToPath(import.meta.url)), './preload.cjs'),
    webSecurity: false,
  },
});

const url = new URL(gui.url);
if (process.argv[3]) {
  url.searchParams.set('project-id', process.argv[3]);
}
url.searchParams.set('electron-version', process.versions.electron);
url.searchParams.set('node-version', process.versions.node);
win.loadURL(url.toString());

win.on('closed', () => {
  gui.stop();
  Electron.app.quit();
});
