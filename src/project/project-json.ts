import { Paths } from "./paths";
import { TOOLKIT_VERSION } from "../constants";

export interface ProjectJSON {
  id: string;
  name: string;
  audioTiming: AudioTiming;
  paths?: Partial<Paths>;
  format: typeof TOOLKIT_VERSION;
}

export interface AudioTiming {
  bpm: number;
  start?: number;
}
