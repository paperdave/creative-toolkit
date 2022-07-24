#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/promise-function-async */
import 'bun-utilities';
import minimist from 'minimist';
import path from 'path';
import { tryOrFallback } from '@davecode/utils';
import { ArrangeCommand } from './commands/a';
import { InitCommand } from './commands/init';
import { RenderCompCommand } from './commands/r';
import type { Paths, Project } from './project';
import { resolveProject } from './project';

export interface CommandContext {
  project: Project;
  argv: minimist.ParsedArgs;
  pathOverrides: Partial<Paths>;
}

export interface Command {
  usage: string;
  desc: string;
  flags?: Array<{ name: string; desc: string }>;
  run(args: CommandContext): Promise<void>;
}

const commands = {
  init: InitCommand,
  a: ArrangeCommand,
  r: RenderCompCommand,
};

const argv = minimist(process.argv.slice(2));

if (argv.help || argv.h || argv._.length === 0) {
  console.log('Creative Toolkit');
  console.log('');
  for (const { usage, desc, flags } of Object.values(commands)) {
    console.log(`${usage}${' '.repeat(18 - usage.length)}${desc}`);
    if (flags) {
      for (const flag of flags) {
        console.log(`  ${flag.name}${' '.repeat(16 - flag.name.length)}${flag.desc}`);
      }
    }
  }
  console.log('');
  console.log('global flags:');
  console.log('  --project -p    set project folder');
  console.log('  --render-root   set render root');
  console.log();
  // console.log('$RENDER_ROOT      set render root');
  console.log('');
  process.exit(0);
}

const projectPath = path.resolve(argv.project ?? argv.p ?? '.').replace(/\/project\.json$/, '');
const paths: Partial<Paths> = {
  render: argv['render-root'],
};
const project = await tryOrFallback(() => resolveProject(projectPath, paths), null);
const cmd = argv._.shift()! as keyof typeof commands;

if (!project && cmd !== 'init') {
  console.error('Could not find a creative toolkit project. Run `ct init`.');
  process.exit(1);
}

if (commands[cmd]) {
  await commands[cmd].run({
    project: project!,
    argv,
    pathOverrides: paths,
  });
} else if (cmd) {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
