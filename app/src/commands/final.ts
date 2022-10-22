import path from 'path';
import { Logger } from '@paperdave/logger';
import { spawnSync } from 'child_process';
import { readdir } from 'fs/promises';
import { Command } from '../cmd';
import { createVideo } from '../render-video';
import { Composition } from '../../../src/fusion/Composition';

export const FinalRenderCommand = new Command({
  usage: 'ct final [format]',
  desc: 'webm render',
  arrangeFirst: true,
  async run({ project, args }) {
    const format = args._[0];

    if (format !== 'webm' && format !== 'mp4') {
      Logger.error('Invalid format: ' + format + ', must be webm or mp4');
      return;
    }

    if (!project.hasAudio) {
      // TODO: support no audio
      Logger.warn('no audio');
      return;
    }

    const comps = (await readdir(project.paths.comps))
      .filter(x => x !== 'thumbnail.comp')
      .map(x => Composition.fromFileSync(path.join(project.paths.comps, x)))
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

    // const frameCount = Math.ceil(duration * 30);
    const frameCount = 6676;

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

    await createVideo(project, path.join(project.root, `${project.id}.${format}`), {
      start: 0,
      end: frameCount,
    });
  },
});
