const electron = require('electron');

electron.contextBridge.exposeInMainWorld('CTFilm', {
  async initCapture(opts) {
    await electron.ipcRenderer.invoke('initCapture', opts);
  },
  pushFrame(data) {
    electron.ipcRenderer.send('pushFrame', data);
  },
  finishCapture() {
    electron.ipcRenderer.send('finishCapture');
  },
  cancelCapture() {
    electron.ipcRenderer.send('cancelCapture');
  },
});

/* eslint-disable no-console */
const _warn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Electron Security Warning')) {
    return;
  }
  _warn(...args);
};
