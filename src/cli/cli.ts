#!/usr/bin/env bun
import path from 'path';
import { TOOLKIT_DATE } from '$/constants';
import { hint } from '$/logger';
import { Project, resolveProject } from '$/project';
import { chalk, injectLogger, Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { readdirSync } from 'fs';
import { CommandEvent } from '.';

const commandName = process.argv[2];

if (!commandName) {
  Logger.writeLine(chalk.greenBright(`dave caruso's creative toolkit, ${TOOLKIT_DATE}`));
  Logger.writeLine(chalk.grey('usage: ct <cmd> [...]'));
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

if (/[^a-z0-9_-]/.exec(commandName)) {
  Logger.error('invalid command: ' + commandName);
  hint('commands are located at ./src/cli/commands/index.ts');
  process.exit(1);
}

if (!(await pathExists(path.join(import.meta.dir, `commands/${commandName}.ts`)))) {
  Logger.error('unknown command: ' + commandName);
  hint('commands are located at ./src/cli/commands/{name}.ts');
  process.exit(1);
}

if (commandName === 'runner') {
  Logger.error('cannot run the command runner as a command.');
  process.exit(1);
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
