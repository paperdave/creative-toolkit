import { RunCommand } from "$cmd-runner";

export const run: RunCommand = async ({ project }) => {
  console.log(project);
};
