import path from 'path';
import { error, info } from '@paperdave/logger';
import { range } from '@paperdave/utils';
import { exec } from 'bun-utilities/spawn';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { mkdir, readdir, unlink } from 'fs/promises';
import { Composition } from '../bmfusion/composition';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { exists, readJSON, writeJSON } from '../util/fs';

export const RenderCompCommand = new Command({
  usage: 'ct r <...comps>',
  desc: 'render comp(s) by label',
  flags: [{ name: '--force -f', desc: 'clears cache' }],
  arrangeFirst: true,
  async run({ project, args }) {
    const search = args._[0];
    const force = args.force || args.f;
    if (!search) {
      error('usage: ct r <...comps>');
      return;
    }

    const allCompNames = (await readdir(project.paths.comps)).filter(x => x.endsWith('.comp'));

    const [selectedName, ...otherNames] = allCompNames.filter(
      x =>
        x === search ||
        x.replace(/^[0-9]+-[0-9]+_/, '').replace(/.comp$/, '') === search ||
        x.replace(/.comp$/, '') === search
    );

    if (!selectedName) {
      error(`Could not find comp named ${search}`);
      return;
    }
    if (otherNames.length > 0) {
      error(`Found multiple comps named ${search}: ${[selectedName, ...otherNames].join(', ')}`);
      return;
    }

    info(`Rendering ${selectedName}`);

    const compPath = path.join(project.paths.comps, selectedName);
    const prefix = selectedName.replace(/^[0-9]+-[0-9]+_/, '').replace(/.comp$/, '');
    const renderPath = project.getRenderFullPath(RenderProgram.Fusion, prefix);

    const comp = new Composition(readFileSync(compPath, 'utf-8'));

    // const hashed = Bun.SHA1.hash(await Bun.file(compPath).arrayBuffer());
    // const hex = [...hashed].map(x => x.toString(16).padStart(2, '0')).join('');
    const hex = createHash('sha1').update(readFileSync(compPath)).digest('hex');

    await mkdir(renderPath, { recursive: true });

    let toRender = [...range(comp.RenderRange[0], comp.RenderRange[1] + 1)];

    const renderJSONFile = path.resolve(renderPath, '.render.json');
    if (await exists(renderJSONFile)) {
      const parsed = (await readJSON(renderJSONFile)) as any;

      const files = await readdir(renderPath);
      if (parsed.hash === hex && !force) {
        toRender = [];
        for (const i of range(parsed.start, parsed.end + 1)) {
          if (!files.includes(`${i.toString().padStart(4, '0')}.png`)) {
            toRender.push(i);
          }
        }
        if (toRender.length === 0) {
          info('Up to Date.');
          return;
        }
      } else {
        for (const file of files) {
          await unlink(path.join(renderPath, file));
        }
      }
    }

    await writeJSON(renderJSONFile, {
      version: 1,
      hash: hex,
      project: project.json,
      start: comp.RenderRangeStart,
      end: comp.RenderRangeEnd,
    });

    const ranges = [];
    let currentRange = { start: toRender[0], end: toRender[0] };
    for (const i of toRender.slice(1)) {
      if (i === currentRange.end + 1) {
        currentRange.end = i;
      } else {
        ranges.push(currentRange);
        currentRange = { start: i, end: i };
      }
    }
    ranges.push(currentRange);

    const frameset = ranges
      .map(({ start, end }) => (start === end ? start : `${start}..${end}`))
      .join(',');

    const renderArgs = [
      project.paths.execFusionRender,
      '-render',
      compPath,
      '-frames',
      frameset,
      '-quit',
    ];

    const out = exec(renderArgs);
    if (!out.isExecuted) {
      error('Failed to render comp');
      process.exit(1);
    }
  },
});
