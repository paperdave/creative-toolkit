export enum RenderProgram {
  Fusion = 'Fusion',
  Blender = 'Blender',
  CTWaveform = 'Waveform',
  CTFilm = 'Film',
  CTSequencer = 'Sequencer',
}

export function extensionToRenderProgram(ext: string): RenderProgram {
  if (ext.startsWith('.')) {
    ext = ext.slice(1);
  }
  switch (ext) {
    case 'blend':
      return RenderProgram.Blender;
    case 'comp':
      return RenderProgram.Fusion;
    default:
      throw new Error(`Unknown extension: ${ext}`);
  }
}

export const DEFAULT_PATHS = {
  audio: '{id}.wav',
  fusionLog: 'fusion.log',

  step1: 'step1',
  step2: 'step2',
  film: 'film',
  preview: 'preview',
  output: 'out',

  render: '/render',
  temp: process.env.TEMP ?? process.env.TMPDIR ?? '/tmp',
};

export type Paths = Record<keyof typeof DEFAULT_PATHS, string>;
