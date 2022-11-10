import { RunCommand } from '$cmd-runner';
import { renderProject } from '../project/render';

export const run: RunCommand = async ({ project }) => {
  await renderProject(project);
};
