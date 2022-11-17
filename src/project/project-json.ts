import { Paths } from './paths';
import { TOOLKIT_FORMAT } from '../constants';

export interface RawProject {
  id: string;
  name: string;
  audioTiming: AudioTiming;
  fps?: number;
  paths?: Partial<Paths>;
  format: typeof TOOLKIT_FORMAT;
}

export interface AudioTiming {
  bpm: number;
  start?: number;
}
