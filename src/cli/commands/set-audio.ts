/* eslint-disable no-alert */
import { RunCommand } from '$/cli';
import { appPath } from '$/global/exec-paths';
import { Logger } from '@paperdave/logger';
import { existsSync } from 'fs';

export const run: RunCommand = async ({ project }) => {
  // TODO: args
  const file = process.argv[3];
  if (!file) {
    Logger.error('no file specified');
    return;
  }
  if (!existsSync(file)) {
    Logger.error(`"${file}" does not exist`);
    return;
  }
  if (project.hasAudio) {
    const result = (prompt('project already has audio, overwrite? [y/N] ') ?? 'n').toLowerCase();
    if (result !== 'y') {
      return;
    }
  }
  const result = Bun.spawnSync({
    cmd: [
      appPath.ffmpeg,
      '-hide_banner',
      '-i',
      file,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '44100',
      project.paths.audio,
      '-y',
    ],
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  if (result.exitCode !== 0) {
    Logger.error('ffmpeg failed to convert audio');
    return;
  }
  project.hasAudio = true;
  Logger.success('set audio, running arrange to sync project files.');
  await project.getClips();
};
