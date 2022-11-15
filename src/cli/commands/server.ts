/* eslint-disable @typescript-eslint/require-await */
import { RunCommand } from '$/cli';
import { createAPIServer } from '$/gui-api';
import { apiAddProject } from '$/gui-api/state/projects';

export const run: RunCommand = async ({ project }) => {
  const server = createAPIServer();
  apiAddProject(project);
  // never resolve, let the server run forever
  await new Promise(() => {
    server.listen(2004);
  });
};
