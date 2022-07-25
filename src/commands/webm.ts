/* eslint-disable @typescript-eslint/promise-function-async */
import path from 'path/win32';
import { createPrompt } from 'bun-promptx';
import { exec, rmdir } from 'bun-utilities';
import { readdirSync } from 'fs';
import { mkdir, readdir, symlink } from 'fs/promises';
import type { Command } from '..';
import { ArrangeCommand } from './a';
import { RenderCompCommand } from './r';
import { Composition } from '../bmfusion/composition';
import { RenderProgram } from '../project';

export const WebmRenderCommand: Command = {
  usage: 'ct webm',
  desc: 'webm render',
  async run({ project, ...etc }) {
    await ArrangeCommand.run({ ...etc, project, args: { _: [''] } });

    if (!project.hasAudio) {
      console.error('no audio');
      return;
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
    console.log(frameCount);

    let lastFrame = 0;
    let lastComp: Composition = null!;
    let failedRenderRangeCheck: false | 'warn' | 'error' = false;
    for (const comp of comps) {
      if (comp.RenderRangeStart < lastFrame) {
        console.error(`overlap found:`);
        console.error(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
        console.error(`  ${comp.ctLabel} starts at ${comp.RenderRangeStart}`);
        console.error(`  (${comp.RenderRangeStart - lastFrame} frames overlap)`);
        failedRenderRangeCheck = 'error';
      } else if (comp.RenderRangeStart > lastFrame) {
        console.error(`gap found:`);
        console.error(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
        console.error(`  ${comp.ctLabel} starts at ${comp.RenderRangeStart}`);
        console.error(`  (${comp.RenderRangeStart - lastFrame} frames gap)`);
        failedRenderRangeCheck = 'error';
      }
      lastFrame = comp.RenderRangeEnd + 1;
      lastComp = comp;
    }

    if (lastComp.RenderRangeEnd < frameCount) {
      console.warn(`video doesn't reach end of audio:`);
      console.warn(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
      console.warn(`  project ends at ${frameCount}`);
      console.warn(`  (${frameCount - lastComp.RenderRangeEnd} frames)`);
      failedRenderRangeCheck = 'warn';
    } else if (lastComp.RenderRangeEnd > frameCount) {
      console.warn(`video extends past end of audio:`);
      console.warn(`  ${lastComp.ctLabel} ends at ${lastFrame}`);
      console.warn(`  project ends at ${frameCount}`);
      console.warn(`  (${frameCount - lastComp.RenderRangeEnd} frames)`);
      failedRenderRangeCheck = 'warn';
    }

    if (failedRenderRangeCheck === 'error') {
      return;
    }
    if (
      failedRenderRangeCheck === 'warn' &&
      (
        createPrompt('Continue with warnings? [yN] ', {
          charLimit: 1,
          required: false,
        }).value ?? 'n'
      ).toLowerCase() !== 'y'
    ) {
      return;
    }

    console.log(`Starting render of ${project.name}`);

    for (const comp of comps) {
      await RenderCompCommand.run({
        ...etc,
        project,
        args: { _: [comp.ctLabel!] },
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

    const padLength = files.length.toString().length;
    await Promise.all(files.map((file, i) => symlink(file, path.join(tmpDir, `${i}.png`))));
    console.log(`Created ${files.length} symlinks in ${tmpDir}`);

    const input = path.join(tmpDir, `%d.png`);
    const output = path.join(project.root, `${project.id}.webm`);

    const targetBitrate = 1800;
    const tileColumns = 2;
    const threads = 2 ** tileColumns * 2;
    const targetQuality = 31;
    const speedValue = 2;

    const pass1Args = [
      project.paths.execFFmpeg,
      ['-framerate', '30'],
      ['-i', input],
      ['-i', project.paths.audio],
      ['-b:v', `${targetBitrate}k`],
      ['-minrate', `${targetBitrate * 0.5}k`],
      ['-maxrate', `${targetBitrate * 1.45}k`],
      ['-tile-columns', `${tileColumns}`],
      ['-g', `240`],
      ['-threads', `${threads}`],
      ['-quality', 'good'],
      ['-crf', `${targetQuality}`],
      ['-c:v', 'libvpx-vp9'],
      ['-c:a', 'libopus'],
      ['-pass', '1'],
      ['-speed', '4'],
      '-y',
      output,
    ].flat();
    const pass2Args = [
      project.paths.execFFmpeg,
      ['-framerate', '30'],
      ['-i', input],
      ['-i', project.paths.audio],
      ['-b:v', `${targetBitrate}k`],
      ['-minrate', `${targetBitrate * 0.5}k`],
      ['-maxrate', `${targetBitrate * 1.45}k`],
      ['-tile-columns', `${tileColumns}`],
      ['-g', `240`],
      ['-threads', `${threads}`],
      ['-quality', 'good'],
      ['-crf', `${targetQuality}`],
      ['-c:v', 'libvpx-vp9'],
      ['-c:a', 'libopus'],
      ['-pass', '2'],
      ['-speed', `${speedValue}`],
      '-y',
      output,
    ].flat();

    console.log(pass1Args.join(' '));
    const pass1 = exec(pass1Args);
    if (pass1.exitCode) {
      console.error(`pass1 failed: ${pass1.stderr}`);
      return;
    }
    console.log(pass1.stdout);

    console.log(pass2Args.join(' '));
    const pass2 = exec(pass2Args);
    if (pass2.exitCode) {
      console.error(`pass2 failed: ${pass1.stderr}`);
      return;
    }
    console.log(pass2.stdout);

    rmdir(tmpDir, { recursive: true });

    console.log('Done');
  },
};

// https://developers.google.com/media/vp9/settings/vod/
// ```
// ffmpeg -i tearsofsteel_4k.mov -vf scale=1920x1080 -b:v 1800k \
//   -minrate 900k -maxrate 2610k -tile-columns 2 -g 240 -threads 8 \
//   -quality good -crf 31 -c:v libvpx-vp9 -c:a libopus \
//   -pass 1 -speed 4 tos-1920x1080-24-30fps.webm && \
// ffmpeg -i tearsofsteel_4k.mov -vf scale=1920x1080 -b:v 1800k \
//   -minrate 900k -maxrate 2610k -tile-columns 3 -g 240 -threads 8 \
//   -quality good -crf 31 -c:v libvpx-vp9 -c:a libopus \
//   -pass 2 -speed 4 -y tos-1920x1080-24-30fps.webm
// ```
