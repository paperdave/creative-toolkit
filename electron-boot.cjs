globalThis.Electron = globalThis.Electron || require('electron');
Electron.app.whenReady().then(() => {
  import('./dist/electron.js');
});
