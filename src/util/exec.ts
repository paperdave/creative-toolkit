/* eslint-disable no-constant-condition */
import { SpawnOptions } from 'bun';

type ExecScriptOptsA = {
  cmd: string[];
  onData(data: any): void;
} & Omit<SpawnOptions.OptionsObject, 'cmd' | 'stdio' | 'stdin' | 'stdout' | 'stderr' | 'onExit'>;

type ExecRLOpts = {
  cmd: string[];
  onStdout?(data: any): void;
  onStderr?(data: any): void;
} & Omit<SpawnOptions.OptionsObject, 'cmd' | 'stdio' | 'stdin' | 'stdout' | 'stderr' | 'onExit'>;

const td = new TextDecoder();

async function readLines(reader: ReadableStreamDefaultReader, onLine: (line: string) => void) {
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const lines = (buffer + td.decode(value)).split(/\n|\r/);
    buffer = lines.pop() ?? '';
    lines.map(x => x.trim()).forEach(onLine);
  }
}

/** Execute a script and extracts \nCT_DATA\n{data}\n. */
export async function execReadLines(opts: ExecRLOpts) {
  const { onStderr, onStdout, ...spawnOpts } = opts;
  const child = Bun.spawn({
    ...(spawnOpts as any),
    stderr: onStderr ? 'pipe' : 'inherit',
    stdout: onStdout ? 'pipe' : 'inherit',
  });

  if (onStdout) {
    const stdout = (child.stdout as ReadableStream).getReader();
    readLines(stdout, onStdout);
  }
  if (onStderr) {
    const stderr = (child.stderr as ReadableStream).getReader();
    readLines(stderr, onStderr);
  }

  await child.exited;
}

/** Execute a script and extracts \nCT_DATA\n{data}\n. */
export async function execReadCTData(opts: ExecScriptOptsA) {
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
  return execReadLines({
    ...(spawnOpts as any),
    onStderr: onLine,
    onStdout: onLine,
  });
}
