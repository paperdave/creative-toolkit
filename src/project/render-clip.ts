import { IRange, RangeResolvable } from '$util';
import { Emitter } from '@paperdave/events';
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
  done: Promise<void>;
};

export interface ClipRendererEvents {
  progress: ClipRenderProgressEvent;
}

export interface ClipRenderProgressEvent {
  project: Project;
  clip: SequenceClip;
  ranges: IRange[];
  frame: number;
  value: number;
  total: number;
  progress: number;
}

export function renderClip(opts: RenderClipOptions) {
  switch (opts.clip.type) {
    case RenderProgram.Blender:
      return renderBlenderClip(opts);
    case RenderProgram.Fusion:
      return renderFusionClip(opts);
    default:
      throw new Error(`Unsupported clip type: ${opts.clip.type}`);
  }
}
