import { RunCommand } from '$/cli';

export const desc = 'print project metadata';
export const run: RunCommand = async ({ project }) => {
  console.log(project);
};
