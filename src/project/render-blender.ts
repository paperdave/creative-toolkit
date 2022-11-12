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

          if (frame) {
            lastMem = mem;
            emitter.emit('raw_progress', {
              frame: Number(frame),
              status: [`Mem: ${mem}`, `Time: ${time}`, message].filter(Boolean).join(' | '),
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
