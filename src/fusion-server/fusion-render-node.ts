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
        ct_fusion_uuid: this.renderNodeUid,
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

  const fusionServerRunning = await isFusionServerRunning();

  if (!fusionServerRunning) {
    // TODO: wait for Blackmagic Design to fix fuscript buffering the logs in the first place
    // TODO: refactor this into a method for spawning a daemon with a "trigger" log line.
    // await new Promise((resolve, reject) => {
    //   let started = false;

    //   const timer = setTimeout(() => {
    //     if (!started) {
    //       server?.kill(9);
    //       reject(
    //         new Error(`Fusion script server took too long to start (>${FUSION_STARTUP_THRESHOLD}s)`)
    //       );
    //     }
    //   }, 1000 * FUSION_STARTUP_THRESHOLD);

    //   server = spawnReadLines({
    //     cmd: [project.paths.execFusionScript, '-S'],
    //     onStdout: line => {
    //       if (line.startsWith('FusionScript Server') && line.endsWith('Started') && !started) {
    //         started = true;
    //         resolve(undefined);
    //       } else {
    //         logFusionServer(line);
    //       }
    //     },
    //     onStderr: line => logFusionServer(line),
    //     wait: false,
    //   });
    //   logFusionServer(`Starting Fusion Script Server [PID: ${server.pid}]`);

    //   server.exited.then(() => {
    //     if (!started) {
    //       clearTimeout(timer);
    //       reject(new Error('Fusion script server exited before starting'));
    //     }
    //   });
    // });

    // Workaround: in some senses i dont know why i don't just *do this instead*
    // but the above method would theoretically be more reliable which is a plus.

    server = Bun.spawn({
      cmd: [project.paths.execFusionScript, '-S'],
    });
    await delay(100);
    logFusionServer(`Starting Fusion Script Server [PID: ${server.pid}]`);
  } else {
    logFusionServer('Fusion Script Server is already running');
  }

  await new Promise((resolve, reject) => {
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
        if (!started && (match = /^Fusion Started: (.*)$/.exec(line))) {
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
    logFusionRenderNode(`Starting Fusion Render Node [PID: ${renderNode.pid}]`);
    renderNode.exited.then(() => {
      if (!started) {
        clearTimeout(timer);
        reject(new Error('Render node exited before starting'));
      }
    });
  });

  // @ts-expect-error "Private" API
  return new FusionRenderNode(project, server, renderNode, renderNodeUid);
}
