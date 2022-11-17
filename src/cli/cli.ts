#!/usr/bin/env bun
import path from 'path';
import YAML from 'yaml';
import { TOOLKIT_VERSION } from '$/constants';
import { killFusionRenderNode } from '$/fusion-clip';
import { hint } from '$/logger';
import { loadProject, Project } from '$/project';
import { chalk, injectLogger, Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { readdirSync, readFileSync } from 'fs';
import { hslToRgb } from './hsl';
import { CommandEvent } from './index';

function readYAML(filename: string) {
  return YAML.parse(readFileSync(filename, 'utf8'));
}

const commandName = process.argv[2];

if (!commandName) {
  const cmds = readdirSync(path.join(import.meta.dir, './commands'))
    .filter(x => x.endsWith('.yaml'))
    .map(name => {
      const cmd = readYAML(path.join(import.meta.dir, './commands', name));
      return {
        ...cmd,
        name: name.replace('.yaml', ''),
        sort: cmd.sort ?? 0,
      };
    })
    .sort((a, b) => b.sort - a.sort);

  const padding = Math.max(...cmds.map(x => x.name.length)) + 2;

  Logger.writeLine(
    chalk.bold.greenBright(`dave's creative toolkit`) + '  ' + chalk.whiteBright(TOOLKIT_VERSION)
  );
  Logger.writeLine(
    '   ' +
      [...'now featuring the two step process!']
        .map((char, i) => {
          const hue = (i * 7 + 102) % 360;
          const [r, g, b] = hslToRgb(hue, i > 17 ? 0.7 : 0.5, i > 17 ? 0.7 : 0.8);
          return (i > 17 && i < 34 ? chalk.underline : chalk).italic.rgb(r, g, b)(char);
        })
        .join('')
  );

  Logger.writeLine('');

  for (const cmd of cmds) {
    const space = ' '.repeat(padding - cmd.name.length);
    Logger.writeLine(`- ${chalk.green('ct ' + cmd.name)}:${space}${cmd.desc}`);
    if (cmd.separator) {
      Logger.writeLine('');
    }
  }

  process.exit(1);
}

function printHintAndExit() {
  hint(`commands are located at ./src/cli/commands/${chalk.redBright('{name}')}.ts`);
  process.exit(1);
}

if (/[^a-z0-9_-]/.exec(commandName)) {
  Logger.error('invalid command: ' + commandName);
  printHintAndExit();
}

if (!(await pathExists(path.join(import.meta.dir, `commands/${commandName}.ts`)))) {
  Logger.error('unknown command: ' + commandName);
  printHintAndExit();
}

injectLogger();

let project!: Project;
try {
  const command = await import(`./commands/${commandName}.ts`);

  try {
    project = await loadProject();
  } catch (error) {
    if (command.requiresProject === undefined || command.requiresProject) {
      throw error;
    }
  }

  const event: CommandEvent = {
    project,
  };

  await command.run(event);

  if (project) {
    await project.write();
  }

  await killFusionRenderNode();

  // TODO: Bun #880
  // const timer = setTimeout(() => {
  //   Logger.warn('Bun has an open ref after command ends, forcing exit!');
  //   process.exit(5);
  // }, 2000);
  // timer.unref();
  process.exit(0);
} catch (error) {
  Logger.error(error as any);
  await killFusionRenderNode();
  process.exit(1);
}
