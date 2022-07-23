#!/usr/bin/env bun
// CLI sets up composition names and saver format
import path from 'path';
// @ts-expect-error waiting for updated utils to fix typedefs
import { range } from '@davecode/utils';
import { exec } from 'bun-utilities';
import { pascalCase } from 'change-case';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { Composition } from '../bmfusion/composition';
import { COMP_ROOT, PATH_TO_FUSION, PROJECT_NAME, RENDER_ROOT } from '../vars';

export async function renderFusionComp(COMP_INPUT_TEXT: string) {
  const allComps = readdirSync(COMP_ROOT).filter(x => x.endsWith('.comp'));
  const [selectedName, ...otherNames] = allComps.filter(
    x =>
      x === COMP_INPUT_TEXT ||
      x.replace(/^[0-9]+-[0-9]+_/, '').replace(/.comp$/, '') === COMP_INPUT_TEXT ||
      x.replace(/.comp$/, '') === COMP_INPUT_TEXT
  );

  if (!selectedName) {
    console.log(`Could not find comp named ${COMP_INPUT_TEXT}`);
    process.exit(1);
  }
  if (otherNames.length > 0) {
    console.log(
      `Found multiple comps named ${COMP_INPUT_TEXT}: ${[selectedName, ...otherNames].join(', ')}`
    );
    process.exit(1);
  }

  console.log(`Found comp named ${selectedName}`);

  const compPath = path.join(COMP_ROOT, selectedName);
  const prefix = selectedName.replace(/^[0-9]+-[0-9]+_/, '').replace(/.comp$/, '');
  const COMP_RENDER_ROOT = path.join(
    RENDER_ROOT,
    `${pascalCase(PROJECT_NAME)}-Fusion-${pascalCase(prefix)}`
  );

  const comp = new Composition(await Bun.file(compPath).text());

  const hashed = Bun.SHA1.hash(await Bun.file(compPath).arrayBuffer());
  const hex = [...hashed].map(x => x.toString(16).padStart(2, '0')).join('');

  mkdirSync(COMP_RENDER_ROOT, { recursive: true });

  let toRender = range(comp.RenderRange[0], comp.RenderRange[1] + 1);

  const renderMeta = Bun.file(path.join(COMP_RENDER_ROOT, '.render.json'));
  if (existsSync(path.join(COMP_RENDER_ROOT, '.render.json'))) {
    const parsed = await renderMeta.json();

    const files = readdirSync(COMP_RENDER_ROOT);
    if (parsed.hash === hex) {
      toRender = [];
      for (const i of range(parsed.start, parsed.end + 1)) {
        if (!files.includes(`${i.toString().padStart(4, '0')}.png`)) {
          toRender.push(i);
        }
      }
      if (toRender.length === 0) {
        console.log('Up to Date.');
        process.exit(0);
      }
    } else {
      for (const file of files) {
        unlinkSync(path.join(COMP_RENDER_ROOT, file));
      }
    }
  }

  await Bun.write(
    Bun.file(path.join(COMP_RENDER_ROOT, '.render.json')),
    JSON.stringify({
      version: 1,
      hash: hex,
      project: PROJECT_NAME,
      start: comp.RenderRangeStart,
      end: comp.RenderRangeEnd,
    })
  );

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

  const args = [PATH_TO_FUSION, '-render', compPath, '-frames', frameset, '-quit'];

  console.log('executing "' + args.join(' ') + '"');

  const out = exec(args);
  if (!out.isExecuted) {
    console.log('Failed to render comp');
    process.exit(1);
  }
}
