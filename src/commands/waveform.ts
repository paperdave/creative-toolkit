import w from 'wavefile';
import { Logger, Progress } from '@paperdave/logger';
import type { Dict } from '@paperdave/utils';
import { range } from '@paperdave/utils';
import { createCanvas } from 'canvas';
import { readFile, writeFile } from 'fs/promises';
import { Command } from '../cmd';

const minMaxValues: Dict<[number, number]> = {
  '8': [0, 255],
  '16': [-32768, 32767],
  '24': [-8388608, 8388607],
  '32': [-2147483648, 2147483647],
  '32f': [-1, 1],
  '64': [-1, 1],
};

function rootMeanSquare(values: number[]): number {
  const sum = values.reduce((a, b) => a + b ** 2, 0);
  return Math.sqrt(sum / values.length);
}

function formatTimeStamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

function subarray(array: Float64Array, start: number, length: number) {
  if (start < 0) {
    length += start;
    start = 0;
  }
  length = Math.min(array.length, length);
  if (length <= 0) {
    return [0];
  }
  return array.subarray(start, start + length);
}

const rmsCache = new WeakMap<Float64Array, Map<number, number>>();

function rmsSubArray(array: Float64Array, start: number, length: number) {
  let cache = rmsCache.get(array);
  if (!cache) {
    rmsCache.set(array, (cache = new Map()));
  }
  let entry = cache.get(start);
  if (entry == null) {
    cache.set(start, (entry = rootMeanSquare(subarray(array, start, length) as number[])));
  }
  return entry!;
}

export const AudioWaveformCommand = new Command({
  usage: 'ct waveform',
  desc: 'waveform',
  async run({ project }) {
    if (!project.hasAudio) {
      Logger.error('No audio found in project');
      return;
    }

    const wav = new w.WaveFile();
    wav.fromBuffer(await readFile(project.paths.audio));

    const [MIN_VALUE, MAX_VALUE] = minMaxValues[wav.bitDepth]!;

    const { sampleRate } = wav.fmt as any;
    const FPS = 30;
    const channels = wav.getSamples(false, Float64Array) as unknown as Float64Array[];
    const SAMPLES_PER_FRAME = sampleRate / FPS;
    const FRAMES = Math.ceil(channels[0].length / SAMPLES_PER_FRAME - 1);
    const FRAME_MAXLEN = Math.max(Math.log10(FRAMES)) + 1;

    Logger.info('Audio is %d seconds', channels[0].length / sampleRate);
    Logger.info('samplesPerFrame %d', SAMPLES_PER_FRAME);
    Logger.info('frames %d', FRAMES);

    const WIDTH = 1920;
    const WAVEFORM_DETAIL = 2;
    const HEIGHT = 1080;
    const CENTER_Y = HEIGHT / 2;
    const UNIT = 1920 / 100;
    const SECONDS_VISIBLE_AT_ONCE = 2;
    const NOW_SECOND_AT = WIDTH * 0.25;
    const WAVEFORM_HEIGHT = HEIGHT * 0.35;
    const PIXELS_PER_FRAME = WIDTH / (FPS * SECONDS_VISIBLE_AT_ONCE);
    const SAMPLES_PER_COLUMN = SAMPLES_PER_FRAME / WAVEFORM_DETAIL;
    const COLUMN_WIDTH = WIDTH / SAMPLES_PER_COLUMN;
    const COLUMNS = Math.ceil(WIDTH / COLUMN_WIDTH);

    const COLOR_BACKGROUND = '#111f10';
    const COLOR_BACKGROUND_AUDIO = '#132513';
    const COLOR_BACKGROUND_ACTIVE = '#802013';
    const COLOR_TEXT = '#ffffff';
    const COLOR_WAVE_L = '#59ff75';
    const COLOR_WAVE_R = '#57ffdf';

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // await mkdir('waveform');

    const [left, right] = channels.map(channel =>
      channel.map(sample => (sample > 0 ? sample / MAX_VALUE : sample / MIN_VALUE))
    );

    const bar = new Progress({
      text: ({ value }) => `Waveform Generation ${value}/${FRAMES}`,
      total: FRAMES,
    });

    for (const frame of range(FRAMES)) {
      ctx.fillStyle = COLOR_BACKGROUND;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = COLOR_BACKGROUND_AUDIO;
      ctx.fillRect(0, CENTER_Y - WAVEFORM_HEIGHT, WIDTH, WAVEFORM_HEIGHT * 2);
      ctx.fillStyle = COLOR_BACKGROUND_ACTIVE;
      ctx.fillRect(
        NOW_SECOND_AT,
        CENTER_Y - WAVEFORM_HEIGHT,
        PIXELS_PER_FRAME,
        WAVEFORM_HEIGHT * 2
      );

      const startSample = frame * SAMPLES_PER_FRAME;
      // Logger.info(startSample);
      for (let col = 0; col < COLUMNS; col++) {
        const leftHeight =
          rmsSubArray(left, startSample + SAMPLES_PER_COLUMN * col, SAMPLES_PER_COLUMN) *
          WAVEFORM_HEIGHT;
        const rightHeight =
          rmsSubArray(right, startSample + SAMPLES_PER_COLUMN * col, SAMPLES_PER_COLUMN) *
          WAVEFORM_HEIGHT;
        ctx.fillStyle = COLOR_WAVE_L;
        ctx.fillRect(col * COLUMN_WIDTH, CENTER_Y - leftHeight, COLUMN_WIDTH, leftHeight);
        ctx.fillStyle = COLOR_WAVE_R;
        ctx.fillRect(col * COLUMN_WIDTH, CENTER_Y, COLUMN_WIDTH, rightHeight);
      }

      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `${UNIT * 4}px monospace`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(
        frame.toString().padStart(FRAME_MAXLEN, '0'),
        NOW_SECOND_AT,
        CENTER_Y - WAVEFORM_HEIGHT - UNIT
      );
      ctx.textAlign = 'left';
      ctx.fillText(
        ' '.repeat(12) + formatTimeStamp(frame / FPS),
        NOW_SECOND_AT,
        CENTER_Y - WAVEFORM_HEIGHT - UNIT
      );

      if (project.audioTiming && project.audioTiming.bpm) {
      }

      await writeFile(`waveform/${frame}.png`, canvas.toBuffer());
      bar.update(frame);
    }
    bar.success('Waveform Generated');
  },
});
