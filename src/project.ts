import path from 'path';
import { pascalCase } from 'change-case';
import { existsSync, mkdirSync } from 'fs';
import type { AudioTiming, ProjectJSON, ProjectJSONAnyVersion } from './project-json';
import { exists, readJSON, walkUpDirectoryTree, writeJSON } from './util/fs';

export enum RenderProgram {
  Fusion = 'Fusion',
  CTWaveform = 'CTWaveform',
}

const win = process.platform === 'win32';

const execFusion = [
  'Fusion',
  'fusion',
  ...(win
    ? [
        'C:\\Program Files\\Blackmagic Design\\Fusion 18\\Fusion.exe',
        'C:\\Program Files\\Blackmagic Design\\Fusion 17\\Fusion.exe',
        'C:\\Program Files\\Blackmagic Design\\Fusion 9\\Fusion.exe',
      ]
    : [
        '/opt/BlackmagicDesign/Fusion18/Fusion',
        '/opt/BlackmagicDesign/Fusion17/Fusion',
        '/opt/BlackmagicDesign/Fusion9/Fusion',
      ]),
];

const defaultPaths = {
  projectJSON: 'project.json',
  comps: 'comps',
  render: win ? 'C:\\Render' : '/render',
  audio: '{id}.wav',
  temp: process.env.TEMP ?? process.env.TMPDIR ?? (win ? 'C:\\Temp' : '/tmp'),
  film: 'film',

  execFusion,
  execFusionRender: [
    'FusionRenderNode',
    'fusion-render',
    ...(win
      ? [
          'C:\\Program Files\\Blackmagic Design\\Fusion Render Node 18\\FusionRenderNode.exe',
          'C:\\Program Files\\Blackmagic Design\\Fusion Render Node 17\\FusionRenderNode.exe',
          'C:\\Program Files\\Blackmagic Design\\Fusion Render Node 9\\FusionRenderNode.exe',
        ]
      : [
          '/opt/BlackmagicDesign/Fusion18/FusionRenderNode',
          '/opt/BlackmagicDesign/Fusion17/FusionRenderNode',
          '/opt/BlackmagicDesign/Fusion9/FusionRenderNode',
        ]),
    ...execFusion,
  ],
  execFFmpeg: 'ffmpeg',
  execFFprobe: 'ffprobe',
};
export type Paths = Record<keyof typeof defaultPaths, string>;

function resolveExec(pathname: string | string[], root = process.cwd()): string {
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
    const execPath = path.join(binPath, pathname) + (win ? '.exe' : '');
    if (existsSync(execPath)) {
      return execPath;
    }
  }
  return null!;
}

export class Project {
  root: string;
  id: string;
  name: string;
  dates: Array<[dateString: string, label: string]>;
  paths: Paths;
  audioTiming: AudioTiming;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;

  constructor(root: string, json: ProjectJSON, pathOverrides: Partial<Paths>) {
    this.root = path.resolve(root);

    this.id = json.id;
    this.name = json.name;
    this.dates = json.dates;
    this.audioTiming = json.audioTiming;

    this.paths = {} as Paths;

    const pathObjects = [defaultPaths, json.paths, pathOverrides].filter(Boolean) as Paths[];

    for (const pathObject of pathObjects) {
      for (const key in pathObject) {
        if (pathObject[key as keyof Paths]) {
          this.paths[key as keyof Paths] = key.startsWith('exec')
            ? resolveExec(pathObject[key as keyof Paths], this.root)
            : path.resolve(this.root, pathObject[key as keyof Paths].replaceAll('{id}', this.id));
        }
      }
    }

    this.hasAudio = existsSync(this.paths.audio);

    if (!existsSync(this.paths.temp)) {
      mkdirSync(this.paths.temp);
    }
  }

  get json(): ProjectJSON {
    return {
      id: this.id,
      name: this.name,
      dates: this.dates,
      paths: Object.keys(this.overridePaths).length > 0 ? this.overridePaths : undefined,
      audioTiming: this.audioTiming,
      format: 1,
    };
  }

  async writeJSON() {
    await writeJSON(this.paths.projectJSON, this.json, { spaces: 2 });
  }

  getRenderId(program: string, shot?: string) {
    return [this.id, program, shot]
      .filter(Boolean)
      .map(x => pascalCase(x!))
      .join('-');
  }

  getRenderFullPath(program: string, shot?: string) {
    return path.resolve(this.paths.render, this.getRenderId(program, shot));
  }
}

export async function resolveProject(startPath: string, paths: Partial<Paths>): Promise<Project> {
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  const root = await walkUpDirectoryTree(startPath, dir => exists(dir, 'project.json'));

  if (!root) {
    const e = new Error('Could not find a creative toolkit project. Run `ct init`.');
    (e as any).code = 'ENOENT';
    throw e;
  }

  const json = (await readJSON(path.join(root, 'project.json'))) as ProjectJSONAnyVersion;
  return new Project(root, json, paths);
}
