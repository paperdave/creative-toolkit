import { RunCommand } from '$/cli';
import { renderProject } from '$/project';

export const run: RunCommand = async ({ project }) => {
  await renderProject({
    project,
    steps: [1],
  });
};
