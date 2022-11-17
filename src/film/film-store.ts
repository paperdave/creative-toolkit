import path from 'path';
import YAML from 'yaml';
import { Project } from '$/project';
import { Logger } from '@paperdave/logger';
import { pathExists, writeYAML } from '@paperdave/utils';
import { mkdir, readdir, readFile, rm } from 'fs/promises';

export interface FilmShotFilenameSplit {
  start: number;
  end: number;
  id: string;
}

export interface RawFilmShot {
  comment: string;
  createdAt: number;
  takes: RawFilmShotTake[];
}

export interface RawFilmShotTake {
  num: number;
  createdAt: number;
}

export class FilmStore {
  shots = new Map<string, FilmShot>();
  private shotsById = new Map<string, FilmShot>();

  constructor(readonly project: Project) {}

  get root() {
    return this.project.paths.film;
  }

  keys() {
    return [...this.shots.keys()];
  }

  write() {
    for (const shot of this.shots.values()) {
      shot.write();
    }
  }

  async createShot({ start, end, id }: FilmShotFilenameSplit) {
    if (this.shotsById.has(id)) {
      let n = 2;
      while (this.shotsById.has(`${id}_${n}`)) {
        n++;
      }
      id = `${id}_${n}`;
    }
    const dirname = `${start}-${end}_${id}`;
    const metadata = {
      comment: '',
      createdAt: Date.now(),
      takes: [],
    };
    const shot = new FilmShot({ start, end, id }, metadata, this);
    this.shots.set(dirname, shot);
    this.shotsById.set(shot.id, shot);
    await mkdir(shot.root, { recursive: true });
    await shot.write();
    return shot;
  }

  getShot(shotId: string) {
    return this.shotsById.get(shotId);
  }
}

export class FilmShot {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  createdAt: Date;
  comment: string;

  takes = new Map<number, FilmTake>();

  get length() {
    return this.end - this.start;
  }

  constructor(
    { end, id: label, start }: FilmShotFilenameSplit,
    metadata: RawFilmShot,
    private store: FilmStore
  ) {
    this.id = label;
    this.start = start;
    this.end = end;
    this.comment = metadata.comment;
    this.createdAt = new Date(metadata.createdAt);

    for (const take of metadata.takes) {
      this.takes.set(take.num, new FilmTake(take, this));
    }
  }

  get data(): RawFilmShot {
    return {
      comment: this.comment,
      createdAt: this.createdAt.getTime(),
      takes: [...this.takes.values()].map(take => take.data),
    };
  }

  get root() {
    return path.join(this.store.root, `${this.start}-${this.end}_${this.id}`);
  }

  async write() {
    await writeYAML(path.join(this.root, 'metadata.yaml'), this.data);
  }

  async delete() {
    await rm(this.root, { recursive: true });
  }

  get nextTakeNum() {
    const next = Math.max(...this.takes.keys()) + 1;
    return next > 0 ? next : 1;
  }

  /** Does not do the file writing, the caller is responsible for that. */
  async createTakeEntry() {
    const num = this.nextTakeNum;
    const take = new FilmTake({ num, createdAt: Date.now() }, this);
    this.takes.set(num, take);
    await this.write();
    return take;
  }
}

export class FilmTake {
  num: number;
  createdAt: Date;

  constructor(metadata: RawFilmShotTake, private shot: FilmShot) {
    this.num = metadata.num;
    this.createdAt = new Date(metadata.createdAt);
  }

  get data(): RawFilmShotTake {
    return {
      num: this.num,
      createdAt: this.createdAt.getTime(),
    };
  }

  get filename() {
    return path.join(this.shot.root, `${this.num}.mp4`);
  }

  async delete() {
    this.shot.takes.delete(this.num);
    await rm(this.filename, { force: true });
    await this.shot.write();
  }
}

export async function loadFilmStore(project: Project) {
  const store = new FilmStore(project);
  if (!(await pathExists(store.root))) {
    await mkdir(store.root);
  }
  const list = await readdir(project.paths.film);
  for (const shot of list) {
    const [start, end, label] = /^(\d+)-(\d+)_(.*)$/.exec(shot)!.slice(1) ?? [];

    if (!start || !end || !label) {
      Logger.warn(`Film "${shot}", will be ignored...`);
      continue;
    }

    try {
      const metadata = await readFile(path.join(store.root, shot, 'metadata.yaml'), 'utf8').then(
        text => YAML.parse(text)
      );
      store.shots.set(
        shot,
        new FilmShot({ start: Number(start), end: Number(end), id: label }, metadata, store)
      );
      // @ts-expect-error private
      store.shotsById.set(label, store.shots.get(shot)!);
    } catch (error) {
      Logger.warn(`Error in metadata for shot "${label}", this shot will be ignored...`);
    }
  }
  return store;
}
