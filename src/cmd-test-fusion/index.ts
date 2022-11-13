import { RunCommand } from '$cmd-runner';
import { Logger } from '@paperdave/logger';

const logFusionServer = new Logger('fusion-server');

export const run: RunCommand = async ({ project }) => {
  const server = Bun.spawn({
    cmd: [project.paths.execFusionScript, '-S'],
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  setTimeout(() => {
    console.log('killing it');
    server.kill();
  }, 2000);
  // const scriptServer = await project.getFusionRenderNode();
  // await scriptServer.spawnScript({
  //   script: 'hello-world.lua',
  // });
  // scriptServer.close();
  // scriptServer.close() or project.close()
  // except this is auto done by the command runner, so no need to worry
};
