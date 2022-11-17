import path from 'path';
import { appPath } from '$/global/exec-paths';
import { delay } from '@paperdave/utils';
import { Subprocess } from 'bun';
import { existsSync } from 'fs';
import { isFusionServerRunning } from './detect-running';
import { logFusionRenderNode, logFusionScript, logFusionServer } from './logger';
import { SpawnScriptOpts } from './types';
import { spawnReadCTData, spawnReadLines } from '../util/spawn';

const FUSION_STARTUP_THRESHOLD = 15;

let singleton: FusionRenderNode | Promise<FusionRenderNode> | undefined;

export async function getFusionRenderNode(): Promise<FusionRenderNode> {
  if (singleton) {
    return singleton;
  }
  singleton = startFusionRenderNode();
  singleton = await singleton;
  return singleton;
}

// TODO: make this not async
export async function killFusionRenderNode() {
  if (singleton) {
    (await singleton).close();
  }
}

async function startFusionRenderNode(): Promise<FusionRenderNode> {
  let server: Subprocess | undefined;
  let renderNode: Subprocess;
  let renderNodeUid: string;

  const fusionServerRunning = await isFusionServerRunning();

  if (!fusionServerRunning) {
    // I had an idea to spawn this with stdout piping and then waiting for a "ready"
    // message, but there's a ton of weird issues, from FusionServer buffering it's stdout
    // and making it unreadable to pipes, but also weird stuff in bun like:
    // https://github.com/oven-sh/bun/issues/1498
    // plus some other stuff that cause THIS process to keep an open ref.
    // And honestly, this approach works 99% of the way and is simple enough, so I think
    // we'll keep it and hope that bun fixes whatever is causing the ref to stay open.
    server = Bun.spawn({
      cmd: [appPath.fusionServer, '-S'],
      stdio: ['ignore', 'ignore', 'ignore'],
    } as any);
    await delay(100);
    logFusionServer(`Starting Fusion Script Server [PID: ${server.pid}]`);
  } else {
    logFusionServer('Fusion Script Server is already running');
  }

  await new Promise<void>((resolve, reject) => {
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
      cmd: [appPath.fusionRenderNode],
      onStdout: line => {
        if (!started && (match = /^Fusion Started: (.*)$/.exec(line))) {
          started = true;
          renderNodeUid = match[1];
          clearTimeout(timer);
          resolve();
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
  return new FusionRenderNode(server, renderNode, renderNodeUid);
}

export class FusionRenderNode {
  private constructor(
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
      cmd: [appPath.fuscript, scriptPath],
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
    // I really want to make sure this kill works, so I go a tad overboard:
    if (this.renderNode && !this.renderNode.killed) {
      const renderNodePid = this.renderNode.pid;
      logFusionRenderNode('Stopping Fusion Render Node');
      try {
        this.renderNode.kill();
        this.renderNode.kill(9);
        Bun.spawnSync({ cmd: ['kill', '-9', String(renderNodePid)] } as any);
      } catch {}
    }
    if (this.server && !this.server.killed) {
      const serverPid = this.server.pid;
      logFusionServer('Stopping Fusion Script Server');
      try {
        this.server.kill();
        this.server.kill(9);
        Bun.spawnSync({ cmd: ['kill', '-9', String(serverPid)] } as any);
      } catch {}
    }

    singleton = null!;
  }
}
