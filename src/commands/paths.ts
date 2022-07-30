import { Command } from '../cmd';

export const PathCommand = new Command({
  usage: 'ct path [<key> <p>]',
  desc: 'inspect/edit paths',
  async run({ project, args }) {
    if (args._.length === 0) {
      console.log('Current Project Paths');
      console.log('');

      for (const path of Object.keys(project.paths)) {
        console.log(`${path}:${' '.repeat(20 - path.length)} ${(project.paths as any)[path]}`);
      }
    }
  },
});
