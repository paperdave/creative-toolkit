import path from 'path';
import { fileURLToPath } from 'url';
import { startViteDevServer } from './vite.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

process.chdir(path.join(dirname, '../gui-frontend'));

const gui = await startViteDevServer();

const win = new Electron.BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(dirname, './preload.cjs'),
    webSecurity: false,
  },
});

const url = new URL(gui.url);
if (process.argv[3]) {
  url.pathname = `/${process.argv[3]}`;
}
url.searchParams.set('electron-version', process.versions.electron);
url.searchParams.set('node-version', process.versions.node);
win.loadURL(url.toString());

win.on('closed', () => {
  gui.stop();
  Electron.app.quit();
});
