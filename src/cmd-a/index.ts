import { RunCommand } from '$cmd-runner';

export const run: RunCommand = async ({ project }) => {
  await project.getArrangedClips();
};
