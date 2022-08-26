import w from 'wavefile';
import { Logger, Progress } from '@paperdave/logger';
import type { Dict } from '@paperdave/utils';
import { range } from '@paperdave/utils';
import { createCanvas } from 'canvas';
import { spawn } from 'child_process';
import { mkdir, readFile } from 'fs/promises';
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

function rmsSubArray(array: Float64Array, start: number, length: number) {
  return rootMeanSquare(subarray(array, start, length) as number[]);
}

export const AudioWaveformCommand = new Command({
  usage: 'ct waveform',
  desc: 'waveform',
  async run({ project }) {
    if (!project.hasAudio) {
      Logger.error('No audio found in project');
      return;
    }

    const WIDTH = 1920;
    const WAVEFORM_DETAIL = 4;
    const HEIGHT = 1080;
    const SECONDS_VISIBLE_AT_ONCE = 2;
    const WAVEFORM_HEIGHT = 0.35;
    const FPS = 30;

    const wav = new w.WaveFile();
    wav.fromBuffer(await readFile(project.paths.audio));

    const [MIN_VALUE, MAX_VALUE] = minMaxValues[wav.bitDepth]!;

    const { sampleRate } = wav.fmt as any;
    const channels = wav.getSamples(false, Float64Array) as unknown as Float64Array[];
    const SAMPLES_PER_FRAME = sampleRate / FPS;
    const FRAMES = Math.ceil(channels[0].length / SAMPLES_PER_FRAME - 1);
    const FRAME_MAXLEN = Math.max(Math.log10(FRAMES)) + 1;

    Logger.info('Audio is %d seconds', channels[0].length / sampleRate);
    Logger.info('samplesPerFrame %d', SAMPLES_PER_FRAME);
    Logger.info('frames %d', FRAMES);

    const COLOR_BACKGROUND = '#111f10';
    const COLOR_BACKGROUND_AUDIO = '#132513';
    const COLOR_BACKGROUND_ACTIVE = '#802013';
    const COLOR_TEXT = '#ffffff';
    const COLOR_WAVE_L = '#59ff75';
    const COLOR_WAVE_R = '#57ffdf';

    const UNIT = WIDTH / 100;
    const NOW_PERCENT = 0.25;
    const CENTER_Y = HEIGHT / 2;
    const WAVEFORM_HEIGHT_PIXELS = HEIGHT * WAVEFORM_HEIGHT;
    const PIXELS_PER_FRAME = WIDTH / (FPS * SECONDS_VISIBLE_AT_ONCE);
    const SAMPLES_PER_COLUMN = SAMPLES_PER_FRAME / WAVEFORM_DETAIL;
    const COLUMN_WIDTH = PIXELS_PER_FRAME / WAVEFORM_DETAIL;
    const COLUMNS = Math.ceil(WIDTH / COLUMN_WIDTH);
    const NOW_X = WIDTH * NOW_PERCENT - ((WIDTH * NOW_PERCENT) % COLUMN_WIDTH);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // ffmpeg taking in raw bgra data and creating a png sequence from it
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-y', // overwrite existing files
        ['-f', 'rawvideo'],
        ['-vcodec', 'rawvideo'],
        ['-s', `${WIDTH}x${HEIGHT}`],
        ['-pix_fmt', 'bgra'],
        ['-r', `${FPS}`],
        ['-i', '-'],
        ['-vcodec', 'png'],
        ['-r', `${FPS}`],
        ['-q:v', '1'],
        'waveform/%d.png',
      ].flat(),
      {
        stdio: ['pipe', 'ignore', 'ignore'],
      }
    );

    await mkdir('waveform', { recursive: true });

    const [left, right] = channels.map(channel => {
      for (let i = 0; i < channel.length; i++) {
        channel[i] = channel[i] > 0 ? channel[i] / MAX_VALUE : channel[i] / MIN_VALUE;
      }
      const chunks = new Float64Array(Math.ceil(channel.length / SAMPLES_PER_COLUMN));
      for (let i = 0; i < chunks.length; i++) {
        chunks[i] =
          rmsSubArray(channel, i * SAMPLES_PER_COLUMN, SAMPLES_PER_COLUMN) * WAVEFORM_HEIGHT_PIXELS;
      }
      return chunks;
    });

    const bar = new Progress({
      text: ({ value }) => `Waveform Generation ${value}/${FRAMES}`,
      total: FRAMES,
    });

    for (const frame of range(FRAMES)) {
      ctx.fillStyle = COLOR_BACKGROUND;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = COLOR_BACKGROUND_AUDIO;
      ctx.fillRect(0, CENTER_Y - WAVEFORM_HEIGHT_PIXELS, WIDTH, WAVEFORM_HEIGHT_PIXELS * 2);
      ctx.fillStyle = COLOR_BACKGROUND_ACTIVE;
      ctx.fillRect(
        NOW_X,
        CENTER_Y - WAVEFORM_HEIGHT_PIXELS,
        PIXELS_PER_FRAME,
        WAVEFORM_HEIGHT_PIXELS * 2
      );

      const startCol = frame * WAVEFORM_DETAIL;
      // Logger.info(startSample);
      for (let col = 0; col < COLUMNS; col++) {
        const leftHeight = left[startCol + col];
        const rightHeight = right[startCol + col];
        ctx.fillStyle = COLOR_WAVE_L;
        ctx.fillRect(
          Math.floor(col * COLUMN_WIDTH),
          CENTER_Y - leftHeight,
          Math.ceil(COLUMN_WIDTH),
          leftHeight
        );
        ctx.fillStyle = COLOR_WAVE_R;
        ctx.fillRect(
          Math.floor(col * COLUMN_WIDTH),
          CENTER_Y,
          Math.ceil(COLUMN_WIDTH),
          rightHeight
        );
      }

      ctx.fillStyle = COLOR_TEXT;
      ctx.font = `${UNIT * 4}px monospace`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(
        frame.toString().padStart(FRAME_MAXLEN, '0'),
        NOW_X,
        CENTER_Y - WAVEFORM_HEIGHT_PIXELS - UNIT
      );
      ctx.textAlign = 'left';
      ctx.fillText(
        ' '.repeat(12) + formatTimeStamp(frame / FPS),
        NOW_X,
        CENTER_Y - WAVEFORM_HEIGHT_PIXELS - UNIT
      );

      if (project.audioTiming && project.audioTiming.bpm) {
      }

      // This await ensures that we dont kill ourselves over memory
      await new Promise<void>(done => {
        ffmpeg.stdin.write(canvas.toBuffer('raw'), () => {
          done();
        });
      });
      bar.update(frame);
    }
    ffmpeg.stdin.end();
    bar.success('Waveform Generated');
  },
});
