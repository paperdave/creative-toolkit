const electron = require('electron');
const child_process = require('child_process');

let ffmpeg;
electron.contextBridge.exposeInMainWorld('CTFilmBackend', {
  async initCapture(opts) {
    ffmpeg = child_process.spawn(
      'ffmpeg',
      [
        '-y',
        '-f',
        'rawvideo',
        '-vcodec',
        'rawvideo',
        '-pix_fmt',
        'rgba',
        '-s',
        `1920x1080`,
        '-r',
        '60',
        '-i',
        '-',
        '-c:v',
        'h264_nvenc',
        '-pix_fmt',
        'yuv420p',
        '-preset',
        'slow',
        '-crf',
        '19',
        '/project/test/test.mp4',
      ],
      {
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
      }
    );
  },
  pushFrame(data) {
    ffmpeg.stdin.write(data);
    return null;
  },
  finishCapture() {
    ffmpeg.stdin.end();
  },
  cancelCapture() {
    ffmpeg.kill();
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
