import path from 'path';
import { Logger } from '@paperdave/logger';
import { spawnSync } from 'child_process';
import { readdirSync, rmSync, unlinkSync } from 'fs';
import { mkdir, readdir, symlink } from 'fs/promises';
import { RenderCompCommand } from './r';
import { Composition } from '../bmfusion/composition';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { runFFMpeg } from '../util/ffmpeg-progress';

export const FinalRenderCommand = new Command({
  usage: 'ct final [format]',
  desc: 'webm render',
  arrangeFirst: true,
  async run({ project, args }) {
    const format = args._[0];
    const start = performance.now();

    if (format !== 'webm' && format !== 'mp4') {
      Logger.error('Invalid format: ' + format + ', must be webm or mp4');
      return;
    }

    if (!project.hasAudio) {
      Logger.warn('no audio');
      // return;
    }

    const comps = (await readdir(project.paths.comps))
      .filter(x => x !== 'thumbnail.comp')
      .map(x => Composition.fromFile(path.join(project.paths.comps, x)))
      .sort((a, b) => a.RenderRangeStart - b.RenderRangeStart);

    const duration = parseFloat(
      spawnSync(project.paths.execFFprobe, [
        '-i',
        project.paths.audio,
        '-show_entries',
        'format=duration',
        '-v',
        'quiet',
        '-of',
        'csv=p=0',
      ]).stdout.toString() ?? '0'
    );

    const frameCount = Math.ceil(duration * 30);

    let lastFrame = 0;
    let lastComp: Composition = null!;
    let failedRenderRangeCheck: false | 'warn' | 'error' = false;
    for (const comp of comps) {
      if (comp.RenderRangeStart < lastFrame) {
        Logger.error(`overlap found:`);
        Logger.error(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
        Logger.error(`  ${comp.ctLabel} starts at ${comp.RenderRangeStart}`);
        Logger.error(`  (${comp.RenderRangeStart - lastFrame} frames overlap)`);
        failedRenderRangeCheck = 'error';
      } else if (comp.RenderRangeStart > lastFrame) {
        Logger.error(`gap found:`);
        Logger.error(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
        Logger.error(`  ${comp.ctLabel} starts at ${comp.RenderRangeStart}`);
        Logger.error(`  (${comp.RenderRangeStart - lastFrame} frames gap)`);
        failedRenderRangeCheck = 'error';
      }
      lastFrame = comp.RenderRangeEnd + 1;
      lastComp = comp;
    }

    if (lastComp.RenderRangeEnd < frameCount) {
      Logger.warn(`video doesn't reach end of audio:`);
      Logger.warn(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
      Logger.warn(`  project ends at ${frameCount}`);
      Logger.warn(`  (${frameCount - lastComp.RenderRangeEnd} frames)`);
      failedRenderRangeCheck = 'warn';
    } else if (lastComp.RenderRangeEnd > frameCount) {
      Logger.warn(`video extends past end of audio:`);
      Logger.warn(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
      Logger.warn(`  project ends at ${frameCount}`);
      Logger.warn(`  (${frameCount - lastComp.RenderRangeEnd} frames)`);
      failedRenderRangeCheck = 'warn';
    }

    if (failedRenderRangeCheck === 'error') {
      return;
    }
    // if (
    //   failedRenderRangeCheck === 'warn' &&
    //   (
    //     createPrompt('Continue with warnings? [yN] ', {
    //       charLimit: 1,
    //       required: false,
    //     }).value ?? 'n'
    //   ).toLowerCase() !== 'y'
    // ) {
    //   return;
    // }

    Logger.info(`Starting render of ${project.name}`);

    for (const comp of comps) {
      await RenderCompCommand.run({
        project,
        args: [comp.ctLabel!],
      });
    }

    const files = comps.flatMap(comp => {
      const renderRoot = project.getRenderFullPath(RenderProgram.Fusion, comp.ctLabel!);

      return readdirSync(renderRoot)
        .filter(x => x.endsWith('.png'))
        .sort((a, b) => {
          const aNum = parseInt(a.split('.')[0], 10);
          const bNum = parseInt(b.split('.')[0], 10);
          return aNum - bNum;
        })
        .map(x => path.join(renderRoot, x));
    });

    const tmpDir = path.join(project.paths.temp, 'ct_' + Date.now() + '_frames');
    await mkdir(tmpDir);

    await Promise.all(files.map((file, i) => symlink(file, path.join(tmpDir, `${i}.png`))));
    Logger.info(`Created ${files.length} symlinks in ${tmpDir}`);

    const input = path.join(tmpDir, `%d.png`);

    const durationFrames = lastFrame;

    let output = path.join(project.root, project.id);
    if (format === 'webm') {
      output += '.webm';

      // Following is taken from https://developers.google.com/media/vp9/settings/vod/
      // We are targetting 1080p30
      const targetBitrate = 1800;
      const tileColumns = 2;
      const threads = 2 ** tileColumns * 2;
      const targetQuality = 31;
      const speedValue = 2;

      const pass1Args = [
        ['-framerate', '30'],
        ['-i', input],
        project.hasAudio && ['-i', project.paths.audio],
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
        .flat()
        .filter(Boolean) as string[];
      const pass2Args = [
        ['-framerate', '30'],
        ['-i', input],
        project.hasAudio && ['-i', project.paths.audio],
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
        .flat()
        .filter(Boolean) as string[];

      await runFFMpeg(project, pass1Args, { text: 'WEBM Pass 1', durationFrames });
      await runFFMpeg(project, pass2Args, { text: 'WEBM Pass 2', durationFrames });

      unlinkSync(path.join(project.root, `ffmpeg2pass-0.log`));
    } else if (format === 'mp4') {
      output += '.mp4';

      // H264 nvenc
      const ffmpegArgs = [
        ['-framerate', '30'],
        ['-i', input],
        project.hasAudio && ['-i', project.paths.audio],
        ['-preset', 'slow'],
        ['-crf', '18'],
        ['-c:v', 'h264_nvenc'],
        ['-c:a', 'aac'],
        ['-pix_fmt', 'yuv420p'],
        ['-movflags', '+faststart'],
        ['-y', output],
      ]
        .flat()
        .filter(Boolean) as string[];

      await runFFMpeg(project, ffmpegArgs, { text: 'MP4 Render', durationFrames });
    }

    rmSync(tmpDir, { recursive: true });

    Logger.success(
      'Rendered ' + output + ' in ' + ((performance.now() - start) / 1000).toFixed(1) + 's'
    );
  },
});
