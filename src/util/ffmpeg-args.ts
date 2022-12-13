import { Logger } from '@paperdave/logger';
import { spawnSync } from 'child_process';

export interface FfmpegArgsOptions {
  audio?: string;
}

// H264 / MP4

let cachedNvencAvailable: boolean | null = null;
export function isNvencAvailable(): boolean {
  if (cachedNvencAvailable == null) {
    const process = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], {
      stdio: ['inherit', 'pipe', 'inherit'],
    });
    const text = new TextDecoder().decode(process.stdout);
    cachedNvencAvailable = text.includes('nvenc');

    if (!cachedNvencAvailable) {
      Logger.warn(`hardware accelerated video encoding is not available (nvenc)`);
      Logger.warn(`please make sure you have an nvidia graphics card and latest drivers`);
      Logger.warn('falling back to software encoding, which will be VERY slow.');
    }
  }
  return cachedNvencAvailable;
}

export function getFfmpegH264Args({ audio }: FfmpegArgsOptions) {
  return [
    audio ? ['-i', audio] : [],
    ['-c:v', isNvencAvailable() ? 'h264_nvenc' : 'libx264'],
    ['-preset:v', 'slow'],
    ['-tune:v', 'hq'],
    ['-rc:v', 'vbr'],
    ['-cq:v', '18'],
    ['-b:v', '0'],
    ['-profile:v', 'high'],
    ['-pix_fmt', 'yuv420p'],
    ['-movflags', '+faststart'],
    ...(audio
      ? [
          ['-c:a', 'aac'],
          ['-b:a', '128k'],
        ]
      : []),
  ].flat();
}

// VP9 / WEBM

// Following is taken from https://developers.google.com/media/vp9/settings/vod/
// We are targetting 1080p60
const targetBitrate = 3000;
const tileColumns = 2;
const threads = 2 ** tileColumns * 2;
const targetQuality = 31;
const speedValue = 2;

export function getFfmpegVP9Pass1Args({}: FfmpegArgsOptions) {
  // todo: allow user to configure the values, preferably using the target resolution + fps
  return [
    ['-b:v', `${targetBitrate}k`],
    ['-minrate', `${targetBitrate * 0.5}k`],
    ['-maxrate', `${targetBitrate * 1.45}k`],
    ['-tile-columns', `${tileColumns}`],
    ['-g', `240`],
    ['-threads', `${threads}`],
    ['-quality', 'good'],
    ['-crf', `${targetQuality}`],
    ['-c:v', 'libvpx-vp9'],
    ['-pass', '1'],
    ['-speed', '4'],
  ].flat();
}

export function getFfmpegVP9Pass2Args({ audio }: FfmpegArgsOptions) {
  return [
    ['-b:v', `${targetBitrate}k`],
    ['-minrate', `${targetBitrate * 0.5}k`],
    ['-maxrate', `${targetBitrate * 1.45}k`],
    ['-tile-columns', `${tileColumns}`],
    ['-g', `240`],
    ['-threads', `${threads}`],
    ['-quality', 'good'],
    ['-crf', `${targetQuality}`],
    ['-c:v', 'libvpx-vp9'],
    ['-pass', '2'],
    ['-speed', `${speedValue}`],
    ...(audio
      ? [
          ['-i', audio],
          ['-c:a', 'libopus'],
          ['-b:a', '128k'],
        ]
      : []),
  ].flat();
}
