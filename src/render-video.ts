import path from 'path';
import { mkdir, rm } from 'fs/promises';
import { RenderQueue, RenderRange } from './fusion-render-queue';
import { Project } from './project';
import { runFFMpeg } from './util/ffmpeg-progress';

export async function createVideo(project: Project, output: string, range: RenderRange) {
  const queue = await RenderQueue.create(project);
  queue.add(range);
  await queue.render();

  const durationFrames = range.end - range.start + 1;

  const baseArgs = [
    '-hide_banner',
    ['-framerate', '30'],
    ['-f', 'image2pipe'],
    ['-i', '-'],
    project.hasAudio && [
      ['-ss', range.start / 30],
      ['-t', durationFrames / 30],
      ['-i', project.paths.audio],
    ],
  ];

  await mkdir(path.dirname(output), { recursive: true });

  if (output.endsWith('.webm')) {
    // Following is taken from https://developers.google.com/media/vp9/settings/vod/
    // We are targetting 1080p30
    const targetBitrate = 1800;
    const tileColumns = 2;
    const threads = 2 ** tileColumns * 2;
    const targetQuality = 31;
    const speedValue = 2;

    const pass1Args = [
      ...baseArgs,
      ['-b:v', `${targetBitrate}k`],
      ['-minrate', `${targetBitrate * 0.5}k`],
      ['-maxrate', `${targetBitrate * 1.45}k`],
      ['-tile-columns', `${tileColumns}`],
      ['-g', `240`],
      ['-threads', `${threads}`],
      ['-quality', 'good'],
      ['-crf', `${targetQuality}`],
      ['-c:v', 'libvpx-vp9'],
      project.hasAudio && ['-c:a', 'libopus'],
      ['-pass', '1'],
      ['-speed', '4'],
      '-y',
      output,
    ]
      .flat(5)
      .filter(x => x != undefined) as string[];

    const pass2Args = [
      ...baseArgs,
      ['-b:v', `${targetBitrate}k`],
      ['-minrate', `${targetBitrate * 0.5}k`],
      ['-maxrate', `${targetBitrate * 1.45}k`],
      ['-tile-columns', `${tileColumns}`],
      ['-g', `240`],
      ['-threads', `${threads}`],
      ['-quality', 'good'],
      ['-crf', `${targetQuality}`],
      ['-c:v', 'libvpx-vp9'],
      project.hasAudio && ['-c:a', 'libopus'],
      ['-pass', '2'],
      ['-speed', `${speedValue}`],
      '-y',
      output,
    ]
      .flat(5)
      .filter(x => x != undefined) as string[];

    await runFFMpeg(project, pass1Args, {
      text: 'WEBM Pass 1',
      durationFrames,
      stream: queue.getPNGStream(range),
    });
    await runFFMpeg(project, pass2Args, {
      text: 'WEBM Pass 2',
      durationFrames,
      stream: queue.getPNGStream(range),
    });

    await rm(path.join(path.dirname(output), `ffmpeg2pass-0.log`));
  } else if (output.endsWith('.mp4')) {
    // H264 nvenc
    const ffmpegArgs = [
      ...baseArgs,
      ['-preset', 'slow'], // Slow is pretty fast
      ['-crf', '18'],
      ['-c:v', 'h264_nvenc'], // TODO: detect if nvenc is available and fallback to software (super slow)
      ['-c:a', 'aac'],
      ['-pix_fmt', 'yuv420p'],
      ['-movflags', '+faststart'],
      '-y',
      output,
    ]
      .flat(5)
      .filter(x => x != undefined) as string[];

    await runFFMpeg(project, ffmpegArgs, {
      text: 'MP4 Render',
      durationFrames,
      stream: queue.getPNGStream(range),
    });
  } else {
    throw new Error(`Unsupported output format: ${path.extname(output)}`);
  }
}
