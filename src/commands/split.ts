import path from 'path';
import { readdir } from 'fs/promises';
import { ArrangeCommand } from './a';
import { Composition } from '../bmfusion/composition';
import { Command } from '../cmd';

export const SplitCommand = new Command({
  usage: 'ct split <id> <at> [to]',
  desc: 'split a fusion comp',
  async run({ project, args }) {
    const id = args._[0];
    const at = Number(args._[1]);
    const to = args._[2] ?? `${id}_split`;

    if (!id || !at || isNaN(at)) {
      console.error('usage: ct split [id] [at]');
      return;
    }

    const foundId = (await readdir(project.paths.comps))
      .filter(filename => filename.endsWith('.comp'))
      .map(x => [Composition.nameToCTLabel(x), x])
      .find(([label, filename]) => label === id);

    if (!foundId) {
      console.error(`Could not find comp ${id}`);
      return;
    }

    const first = Composition.fromFileSync(path.join(project.paths.comps, foundId[1]));
    if (first.RenderRangeStart > at || first.RenderRangeEnd < at) {
      console.error(`${id} doesnt have the frame # ${at}, range is ${first.RenderRange.join('-')}`);
      return;
    }

    const second = first.clone();

    first.RenderRangeEnd = at - 1;
    second.RenderRangeStart = at;

    first.writeAndMoveFile();
    second.writeAndMoveFile(path.join(project.paths.comps, `${to}.comp`));

    await ArrangeCommand.run({ project });
  },
});
