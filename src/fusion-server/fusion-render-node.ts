import path from 'path';
import { Logger } from '@paperdave/logger';
import { delay } from '@paperdave/utils';
import { Subprocess } from 'bun';
import { existsSync } from 'fs';
import { isFusionServerRunning } from './detect-running';
import { logFusionRenderNode, logFusionScript, logFusionServer } from './logger';
import { Project } from '../project/project';
import { spawnReadCTData, spawnReadLines } from '../util/spawn';

const FUSION_STARTUP_THRESHOLD = 15;

interface SpawnScriptOpts<Wait extends boolean> {
  script: string;
  env?: Record<string, string>;
  onData?(data: any): void;
  onLine?(line: string): void;
  wait?: Wait;
}

export class FusionRenderNode {
  private constructor(
    public project: Project,
    readonly server: Subprocess | null,
    readonly renderNode: Subprocess,
    readonly renderNodeUid: string
  ) {}

  spawnScript<Wait extends boolean = true>({
    script,
    onData,
    onLine,
    env,
    wait,
  }: SpawnScriptOpts<Wait>): Wait extends true ? Promise<number> : Subprocess {
    const scriptPath = path.resolve(path.join(import.meta.dir, '../fusion-scripts'), script);
    // fuscript will not print any errors if there is no script file, so let's do that check
    if (!existsSync(scriptPath)) {
      throw new Error(`Script not found: ${script}`);
    }
    const common = {
      cmd: [this.project.paths.execFusionScript, scriptPath],
      onData: onData ?? (() => {}),
      env: {
        ...process.env,
        ct_fusion_uid: this.renderNodeUid,
        ...env,
      },
      wait,
    };
    return onData
      ? spawnReadCTData({
          ...common,
          onData,
        })
      : spawnReadLines({
          ...common,
          onStdout: onLine ?? logFusionScript,
          onStderr: onLine ?? logFusionScript,
        });
  }

  close() {
    if (this.server && !this.server.killed) {
      logFusionServer('Stopping Fusion Script Server');
      try {
        this.server?.kill();
      } catch {}
    }
    if (this.renderNode && !this.renderNode.killed) {
      logFusionRenderNode('Stopping Fusion Render Node');
      try {
        this.renderNode.kill();
      } catch {}
    }
    Logger.info('exited');
  }
}

export async function startFusionRenderNode(project: Project) {
  const logFile = process.env.DEBUG ? project.paths.fusionLog : undefined;

  let server: Subprocess | undefined;
  let renderNode: Subprocess;
  let renderNodeUid: string;

  if (!isFusionServerRunning()) {
    logFusionServer('Starting Fusion Script Server');
    server = spawnReadLines({
      cmd: [project.paths.execFusionScript, '-S'],
      onStdout: line => logFusionServer(line),
      onStderr: line => logFusionServer(line),
      wait: false,
    });
    await delay(200);
  }

  await new Promise((resolve, reject) => {
    logFusionRenderNode('Starting Fusion Render Node');
    let started = false;
    let match;
    const timer = setTimeout(() => {
      if (!started) {
        renderNode?.kill(9);
        reject(
          new Error(`Fusion render node took too long to start (>${FUSION_STARTUP_THRESHOLD}s)`)
        );
      }
    }, 1000 * FUSION_STARTUP_THRESHOLD);
    renderNode = spawnReadLines({
      cmd: [
        //
        project.paths.execFusionRender,
        ...(logFile ? ['-log', logFile] : []),
      ],
      onStdout: line => {
        if (!started && (match = /Fusion Started: (.*)$/.exec(line))) {
          started = true;
          renderNodeUid = match[1];
          clearTimeout(timer);
          resolve(undefined);
        } else {
          logFusionRenderNode(line);
        }
      },
      onStderr: line => logFusionRenderNode(line),
      wait: false,
    });
    renderNode.exited.then(() => {
      if (!started) {
        clearTimeout(timer);
        reject(new Error('Render node exited before starting'));
      }
    });

    // HOTPATCH for bun bug
    setTimeout(() => {
      started = true;
      clearTimeout(timer);
      resolve(undefined);
    }, 2000);
  });

  // @ts-expect-error "Private" API
  return new FusionRenderNode(project, server, renderNode, renderNodeUid);
}
