#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/promise-function-async */
import 'bun-utilities';
import minimist from 'minimist';
import path from 'path';
import { tryOrFallback } from '@davecode/utils';
import { ArrangeCommand } from './commands/a';
import { AudioFromFileCommand } from './commands/audio-from';
import { FusionCommand } from './commands/f';
import { InitCommand } from './commands/init';
import { PathCommand } from './commands/paths';
import { RenderCompCommand } from './commands/r';
import { ThumbnailRenderCommand } from './commands/tr';
import { WebmRenderCommand } from './commands/webm';
import type { Paths, Project } from './project';
import { resolveProject } from './project';

enum ArgParserState {
  Program,
  ProgramValue,
}

const commandArgList = [];
const programArgList = [];
let cmdName = '';
let state = ArgParserState.Program;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (state === ArgParserState.Program) {
    if (arg.startsWith('-')) {
      state = ArgParserState.ProgramValue;
      programArgList.push(arg);
    } else {
      cmdName = arg;
      commandArgList.push(...process.argv.slice(i + 1));
      break;
    }
  } else if (state === ArgParserState.ProgramValue) {
    commandArgList.push(arg);
    state = ArgParserState.Program;
  }
}

export interface CommandContext {
  project: Project;
  args: minimist.ParsedArgs;
  argList: string[];
  pathOverrides: Partial<Paths>;
}

export interface Command {
  usage: string;
  desc: string;
  flags?: Array<{ name: string; desc: string }>;
  run(args: CommandContext): Promise<void>;
}

const commands: Record<string, Command> = {
  init: InitCommand,
  a: ArrangeCommand,
  f: FusionCommand,
  r: RenderCompCommand,
  tr: ThumbnailRenderCommand,
  'audio-from': AudioFromFileCommand,
  path: PathCommand,
  webm: WebmRenderCommand,
};

const programArgs = minimist(programArgList);

if (programArgs.help || programArgs.h || !cmdName) {
  console.log('Creative Toolkit');
  console.log('');
  for (const { usage, desc, flags } of Object.values(commands)) {
    console.log(`${usage}${' '.repeat(22 - usage.length)}${desc}`);
    if (flags) {
      for (const flag of flags) {
        console.log(`  ${flag.name}${' '.repeat(20 - flag.name.length)}${flag.desc}`);
      }
    }
  }
  console.log('');
  console.log('global flags:');
  console.log('  --project -p        set project folder');
  console.log('  --render-root       set render root');
  console.log();
  // console.log('$RENDER_ROOT      set render root');
  console.log('');
  process.exit(0);
}

const projectPath = path
  .resolve(programArgs.project ?? programArgs.p ?? '.')
  .replace(/\/project\.json$/, '');
const paths: Partial<Paths> = {
  render: programArgs['render-root'],
};
const project = await tryOrFallback(() => resolveProject(projectPath, paths), null);

if (!project && cmdName !== 'init') {
  console.error('Could not find a creative toolkit project. Run `ct init`.');
  process.exit(1);
}

if (commands[cmdName]) {
  await commands[cmdName].run({
    project: project!,
    args: minimist(commandArgList),
    argList: commandArgList,
    pathOverrides: paths,
  });
} else if (cmdName) {
  console.error(`Unknown command: ${cmdName}`);
  process.exit(1);
}
