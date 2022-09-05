import path from 'path';
import { Logger } from '@paperdave/logger';
import { Command } from '../cmd';
import { createVideo } from '../render-video';

export const PreviewMp4Command = new Command({
  usage: 'ct mp4 <start> <end>',
  desc: 'preview mp4',
  arrangeFirst: true,
  async run({ project, args }) {
    const start = parseInt(args._[0]);
    const end = parseInt(args._[1]);

    if (isNaN(start) || isNaN(end)) {
      Logger.error('Invalid start or end');
      return;
    }

    const output = path.join(
      project.paths.preview,
      `${[start, end].map(x => `${x}`.padStart(5, '0')).join('-')}.mp4`
    );

    await createVideo(project, output, { start, end });
  },
});
