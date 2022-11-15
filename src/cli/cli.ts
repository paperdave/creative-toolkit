#!/usr/bin/env bun
import path from 'path';
import { TOOLKIT_DATE } from '$/constants';
import { hint } from '$/logger';
import { Project, resolveProject } from '$/project';
import { chalk, injectLogger, Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { readdirSync } from 'fs';
import { CommandEvent } from '.';
import { hslToRgb } from './hsl';

const commandName = process.argv[2];

if (!commandName) {
  Logger.writeLine(
    chalk.bold.greenBright(`dave's creative toolkit`) + '  ' + chalk.whiteBright(TOOLKIT_DATE)
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

  const cmds = readdirSync(path.join(import.meta.dir, './commands'))
    .filter(x => x.endsWith('.ts'))
    .map(name => {
      const cmd = require(path.join(import.meta.dir, './commands', name));
      return {
        name: name.replace('.ts', ''),
        desc: cmd.desc,
        sort: cmd.sort ?? 0,
      };
    })
    .sort((a, b) => b.sort - a.sort);

  const padding = Math.max(...cmds.map(x => x.name.length)) + 2;

  for (const cmd of cmds) {
    const space = ' '.repeat(padding - cmd.name.length);
    Logger.writeLine(`- ${chalk.green('ct ' + cmd.name)}:${space}${cmd.desc}`);
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
  const command = require(`./commands/${commandName}.ts`);

  if (command.project === undefined || command.project === true) {
    project = await resolveProject();
  }

  const event: CommandEvent = {
    project,
  };

  await command.run(event);

  project.close();
} catch (error) {
  Logger.error(error as any);
  project?.close?.();
  process.exit(1);
}
