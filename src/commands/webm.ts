import path from 'path';
import { Logger } from '@paperdave/logger';
import { exec } from 'bun-utilities/spawn';
import { readdirSync, rmdirSync, unlinkSync } from 'fs';
import { mkdir, readdir, symlink } from 'fs/promises';
import { RenderCompCommand } from './r';
import { Composition } from '../bmfusion/composition';
import { Command } from '../cmd';
import { RenderProgram } from '../project';

export const WebmRenderCommand = new Command({
  usage: 'ct webm',
  desc: 'webm render',
  arrangeFirst: true,
  async run({ project }) {
    if (!project.hasAudio) {
      Logger.warn('no audio');
      // return;
    }

    const comps = (await readdir(project.paths.comps))
      .filter(x => x !== 'thumbnail.comp')
      .map(x => Composition.fromFile(path.join(project.paths.comps, x)))
      .sort((a, b) => a.RenderRangeStart - b.RenderRangeStart);

    const duration = parseFloat(
      exec([
        project.paths.execFFprobe,
        '-i',
        project.paths.audio,
        '-show_entries',
        'format=duration',
        '-v',
        'quiet',
        '-of',
        'csv=p=0',
      ]).stdout ?? '0'
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
    const output = path.join(project.root, `${project.id}.webm`);

    // Following is taken from https://developers.google.com/media/vp9/settings/vod/
    // We are targetting 1080p30
    const targetBitrate = 1800;
    const tileColumns = 2;
    const threads = 2 ** tileColumns * 2;
    const targetQuality = 31;
    const speedValue = 2;

    const pass1Args = [
      project.paths.execFFmpeg,
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
      .filter(Boolean);
    const pass2Args = [
      project.paths.execFFmpeg,
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
      .filter(Boolean);

    Logger.info('FFmpeg Pass 1');
    const pass1 = exec(pass1Args);
    if (pass1.exitCode) {
      Logger.error(`pass1 failed: ${pass1.stderr}`);
      return;
    }

    Logger.info('FFmpeg Pass 2');
    const pass2 = exec(pass2Args);
    if (pass2.exitCode) {
      Logger.error(`pass2 failed: ${pass1.stderr}`);
      return;
    }

    rmdirSync(tmpDir, { recursive: true });
    unlinkSync(path.join(project.root, `ffmpeg2pass-0.log`));

    Logger.success('Rendered ' + output);
  },
});
