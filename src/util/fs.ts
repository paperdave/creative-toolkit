import fs from 'node:fs/promises';
import path from 'path';
import type { Awaitable } from '@davecode/types';

const textEncoder = new TextEncoder();

export function isRootDirectory(str: string) {
  return str === '/' || (str.length === 3 && str.endsWith(':/'));
}

export async function walkUpDirectoryTree(
  startDir: string,
  filter: (dir: string) => Awaitable<boolean>
): Promise<string | null> {
  let dir = startDir;
  do {
    if (await filter(dir)) {
      return dir;
    }
    dir = path.dirname(dir);
  } while (!isRootDirectory(dir));
  return null;
}

export async function exists(...filepath: string[]): Promise<boolean> {
  try {
    await fs.access(path.resolve(...filepath));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export interface WriteJSONOptions {
  spaces?: number;
  replacer?(key: string, value: unknown): unknown;
}

export async function writeJSON(
  filepath: string,
  data: unknown,
  options?: WriteJSONOptions
): Promise<void> {
  Bun.write(
    Bun.file(filepath),
    textEncoder.encode(JSON.stringify(data, options?.replacer, options?.spaces))
  );
}

export async function readJSON(filepath: string): Promise<unknown> {
  // @ts-expect-error Jarred messed up the ts types here :/
  return await Bun.file(filepath).json();
}
