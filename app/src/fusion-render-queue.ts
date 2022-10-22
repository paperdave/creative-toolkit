import chalk from 'chalk';
import path from 'path';
import { Logger, Spinner } from '@paperdave/logger';
import { asyncMap, createArray, pathExists, readJSON, unique, writeJSON } from '@paperdave/utils';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { readdir } from 'fs/promises';
import { PassThrough } from 'stream';
import { Project, RenderProgram } from './project';
import { Composition } from '../../src/fusion/Composition';

const logFusion = new Logger('fusion');

export type RenderQueueRequest =
  | {
      start: number;
      end: number;
    }
  | {
      ranges: RenderRange[];
    }
  | {
      all: true;
    };

export interface RenderRange {
  start: number;
  end: number;
}

export enum FrameState {
  None = 'NONE',
  Queued = 'QUEUED',
  Rendering = 'RENDERING',
  Done = 'DONE',
  Error = 'ERROR',
}

export class FrameStatus {
  state: FrameState;
  stale: boolean;

  constructor(state: FrameState, stale: boolean) {
    this.state = state;
    this.stale = stale;
  }

  get viewable() {
    return this.state === FrameState.Done || this.stale;
  }

  get queued() {
    return this.state === FrameState.Queued || this.state === FrameState.Rendering;
  }

  set queued(value: boolean) {
    if (value) {
      this.state = FrameState.Queued;
    } else {
      this.state = FrameState.None;
    }
  }
}

export interface RenderQueueEntry {
  label: string;
  comp: Composition;
  frameStats: Map<number, FrameStatus>;
  cache: CacheDataJSON;
}

export interface CacheDataJSON {
  freshFrames: number[];
  compHash: string;
}

export class RenderQueue {
  static async create(project: Project) {
    const comps = await readdir(project.paths.comps);
    const entries = await asyncMap(comps, async filename => {
      const label = filename.replace(/^[0-9]+-[0-9]+_|.comp$/g, '');
      const comp = await Composition.fromFile(path.join(project.paths.comps, filename));
      const renderStore = project.getRenderFullPath(RenderProgram.Fusion, label);
      const read = (await pathExists(renderStore))
        ? // note that `parseInt` will stop parsing at the first non-numeric character
          (await readdir(renderStore)).map(x => parseInt(x, 10))
        : [];

      const cache = (
        (await pathExists(path.join(renderStore, 'cache.json')))
          ? await readJSON(path.join(renderStore, 'cache.json'), {})
          : { freshFrames: [], compHash: '' }
      ) as CacheDataJSON;

      const newHash = createHash('sha256').update(comp.toString()).digest('hex');

      if (cache.compHash !== newHash) {
        cache.freshFrames = [];
        cache.compHash = newHash;
        Logger.info('Invalidating cache for comp %s.', chalk.cyan(label));
      }

      const frameStats = new Map(
        createArray(comp.RenderRangeLength, i => i + comp.RenderRangeStart).map(frame => [
          frame,
          new FrameStatus(
            read.includes(frame) ? FrameState.Done : FrameState.None,
            !cache.freshFrames.includes(frame)
          ),
        ])
      );

      return {
        label,
        comp,
        frameStats,
        cache,
      };
    });
    return new RenderQueue(project, entries);
  }

  private constructor(readonly project: Project, readonly entries: RenderQueueEntry[]) {}

  add(request: RenderQueueRequest) {
    if (this.entries.length === 0) {
      return;
    }
    const ranges: RenderRange[] = [];
    if ('start' in request) {
      ranges.push({ start: request.start, end: request.end });
    }
    if ('ranges' in request) {
      ranges.push(...request.ranges);
    }
    if ('all' in request) {
      ranges.push({
        start: this.entries.at(0)!.comp.RenderRangeStart,
        end: this.entries.at(-1)!.comp.RenderRangeEnd,
      });
    }
    for (const entry of this.entries) {
      if (entry.label === 'thumbnail') {
        continue;
      }
      const [start, end] = entry.comp.RenderRange;
      for (const range of ranges) {
        // if the range partially intersects, trim and add it
        if (range.start <= end && range.end >= start) {
          const trimmedStart = Math.max(range.start, start);
          const trimmedEnd = Math.min(range.end, end);

          for (let i = trimmedStart; i <= trimmedEnd; i++) {
            const frame = entry.frameStats.get(i)!;
            if (frame.stale || frame.state === FrameState.None) {
              frame.queued = true;
              frame.state = FrameState.Queued;
            }
          }
        }
      }
    }
  }

  addThumbnail() {
    const entry = this.entries.find(x => x.label === 'thumbnail');
    if (entry) {
      const frame = entry.frameStats.get(0)!;
      if (frame.stale || frame.state === FrameState.None) {
        frame.queued = true;
        frame.state = FrameState.Queued;
      }
    }
  }

