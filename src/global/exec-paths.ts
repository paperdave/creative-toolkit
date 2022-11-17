import path from 'path';
import { existsSync } from 'fs';

export function resolveExec(pathname: string | string[], root = process.cwd()): string {
  if (Array.isArray(pathname)) {
    for (const item of pathname) {
      const resolve = resolveExec(item, root);
      if (resolve) {
        return resolve;
      }
    }
    return null!;
  }

  if (pathname.endsWith('.exe')) {
    pathname = pathname.replace(/\.exe$/, '');
  }

  if (pathname.startsWith('.')) {
    pathname = path.resolve(pathname, root);
  }
  if (existsSync(pathname)) {
    return pathname;
  }

  const binPaths = process.env.PATH!.split(path.delimiter);
  for (const binPath of binPaths) {
    const execPath = path.join(binPath, pathname);
    if (existsSync(execPath)) {
      return execPath;
    }
  }
  return null!;
}

export const appPath = {
  get fusion() {
    return set('fusion', resolveExec('Fusion'));
  },
  get fusionRenderNode() {
    return set('fusionRender', resolveExec('FusionRenderNode'));
  },
  get fusionServer() {
    return set('fusionServer', resolveExec('FusionServer'));
  },
  get fuscript() {
    return set('fusionScript', resolveExec('fuscript'));
  },
  get blender() {
    return set('blender', resolveExec('blender'));
  },
  get ffmpeg() {
    return set('ffmpeg', resolveExec('ffmpeg'));
  },
  get ffprobe() {
    return set('ffprobe', resolveExec('ffprobe'));
  },
  get electron() {
    let globalElectron: string | undefined = undefined;
    try {
      globalElectron = require('electron') as any;
    } catch (error) {
      const electronSearchPaths = ['electron', 'electron18'];
      for (const electron of electronSearchPaths.filter(p => p)) {
        const resolved = resolveExec(electron!);
        if (resolved) {
          globalElectron = resolved;
          break;
        }
      }
    }
    return set('electron', globalElectron!);
  },
};

function set(key: string, value: string) {
  Object.defineProperty(appPath, key, { value });
  return value;
}
