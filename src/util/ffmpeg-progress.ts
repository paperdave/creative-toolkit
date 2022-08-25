import { Progress } from '@paperdave/logger';
import type { FFMpegProgressOptions, IFFMpegProgressData } from 'ffmpeg-progress-wrapper';
import { FFMpegProgress } from 'ffmpeg-progress-wrapper';
import type { Project } from '../project';

interface RunFFMpegOptions
  extends Pick<FFMpegProgressOptions, 'cwd' | 'duration' | 'env' | 'maxMemory'> {
  text?: string;
  durationFrames?: number;
}

export async function runFFMpeg(project: Project, args: string[], opts: RunFFMpegOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    let log = '';
    const ffmpeg = new FFMpegProgress(args, {
      cmd: project.paths.execFFmpeg,
      hideFFConfig: true,
      cwd: project.root,
      ...opts,
    });
    const bar = new Progress({
      text: opts.text ?? 'FFmpeg',
      total: 1,
    });
    ffmpeg.on('progress', (data: IFFMpegProgressData) => {
      if (data.progress) {
        bar.update(data.progress);
      } else if (data.frame && opts.durationFrames) {
        bar.update(data.frame / opts.durationFrames);
      }
    });
    ffmpeg.on('raw', (data: string) => {
      log += data;
    });
    ffmpeg.once('end', code => {
      if (code !== 0) {
        bar.error(`${opts.text}: exited with code ${code}`);
        reject(new Error(log));
      } else {
        bar.success(`${opts.text}: completed`);
        resolve();
      }
    });
  });
}
