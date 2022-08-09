import { startServer } from './server';
import { resolveProject } from './project';
import path from 'path';
import { fileURLToPath } from 'url';
import { type ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { info } from '@paperdave/logger';

const project = await resolveProject(process.cwd(), { });
await startServer(project);

let ffmpeg: ChildProcessWithoutNullStreams;

Electron.ipcMain.on('initCapture', (ev, props) => {
  // ffmpeg to convert RGBA data into a mp4
  ffmpeg = spawn(
    project.paths.execFFmpeg,
    [
      '-y',
      '-f', 'rawvideo',
      '-vcodec', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${1920}x${1080}`,
      '-r', '30',
      '-i', '-',
      '-vcodec', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '18',
      '-r', '30',
      '-g', '30',
      '-bf', '0',
      '-threads', '0',
      '-vf', 'scale=1920:1080',
      '-f', 'mp4',
      '-movflags', 'faststart',
      '-loglevel', 'error',
      'out.mp4',
    ],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
    }
  );
});

Electron.ipcMain.on('pushFrame', (ev, data: Uint8ClampedArray) => {
  ffmpeg.stdin.write(Buffer.from(data));
});

Electron.ipcMain.on('finishCapture', () => {
  const now = Date.now();
  ffmpeg.stdin.end();
  ffmpeg.on('close', () => {
    info(`time after last frame: ${Date.now() - now}ms`);
  });
});

const win = new Electron.BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/electron-preload.js'),
  },
});
win.loadURL(`http://localhost:18325`);
