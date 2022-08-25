import minimist from 'minimist';
import path from 'path';
import { error, writeLine } from '@paperdave/logger';
import type { Command } from './cmd';
import { ArrangeCommand } from './commands/a';
import { AudioFromFileCommand } from './commands/audio-from';
import { FusionCommand } from './commands/f';
import { FinalRenderCommand } from './commands/final';
import { GUICommand } from './commands/gui';
import { InitCommand } from './commands/init';
import { PathCommand } from './commands/paths';
import { RenderCompCommand } from './commands/r';
import { SplitCommand } from './commands/split';
import { ThumbnailRenderCommand } from './commands/tr';
import type { Paths } from './project';
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

const commands: Record<string, Command> = {
  init: InitCommand,
  a: ArrangeCommand,
  gui: GUICommand,
  'audio-from': AudioFromFileCommand,
  f: FusionCommand,
  path: PathCommand,
  r: RenderCompCommand,
  split: SplitCommand,
  tr: ThumbnailRenderCommand,
  final: FinalRenderCommand,
};

const programArgs = minimist(programArgList);

if (programArgs.help || programArgs.h || !cmdName) {
  writeLine('Creative Toolkit');
  writeLine('');
  for (const { usage, desc, flags } of Object.values(commands)) {
    writeLine(`${usage}${' '.repeat(30 - usage.length)}${desc}`);
    if (flags) {
      for (const flag of flags) {
        writeLine(`  ${flag.name}${' '.repeat(28 - flag.name.length)}${flag.desc}`);
      }
    }
  }
  writeLine('');
  writeLine('global flags:');
  writeLine('  --project -p        set project folder');
  writeLine('  --render-root       set render root');
  writeLine('');
  // console.log('$RENDER_ROOT      set render root');
  writeLine('');
  process.exit(0);
}

const projectPath = path
  .resolve(programArgs.project ?? programArgs.p ?? '.')
  .replace(/\/project\.json$/, '');
const paths: Partial<Paths> = {
  render: programArgs['render-root'],
};
const project = await resolveProject(projectPath, paths).catch(err => {
  if (err.code !== 'ENOENT') {
    error(err);
    process.exit(1);
  }
  return null;
});

if (!project && cmdName !== 'init') {
  error('Could not find a creative toolkit project. Run `ct init`.');
  process.exit(1);
}

if (commands[cmdName]) {
  if (commands[cmdName].arrangeFirst) {
    await ArrangeCommand.run({
      project: project!,
    });
  }
  await commands[cmdName].run({
    project: project!,
    args: commandArgList,
  });
} else if (cmdName) {
  error(`Unknown command: ${cmdName}`);
  process.exit(1);
}
