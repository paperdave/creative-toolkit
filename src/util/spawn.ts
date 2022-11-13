/* eslint-disable no-constant-condition */
import { Logger } from '@paperdave/logger';
import { SpawnOptions, Subprocess } from 'bun';

const log = new Logger('exec', { debug: true });

type SpawnReadCTDataOpts<Wait extends boolean> = {
  cmd: string[];
  onData(data: any): void;
  wait?: Wait;
} & Omit<SpawnOptions.OptionsObject, 'cmd' | 'stdio' | 'stdin' | 'stdout' | 'stderr' | 'onExit'>;

type SpawnReadLineOpts<Wait extends boolean> = {
  cmd: string[];
  onStdout?(data: any): void;
  onStderr?(data: any): void;
  wait?: Wait;
} & Omit<SpawnOptions.OptionsObject, 'cmd' | 'stdio' | 'stdin' | 'stdout' | 'stderr' | 'onExit'>;

const td = new TextDecoder();

async function readLines(stream: ReadableStream, onLine: (line: string) => void) {
  let buffer = '';
  for await (const chunk of stream) {
    const lines = (buffer + td.decode(chunk)).split(/\n|\r/);
    buffer = lines.pop() ?? '';
    lines.map(x => x.trim()).forEach(onLine);
  }
}

/** Execute a script and extracts lines. */
export function spawnReadLines<Wait extends boolean = true>(
  opts: SpawnReadLineOpts<Wait>
): Wait extends true ? Promise<number> : Subprocess {
  const { onStderr, onStdout, wait = true, ...spawnOpts } = opts;

  const basename = spawnOpts.cmd[0];

  const child = Bun.spawn({
    ...(spawnOpts as any),
    stderr: onStderr ? 'pipe' : 'inherit',
    stdout: onStdout ? 'pipe' : 'inherit',
  });

  log(`${basename} [${child.pid}] started`);

  if (onStdout) {
    readLines(child.stdout as ReadableStream, onStdout);
  }
  if (onStderr) {
    readLines(child.stderr as ReadableStream, onStderr);
  }

  const exitedPromise = child.exited.then(code => {
    log(`${basename} [${child.pid}] exited with code ${code}`);
    return code;
  }) as any;

  return (wait ? exitedPromise : child) as any;
}

/** Execute a script and extracts \nCT_DATA\n{data}\n. */
export function spawnReadCTData<Wait extends boolean = true>(
  opts: SpawnReadCTDataOpts<Wait>
): Wait extends true ? Promise<number> : Subprocess {
  const { onData, ...spawnOpts } = opts;
  let isDataLine = false;
  function onLine(line: string) {
    if (isDataLine) {
      onData(JSON.parse(line));
      isDataLine = false;
    } else if (line === 'CT_DATA') {
      isDataLine = true;
    }
  }
  return spawnReadLines({
    ...(spawnOpts as any),
    onStderr: onLine,
    onStdout: onLine,
  });
}
