import { RunCommand } from "$cmd-runner";

export const run: RunCommand = ({ project }) => {
  console.log(project);
};
