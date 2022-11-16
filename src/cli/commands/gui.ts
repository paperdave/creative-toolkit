/* eslint-disable @typescript-eslint/require-await */
import path from 'path';
import { RunCommandNoProject } from '$/cli';
import { createAPIServer } from '$/gui-api';
import { apiAddProject } from '$/gui-api/state/projects';
import { DEFAULT_PATHS } from '$/project';
import { CLIError, Logger } from '@paperdave/logger';

const log = new Logger('gui');

export const requiresProject = false;

export const run: RunCommandNoProject = async ({ project }) => {
  const cmd = [
    project ? project.paths.execElectron : DEFAULT_PATHS.execElectron,
    path.join(import.meta.dir, '../../gui-electron/bootstrap.cjs'),
  ];

  if (cmd[0] == null) {
    throw new CLIError(
      'Could not find electron installation',
      'Try reinstalling creative toolkit or manually installing electron.'
    );
  }

  if (project) {
    cmd.push('--project', project.id);
    apiAddProject(project);
  }
  const server = createAPIServer();
  await new Promise(done => server.listen(2004, done));
  log('starting electron+vite gui');
  const electron = Bun.spawn({
    cmd: cmd as any,
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  await electron.exited;
  server.stop();
};
