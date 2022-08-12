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
  }
});
