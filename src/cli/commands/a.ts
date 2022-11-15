import { RunCommand } from '$/cli';

export const run: RunCommand = async ({ project }) => {
  await project.getClips();
};
