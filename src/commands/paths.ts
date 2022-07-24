import type { Command } from '..';

export const PathCommand: Command = {
  usage: 'ct path [<key> <p>]',
  desc: 'inspect/edit paths',
  async run({ project, args }) {
    if (args._.length === 0) {
      console.log('Current Project Paths');
      console.log('');

      for (const path of Object.keys(project.paths)) {
        console.log(`${path}:${' '.repeat(14 - path.length)} ${(project.paths as any)[path]}`);
      }
    }
  },
};
