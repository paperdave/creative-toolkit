import path from 'path';
import { pascalCase } from 'change-case';
import { existsSync } from 'fs';
import type { ProjectJSON, ProjectJSONAnyVersion } from './project-json';
import { exists, readJSON, walkUpDirectoryTree, writeJSON } from './util/fs';

export enum RenderProgram {
  Fusion = 'Fusion',
}

const win = process.platform === 'win32';
const defaultPaths = {
  projectJSON: 'project.json',
  comps: 'comps',
  render: win ? 'C:\\Render' : '/render',
  audio: '{id}.wav',

  execFusion: win ? 'TODO' : '/opt/BlackmagicDesign/Fusion9/Fusion',
  execFFmpeg: 'ffmpeg', // ffmpeg should be in PATH
};
export type Paths = typeof defaultPaths;

function resolveExec(pathname: string, root = process.cwd()): string {
  if (pathname.startsWith('/')) {
    return pathname;
  }
  if (pathname.startsWith('.')) {
    return path.resolve(pathname, root);
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

export class Project {
  root: string;
  id: string;
  name: string;
  dates: Array<[dateString: string, label: string]>;
  paths: Paths;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;

  constructor(root: string, json: ProjectJSON, pathOverrides: Partial<Paths>) {
    this.root = path.resolve(root);

    this.id = json.id;
    this.name = json.name;
    this.dates = json.dates;

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
  }

  get json(): ProjectJSON {
    return {
      id: this.id,
      name: this.name,
      dates: this.dates,
      paths: Object.keys(this.overridePaths).length > 0 ? this.overridePaths : undefined,
      format: 1,
    };
  }

  async writeJSON() {
    await writeJSON(this.paths.projectJSON, this.json, { spaces: 2 });
  }

  getRenderId(program: string, shot: string) {
    return [this.id, program, shot].map(x => pascalCase(x)).join('-');
  }

  getRenderFullPath(program: string, shot: string) {
    return path.resolve(this.paths.render, this.getRenderId(program, shot));
  }
}

export async function resolveProject(startPath: string, paths: Partial<Paths>): Promise<Project> {
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  const root = await walkUpDirectoryTree(startPath, dir => exists(dir, 'project.json'));

  if (!root) {
    throw new Error('Could not find a creative toolkit project. Run `ct init`.');
  }

  const json = (await readJSON(path.join(root, 'project.json'))) as ProjectJSONAnyVersion;
  return new Project(root, json, paths);
}