  getFusionJobList() {
    return this.entries
      .filter(entry => [...entry.frameStats.values()].some(frame => frame.queued))
      .map(entry => {
        const frames = [...entry.frameStats.entries()]
          .filter(([, frame]) => frame.queued)
          .map(([frame]) => frame);

        // convert to ranges
        const ranges: RenderRange[] = [];
        let current: RenderRange | undefined;
        for (const frame of frames) {
          if (current === undefined) {
            current = { start: frame, end: frame };
          } else if (current.end + 1 === frame) {
            current.end = frame;
          } else {
            ranges.push(current);
            current = { start: frame, end: frame };
          }
        }
        if (current !== undefined) {
          ranges.push(current);
        }
        return {
          entry,
          ranges,
          frames,
        };
      });
  }

  async render() {
    const jobs = this.getFusionJobList();
    if (jobs.length === 0) {
      Logger.info('All fusion renders up to date');
    }
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const filepath = job.entry.comp.filepath!;
      const label = job.entry.label;

      const frameset = job.ranges
        .map(({ start, end }) => (start === end ? start : `${start}..${end}`))
        .join(',');

      const frameCount = job.ranges.reduce((acc, { start, end }) => acc + end - start + 1, 0);

      const argv = ['-render', filepath, '-frames', frameset, '-quit'];

      const spinner = new Spinner({
        text: `(${i + 1}/${jobs.length}) Rendering ${frameCount} frame${
          frameCount !== 1 ? 's' : ''
        } from ${label}`,
      });
      await new Promise<void>((resolve, reject) => {
        const proc = spawn(this.project.paths.execFusionRender, argv, {
          stdio: 'pipe',
        });

        function filterLine(line: string) {
          return (
            !line.includes('xkbcommon: ERROR: failed to add default include path') &&
            !line.includes('| GPUDetect') &&
            !line.includes('cannot open shared object file: No such file or directory') &&
            !line.startsWith('ALSA lib ') &&
            !line.startsWith('log4cxx: ') &&
            !line.startsWith('QCursor: Cannot create bitmap cursor; invalid bitmap(s)') &&
            !line.startsWith('QApplication: invalid style override') &&
            !line.startsWith('Unable to read VR Path Registry from ') &&
            line !==
              'Attribute Qt::AA_ShareOpenGLContexts must be set before QCoreApplication is created.' &&
            line.trim() !== 'Available styles: Windows, Fusion'
          );
        }

        let line = '';
        function processData(data: string) {
          line += data.toString();
          const lines = line.split('\n');
          line = lines.pop()!;
          for (const line of lines.filter(filterLine)) {
            logFusion(line);
          }
        }

        proc.stdout.on('data', processData);
        proc.stderr.on('data', processData);

        proc.on('exit', async status => {
          if (status === 0) {
            for (const frame of job.frames) {
              const stats = job.entry.frameStats.get(frame)!;
              stats.queued = false;
              stats.state = FrameState.Done;
              job.entry.cache.freshFrames.push(frame);
            }
            job.entry.cache.freshFrames = unique(job.entry.cache.freshFrames).sort((a, b) => a - b);
            await writeJSON(
              path.join(this.project.getRenderFullPath(RenderProgram.Fusion, label), 'cache.json'),
              job.entry.cache
            );
            spinner.success(
              `Rendered ${frameCount} frame${frameCount !== 1 ? 's' : ''} from ${label}`
            );
            resolve();
          } else {
            for (const frame of job.frames) {
              const stats = job.entry.frameStats.get(frame)!;
              stats.queued = false;
              stats.state = FrameState.Error;
            }
            spinner.error(`Failed to render ${label}`);
            reject();
          }
        });
      });
    }
  }

  getPNGStream(range: RenderRange) {
    const stream = new PassThrough();
    (async () => {
      for (const entry of this.entries) {
        if (entry.label === 'thumbnail') {
          continue;
        }
        // if the range partially intersects, grab the frames
        if (range.start <= entry.comp.RenderRange[1] && range.end >= entry.comp.RenderRange[0]) {
          const out = this.project.getRenderFullPath(RenderProgram.Fusion, entry.label);
          const trimmedStart = Math.max(range.start, entry.comp.RenderRange[0]);
          const trimmedEnd = Math.min(range.end, entry.comp.RenderRange[1]);
          for (let frame = trimmedStart; frame <= trimmedEnd; frame++) {
            const filename = path.join(out, `${frame.toString().padStart(4, '0')}.png`);
            const file = createReadStream(filename);
            file.pipe(stream, { end: false });
            await new Promise(resolve => file.on('end', resolve));
          }
        }
      }
      stream.end();
    })();
    return stream;
  }
}
