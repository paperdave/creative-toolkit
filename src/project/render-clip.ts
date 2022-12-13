import {
  countRangeFrames,
  getRangeProgress,
  iterateRange,
  RangeResolvable,
  rangeToString,
  resolveRange,
} from '$/util';
import { Emitter } from '@paperdave/events';
import { CLIError, Progress } from '@paperdave/logger';
import { deferred } from '@paperdave/utils';
import { existsSync, mkdirSync } from 'fs';
import { SequenceClip } from './clip';
import { RenderProgram } from './paths';
import { Project } from './project';
import { renderBlenderClip } from './render-blender';
import { renderFusionClip } from './render-fusion';

export interface RenderClipOptions {
  project: Project;
  clip: SequenceClip;
  ranges: RangeResolvable;
  bar?: boolean;
}

export type ClipRenderer = Emitter<ClipRendererEvents> & {
  done: Promise<boolean>;
};

export interface ClipRendererEvents {
  raw_progress: ClipRenderRawProgressEvent;
}

export interface ClipRenderRawProgressEvent {
  frame: number;
  status?: string;
  frameProgress?: number;
}

export function renderClip(opts: RenderClipOptions) {
  mkdirSync(opts.project.getRenderFullPath(RenderProgram.CTSequencer, 'step' + opts.clip.step), {
    recursive: true,
  });

  let renderer: ClipRenderer;
  let ext: string;
  switch (opts.clip.type) {
    case RenderProgram.Blender:
      renderer = renderBlenderClip(opts);
      ext = 'exr';
      break;
    case RenderProgram.Fusion:
      renderer = renderFusionClip(opts);
      ext = 'png';
      break;
    default:
      throw new Error(`Unsupported clip type: ${opts.clip.type}`);
  }

  const [promise, resolve, reject] = deferred<boolean>();

  // TODO: uhhh
  // eslint-disable-next-line no-constant-condition
  if (opts.bar === undefined || opts.bar || true) {
    const resolvedRanges = resolveRange(opts.ranges);
    const totalFrames = countRangeFrames(resolvedRanges);
    const padding = resolvedRanges.at(-1)?.end.toString().length ?? 1;
    const clip = `step${opts.clip.step}/${opts.clip.label}`;
    const progress = new Progress({
      props: {
        frame: resolvedRanges[0].start,
        status: undefined as string | undefined,
      },
      value: 0,
      total: 1,
      text: ({ status }) => (status ? status : 'Starting Render...'),
      beforeText: ({ frame }) => `${frame.toString().padStart(padding, '0')}`,
      barWidth: 20,
    });
    renderer.on('raw_progress', frame => {
      const value =
        (frame.frame > 0 ? getRangeProgress(resolvedRanges, frame.frame) : 0) +
        (frame.frameProgress ?? 0) / totalFrames;
      progress.update(value, {
        frame: frame.frame,
        status: frame.status,
      });
    });
    renderer.done //
      .catch(e => e)
      .then(result => {
        if (result instanceof Error) {
          progress.error(result);
          reject(result);
          return;
        }
        const renderBase = opts.project.getRenderFullPath(RenderProgram.CTSequencer, 'Step2');
        for (const checkFrame of iterateRange(opts.ranges)) {
          const filename = `${renderBase}/${checkFrame}.${ext}`;
          if (!existsSync(filename)) {
            const e = new CLIError(
              `Fusion Render Failed`,
              [
                `Comp: ${opts.clip.filename}`,
                `Frame: ${checkFrame}`,
                `Requested Ranges: ${rangeToString(opts.ranges)}.`,
              ].join('\n')
            );
            progress.error(e);
            reject(e);
            return;
          }
        }
        progress.success(`Rendered ${totalFrames} frames from ${clip}`);
        resolve(true);
      });
  }

  renderer.done = promise;
  return renderer;
}
