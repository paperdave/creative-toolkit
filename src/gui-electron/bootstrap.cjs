globalThis.electron = globalThis.electron || require('electron');
electron.app.whenReady().then(() => {
  import('./main.js');
});
