import { Logger } from '@paperdave/logger';
import { Command } from '../cmd';

export const PathCommand = new Command({
  usage: 'ct path [<key> <p>]',
  desc: 'inspect/edit paths',
  async run({ project, args }) {
    if (args._.length === 0) {
      Logger.info('Current Project Paths');
      Logger.writeLine('');

      for (const path of Object.keys(project.paths)) {
        Logger.writeLine(`${path}:${' '.repeat(20 - path.length)} ${(project.paths as any)[path]}`);
      }
    }
  },
});
