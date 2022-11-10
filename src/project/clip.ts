import type { RenderProgram } from './paths';

export interface SequenceClip {
  start: number;
  end: number;
  label: string;
  ext: string;
  filename: string;
  step: number;
  type: RenderProgram;
  length: number;
}

export interface UnarrangedSequenceClip {
  start: number | null;
  end: number | null;
  label: string;
  ext: string;
  filename: string;
  step: number;
  type: RenderProgram;
  length: number | null;
}
