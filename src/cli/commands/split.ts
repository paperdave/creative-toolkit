import path from 'path';
import { Composition } from '$/fusion-format';
import { Logger } from '@paperdave/logger';
import { RunCommand } from '..';

export const run: RunCommand = async ({ project }) => {
  // todo real args
  const id = process.argv[2];
  const at = Number(process.argv[3]);
  const to = process.argv[4] ?? `${id}_split`;

  if (!id || !at || isNaN(at)) {
    Logger.error('usage: ct split [id] [at] <to>');
    return;
  }

  const clips = await project.getRawClips();
  const clip = clips.find(c => c.label === id);

  if (!clip) {
    Logger.error(`Could not find comp ${id}`);
    return;
  }

  const first = Composition.fromFileSync(clip.filename);
  if (first.RenderRangeStart > at || first.RenderRangeEnd < at) {
    Logger.error(`${id} doesnt have the frame # ${at}, range is ${first.RenderRange.join('-')}`);
    return;
  }

  const second = first.clone();

  first.RenderRangeEnd = at - 1;
  second.RenderRangeStart = at;

  first.writeAndMoveFile();
  second.writeAndMoveFile(path.join(path.dirname(clip.filename), `${to}.comp`));

  await project.arrange();
};
