import path from 'path';
import { info } from '@paperdave/logger';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { mkdir, readdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';
import { resolveProject } from './project';
import { startServer } from './server';
import { exists, readJSON, writeJSON } from './util/fs';

const project = await resolveProject(process.cwd(), {});
await startServer(project);

let ffmpeg: ChildProcessWithoutNullStreams;
let dir: string;
let n: number;

Electron.ipcMain.handle('initCapture', async (ev, props) => {
  const { startFrame, endFrame, groupId } = props;

  info(`Saving Take: ${startFrame} - ${endFrame}`);

  dir = path.join(project.paths.film, `${startFrame}-${endFrame}_${groupId}`);

  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }

  const list = await readdir(dir);

  n = 1;
  while (list.includes(`take${n}.mp4`)) {
    n++;
  }

  const saveTo = path.join(dir, `take${n}.mp4`);

  if (!(await exists(path.join(dir, 'metadata.json')))) {
    await writeJSON(path.join(dir, 'metadata.json'), {
      id: groupId,
      date: new Date().toISOString(),
      takes: [],
    });
  }

  ffmpeg = spawn(
    project.paths.execFFmpeg,
    [
      '-y',
      '-f',
      'rawvideo',
      '-vcodec',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${1920}x${1080}`,
      '-r',
      '30',
      '-i',
      '-',
      '-c:v',
      'h264_nvenc',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'slow',
      '-crf',
      '18',
      saveTo,
    ],
    {
      stdio: 'pipe',
      windowsHide: true,
    }
  );

  ffmpeg.stdout.pipe(process.stdout);
  ffmpeg.stderr.pipe(process.stderr);
});

Electron.ipcMain.on('pushFrame', (ev, data: Uint8ClampedArray) => {
  ffmpeg.stdin.write(Buffer.from(data));
});

Electron.ipcMain.on('finishCapture', async () => {
  const now = Date.now();
  ffmpeg.stdin.end();
  ffmpeg.on('close', () => {
    info(`time after last frame: ${Date.now() - now}ms`);
  });

  const metadata = (await readJSON(path.join(dir, 'metadata.json'))) as any;
  metadata.takes.push({
    id: n,
    date: new Date().toISOString(),
    export: null,
  });
  await writeJSON(path.join(dir, 'metadata.json'), metadata);
});

Electron.ipcMain.on('cancelCapture', async ev => {
  ffmpeg.kill();

  await rm(path.join(dir, `take${n}.mp4`));
});

const win = new Electron.BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/electron-preload.js'),
  },
});
win.loadURL(`http://localhost:18325`);
