import path from 'path';
import { TOOLKIT_FORMAT } from '$constants';
import { asyncMap, writeJSON } from '@paperdave/utils';
import { pascalCase } from 'change-case';
import { existsSync, mkdirSync } from 'fs';
import { readdir } from 'fs/promises';
import { arrangeProject } from './arrange';
import { UnarrangedSequenceClip } from './clip';
import { DEFAULT_PATHS, extensionToRenderProgram, Paths, resolveExec } from './paths';
import { AudioTiming, ProjectJSON } from './project-json';
import { FusionRenderNode, startFusionRenderNode } from '../fusion-server/fusion-render-node';

const excludedClipExtensions = ['.autocomp'];

export class Project {
  root: string;
  id: string;
  name: string;
  paths: Paths;
  audioTiming: AudioTiming;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;
  isArranged = false;

  constructor(root: string, json: ProjectJSON, pathOverrides: Partial<Paths>) {
    this.root = path.resolve(root);

    this.id = json.id;
    this.name = json.name;
    this.audioTiming = json.audioTiming;
    this.overridePaths = json.paths ?? {};

    this.paths = {} as Paths;

    const pathObjects = [DEFAULT_PATHS, json.paths, pathOverrides] //
      .filter(Boolean) as Paths[];

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

    if (!existsSync(this.paths.step1)) {
      mkdirSync(this.paths.step1);
    }

    if (!existsSync(this.paths.step2)) {
      mkdirSync(this.paths.step2);
    }
  }

  get json(): ProjectJSON {
    return {
      id: this.id,
      name: this.name,
      paths: Object.keys(this.overridePaths).length > 0 ? this.overridePaths : undefined,
      audioTiming: this.audioTiming,
      format: TOOLKIT_FORMAT,
    };
  }

  async writeJSON() {
    await writeJSON(this.paths.projectJSON, this.json, {
      spaces: 2,
      replacer: null,
    });
  }

  getRenderId(program: string, ...shot: string[]) {
    return [this.id, program, ...shot]
      .filter(Boolean)
      .map(x => pascalCase(x!))
      .join('-');
  }

  getRenderFullPath(program: string, ...shot: string[]) {
    return path.resolve(this.paths.render, this.getRenderId(program, ...shot));
  }

  private cachedClips: UnarrangedSequenceClip[] | null = null;
  async getClips(): Promise<UnarrangedSequenceClip[]> {
    if (this.cachedClips) {
      return this.cachedClips;
    }
    return (this.cachedClips = (
      await asyncMap(['step1', 'step2'], async (step: keyof Paths) => {
        const contents = (await readdir(this.paths[step])).filter(
          x => !excludedClipExtensions.includes(path.extname(x))
        );
        return contents.map(x => {
          // eslint-disable-next-line prefer-const -- bug found in eslint
          let [start, end, label, ext] = /^(\d+)-(\d+)_(.*)\.(.*)$/.exec(x)?.slice(1) ?? [];

          if (!start) {
            ext = /\.(\w+)$/.exec(x)![1];
            label = x.replace(`.${ext}`, '');
          }

          return {
            type: extensionToRenderProgram(ext),
            start: start ? Number(start) : null,
            end: end ? Number(end) : null,
            label,
            ext,
            filename: path.join(this.paths[step], x),
            step: step === 'step1' ? 1 : 2,
            length: end ? Number(end) - Number(start) + 1 : null,
          };
        });
      })
    ).flat());
  }

  private cachedFusionServer?: FusionRenderNode;
  async getFusionRenderNode() {
    if (!this.cachedFusionServer) {
      this.cachedFusionServer = await startFusionRenderNode(this);
    }
    return this.cachedFusionServer!;
  }

  async arrange() {
    return arrangeProject(this);
  }

  close() {
    if (this.cachedFusionServer) {
      this.cachedFusionServer.close();
      this.cachedFusionServer = undefined;
    }
  }
}
