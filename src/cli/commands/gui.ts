/* eslint-disable @typescript-eslint/require-await */
import path from 'path';
import { RunCommand } from '$/cli';
import { createAPIServer } from '$/gui-api';
import { apiAddProject } from '$/gui-api/state/projects';
import { Logger } from '@paperdave/logger';

const log = new Logger('gui');

export const run: RunCommand = async ({ project }) => {
  apiAddProject(project);
  const server = createAPIServer();
  await new Promise(done => server.listen(2004, done));
  log('starting electron+vite gui');
  const electron = Bun.spawn({
    cmd: [
      project.paths.execElectron,
      path.join(import.meta.dir, '../../gui-electron/bootstrap.cjs'),
      '--id',
      project.id,
    ],
    stdio: ['inherit', 'inherit', 'inherit'],
    env: process.env,
  });
  await electron.exited;
  server.stop();
};
