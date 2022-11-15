import { RunCommand } from '$/cli';
import { renderProject } from '$/project';

export const desc = 'render clips';
export const sort = 50;

export const run: RunCommand = async ({ project }) => {
  await renderProject({
    project,
  });
};
