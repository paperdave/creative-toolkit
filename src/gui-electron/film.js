import { info } from '@paperdave/logger';
import { spawn } from 'child_process';

let ffmpeg;
let port;

Electron.ipcMain.on('ctfilm.create', event => {
  port = event.ports[0];
  if (!port) {
    throw new Error('No port');
  }
  port.on('message', (msg, uh) => {
    console.log(msg, uh);
  });
  port.start();
  port.postMessage('OK');

  // const { startFrame, endFrame, targetId } = props;

  // info(`Saving Take: ${startFrame} - ${endFrame}`);

  // ffmpeg = spawn(
  //   'ffmpeg',
  //   [
  //     '-y',
  //     '-f',
  //     'rawvideo',
  //     '-vcodec',
  //     'rawvideo',
  //     '-pix_fmt',
  //     'rgba',
  //     '-s',
  //     `${1920}x${1080}`,
  //     '-r',
  //     '60',
  //     '-i',
  //     '-',
  //     '-c:v',
  //     'h264_nvenc',
  //     '-pix_fmt',
  //     'yuv420p',
  //     '-preset',
  //     'slow',
  //     '-crf',
  //     '19',
  //     '/project/test/test.mp4',
  //   ],
  //   {
  //     stdio: 'pipe',
  //     windowsHide: true,
  //   }
  // );

  // ffmpeg.stdout.pipe(process.stdout);
  // ffmpeg.stderr.pipe(process.stderr);
});

// Electron.ipcMain.on('pushFrame', (ev, data) => {
//   ffmpeg.stdin.write(Buffer.from(data));
// });

Electron.ipcMain.on('finishCapture', async () => {
  const now = Date.now();
  ffmpeg.stdin.end();
  ffmpeg.on('close', () => {
    info(`time after last frame: ${Date.now() - now}ms`);
  });
});

Electron.ipcMain.on('cancelCapture', async () => {
  ffmpeg.kill();

  await rm(path.join(dir, `take${n}.mp4`));
});
