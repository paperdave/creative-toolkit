import { RunCommand } from '$cmd-runner';

export const run: RunCommand = async ({ project }) => {
  const scriptServer = await project.getFusionRenderNode();

  await scriptServer.spawnScript({
    script: 'hello-world.lua',
  });

  // scriptServer.close() or project.close()
  // except this is auto done by the command runner, so no need to worry
};
