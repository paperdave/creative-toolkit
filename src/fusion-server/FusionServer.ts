import { Subprocess } from 'bun';
import { Project } from '../project/project';

export class FusionRenderServer {
  server: Subprocess;
  renderNode: Subprocess;

  constructor(public project: Project) {
    const log = false;

    // TODO: check for existing FusionServer and FusionRenderNode
    // TODO: when booting up, wait for it's ready signal

    this.server = Bun.spawn({
      cmd: [project.paths.execFusionServer, '-S'],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    this.renderNode = Bun.spawn({
      cmd: [
        //
        project.paths.execFusionRender,
        ...(log ? ['-log', project.paths.fusionLog] : []),
      ],
      stdout: 'inherit',
      stderr: 'inherit',
    });
  }

  close() {
    try {
      this.server.kill(9);
    } catch {}
    try {
      this.renderNode.kill(9);
    } catch {}
  }
}
