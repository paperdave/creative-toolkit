import { Emitter } from '@paperdave/events';
import { Logger } from '@paperdave/logger';
import { ClipRenderer, ClipRendererEvents, RenderClipOptions } from './render-clip';
import { rangeToString, resolveRange } from '../util/range';
import { spawnReadLines } from '../util/spawn';

export function renderBlenderClip({
  project,
  clip,
  ranges: _ranges,
}: RenderClipOptions): ClipRenderer {
  const ranges = resolveRange(_ranges);

  const emitter = new Emitter<ClipRendererEvents>();
  const log = new Logger('render:blender');

  let lastMem: string;
  let lastFrame: number;
  let frameProgress: number = 0;

  const promise = (async () => {
    const exitCode = await spawnReadLines({
      cmd: [
        project.paths.execBlender,
        '-b',
        clip.filename,
        '-f',
        rangeToString(resolveRange(ranges)),
      ],
      onStdout(line) {
        // Status:
        // Fra:2 Mem:42.85M (Peak 43.96M) | Time:00:00.49 | Rendering 12 / 256 samples
        if (line.startsWith('Fra:')) {
          // extract frame, memory, time, and samples start and max
          const [, frame, mem, time, message] =
            line.match(/Fra:(\d+) Mem:([^ ]+)[^|]*\| Time:([^)]+) \| (.*)/) || [];

          if (frame !== lastFrame) {
            frameProgress = 0;
          }

          const progressMatch = message.match(/Rendering (\d+) \/ (\d+) samples/);
          if (progressMatch) {
            const [, current, max] = progressMatch;
            frameProgress = parseInt(current, 10) / parseInt(max, 10);
          }

          if (frame) {
            lastMem = mem;
            emitter.emit('raw_progress', {
              frame: Number(frame),
              status: [`Mem: ${mem}`, `Time: ${time}`, message].filter(Boolean).join(' | '),
              frameProgress,
            });
          }
          return;
        }
        const skippedMatch = line.match(/skipping existing frame ".*\/(\d+)\..*"/);
        if (skippedMatch) {
          emitter.emit('raw_progress', {
            frame: Number(skippedMatch[1]),
            status: [lastMem ? `Mem: ${lastMem}` : undefined, `Skipping frame ${skippedMatch[1]}`]
              .filter(Boolean)
              .join(' | '),
            frameProgress: 1,
          });
          return;
        }
        const savedMatch = line.match(/Saved: '.*\/(\d+)\.(.*)'/);
        if (savedMatch) {
          emitter.emit('raw_progress', {
            frame: Number(savedMatch[1]),
            status: [
              lastMem ? `Mem: ${lastMem}` : undefined,
              `Saved frame ${savedMatch[1]} (${savedMatch[2]})`,
            ]
              .filter(Boolean)
              .join(' | '),
            frameProgress: 1,
          });
        }
      },
    });

    log(`Exited with code ${exitCode}`);

    if (exitCode !== 0) {
      throw new Error(`Blender exited with code ${exitCode}`);
    }
  })();

  (emitter as any).done = promise;
  return emitter as ClipRenderer;
}
