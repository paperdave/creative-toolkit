import { RunCommand } from '$/cli';

export const desc = 'arrange/lint clip files';
export const sort = 50;

export const run: RunCommand = async ({ project }) => {
  await project.getArrangedClips();
};
