import { Subprocess } from 'bun';

export type ReadableSubprocess = Subprocess<any, 'pipe', 'pipe'>;
export type PipedSubprocess = Subprocess<'pipe', 'pipe', 'pipe'>;
export type NullSubprocess = Subprocess<
  'ignore' | 'inherit',
  'ignore' | 'inherit',
  'ignore' | 'inherit'
>;
