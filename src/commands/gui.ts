/* eslint-disable @typescript-eslint/require-await */
import { Command } from '../cmd';
import { startServer } from '../server';

export const GUICommand = new Command({
  usage: 'ct gui',
  desc: 'stupid express server',
  arrangeFirst: true,
  async run({ project }) {
    startServer(project);
  },
});
