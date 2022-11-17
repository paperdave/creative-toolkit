import path from 'path';
import { TOOLKIT_FORMAT } from '$/constants';
import { FilmStore, loadFilmStore } from '$/film/film-store';
import { asyncMap, writeYAML } from '@paperdave/utils';
import { pascalCase } from 'change-case';
import { existsSync, mkdirSync } from 'fs';
import { readdir } from 'fs/promises';
import { arrangeProject } from './arrange';
import { SequenceClip, UnarrangedSequenceClip } from './clip';
import { DEFAULT_PATHS, extensionToRenderProgram, Paths } from './paths';
import { AudioTiming, RawProject } from './project-json';

const excludedClipExtensions = ['.autocomp'];

export class Project {
  root: string;
  id: string;
  name: string;
  paths: Paths;
  fps: number;
  audioTiming: AudioTiming;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;
  arranged = false;

  constructor(root: string, json: RawProject, pathOverrides: Partial<Paths>) {
    this.root = path.resolve(root);

    this.id = json.id;
    this.name = json.name;
    this.audioTiming = json.audioTiming;
    this.overridePaths = json.paths ?? {};
    this.fps = json.fps ?? 60;

    this.paths = {} as Paths;

    const pathObjects = [DEFAULT_PATHS, json.paths, pathOverrides] //
      .filter(Boolean) as Paths[];

    for (const pathObject of pathObjects) {
      for (const key in pathObject) {
        if (pathObject[key as keyof Paths]) {
          this.paths[key as keyof Paths] = path.resolve(
            this.root,
            pathObject[key as keyof Paths].replaceAll('{id}', this.id)
          );
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

  get data(): RawProject {
    return {
      id: this.id,
      name: this.name,
      paths: Object.keys(this.overridePaths).length > 0 ? this.overridePaths : undefined,
      fps: this.fps,
      audioTiming: this.audioTiming,
      format: TOOLKIT_FORMAT,
    };
  }

  async write() {
    this.cachedFilmStore?.write();
    await writeYAML(this.root + '/project.yaml', this.data);
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
  async getRawClips(): Promise<UnarrangedSequenceClip[]> {
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

  async arrange() {
    return arrangeProject(this);
  }

  async getClips() {
    if (this.arranged) {
      return (await this.getRawClips()) as SequenceClip[];
    }
    return this.arrange();
  }

  private cachedFilmStore?: FilmStore;
  async getFilmStore() {
    if (!this.cachedFilmStore) {
      this.cachedFilmStore = await loadFilmStore(this);
    }
    return this.cachedFilmStore;
  }
}
