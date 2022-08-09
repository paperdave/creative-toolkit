const electron = require('electron');

electron.contextBridge.exposeInMainWorld('CTFilm', {
  initCapture(opts) {
    electron.ipcRenderer.send('initCapture', opts);
  },
  pushFrame(data) {
    electron.ipcRenderer.send('pushFrame', data);
  },
  finishCapture() {
    electron.ipcRenderer.send('finishCapture');
  }
});
