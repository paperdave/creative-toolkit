import { RunCommandNoProject } from '$/cli';
import { createAPIServer } from '$/gui-api';
import { apiAddProject } from '$/gui-api/state/projects';

export const requiresProject = false;

export const run: RunCommandNoProject = async ({ project }) => {
  const server = createAPIServer();
  new Promise(() => {
    server.listen(2004);
  });
  const global = globalThis as any;
  if (project) {
    apiAddProject(project);
    global.project = project;
    global.p = project;
    global.clips = await project.getClips();
    global.film = await project?.getFilmStore();
  }
  // TODO: start a repl

  await new Promise(() => {});
};
