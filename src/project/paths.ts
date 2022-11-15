import path from 'path';
import { existsSync } from 'fs';

export enum RenderProgram {
  Fusion = 'Fusion',
  Blender = 'Blender',
  CTWaveform = 'Waveform',
  CTFilm = 'Film',
  CTSequencer = 'Sequencer',
}

export function extensionToRenderProgram(ext: string): RenderProgram {
  if (ext.startsWith('.')) {
    ext = ext.slice(1);
  }
  switch (ext) {
    case 'blend':
      return RenderProgram.Blender;
    case 'comp':
      return RenderProgram.Fusion;
    default:
      throw new Error(`Unknown extension: ${ext}`);
  }
}

export const DEFAULT_PATHS = {
  projectJSON: 'project.json',
  audio: '{id}.wav',
  fusionLog: 'fusion.log',

  step1: 'step1',
  step2: 'step2',
  film: 'film',
  preview: 'preview',

  render: '/render',
  temp: process.env.TEMP ?? process.env.TMPDIR ?? '/tmp',

  execFusion: 'Fusion',
  execFusionRender: 'FusionRenderNode',
  execFusionScript: 'fuscript',
  execBlender: 'blender',
  execFFmpeg: 'ffmpeg',
  execFFprobe: 'ffprobe',
  execElectron: ['electron19', 'electron18', 'electron'],
};

export type Paths = Record<keyof typeof DEFAULT_PATHS, string>;

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
