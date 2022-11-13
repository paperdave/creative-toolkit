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

win.loadURL(gui.url);

win.on('closed', () => {
  gui.stop();
  Electron.app.quit();
});
