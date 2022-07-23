#!/usr/bin/env bun
import minimist from 'minimist';
import path from 'path';
import { exec } from 'bun-utilities';
import { arrangeComps } from './commands/arrange';
import { renderFusionComp } from './commands/render-one';
import { setPaths } from './vars';

const y = exec;

const argv = minimist(process.argv.slice(2));

if (argv.help || argv.h || process.argv.length < 3) {
  console.log('Creative Toolkit');
  console.log('');
  console.log('ct a              arrange/lint/fix existing comps');
  console.log('ct r [compid]     render one comp');
  console.log('');
  console.log('--project -p      set project folder');
  console.log('--render-root     set render root');
  console.log();
  // console.log('$RENDER_ROOT      set render root');
  console.log('');
  process.exit(0);
}

const PROJECT = path.resolve(argv.project ?? argv.p ?? '.');
setPaths({
  PROJECT,
  PROJECT_NAME: path.basename(PROJECT),
  RENDER_ROOT: path.resolve(argv['render-root'] ?? '/render'),
  COMP_ROOT: path.join(PROJECT, 'comps'),
  PATH_TO_FUSION: '/opt/BlackmagicDesign/Fusion9/Fusion',
});

const cmd = argv._.shift();
if (cmd === 'a') {
  arrangeComps();
} else if (cmd === 'r') {
  const [compid] = argv._;
  if (!compid) {
    console.error('usage: ct r [compid]');
    process.exit(1);
  }

  await renderFusionComp(compid);
} else {
  console.log('no command specified');
  process.exit(1);
}
