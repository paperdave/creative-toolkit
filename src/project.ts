import path from 'path';
import { pascalCase } from 'change-case';
import { exists, readJSON, walkUpDirectoryTree, writeJSON } from './util/fs';

export enum RenderProgram {
  Fusion = 'Fusion',
}

const win = process.platform === 'win32';
const defaultPaths: Paths = {
  projectJSON: 'project.json',
  comps: 'comps',
  render: win ? 'C:\\Render' : '/render',
  execFusion: win ? 'TODO' : '/opt/BlackmagicDesign/Fusion9/Fusion',
};

export interface ProjectJSON {
  id: string;
  name: string;
  dates: Array<[dateString: string, label: string]>;
  paths?: Partial<Paths>;
}

export interface Paths {
  projectJSON: string;
  render: string;
  comps: string;

  execFusion: string;
}

export class Project {
  root: string;
  id: string;
  name: string;
  dates: Array<[dateString: string, label: string]>;
  paths: Paths;
  overridePaths: Partial<Paths> = {};

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
          this.paths[key as keyof Paths] = path.resolve(this.root, pathObject[key as keyof Paths]);
        }
      }
    }
  }

  get json(): ProjectJSON {
    return {
      id: this.id,
      name: this.name,
      dates: this.dates,
      paths: Object.keys(this.overridePaths).length > 0 ? this.overridePaths : undefined,
    };
  }

  async writeJSON() {
    await writeJSON(this.paths.projectJSON, this.json);
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

  const json = (await readJSON(path.join(root, 'project.json'))) as ProjectJSON;
  return new Project(root, json, paths);
}
