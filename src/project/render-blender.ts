import { Emitter } from '@paperdave/events';
import { Logger, Progress } from '@paperdave/logger';
import { ClipRenderer, ClipRendererEvents, RenderClipOptions } from './render-clip';
import { countRangeFrames, rangeToString, resolveRange } from '../util/range';

export function renderBlenderClip({
  project,
  clip,
  ranges: _ranges,
  bar = false,
}: RenderClipOptions): ClipRenderer {
  const ranges = resolveRange(_ranges);

  const emitter = new Emitter<ClipRendererEvents>();
  const log = new Logger('render:blender');

  const total = countRangeFrames(ranges);

  function handleLine(line: string) {
    // TODO: wait for bun #1320 to get fixed.
    log(`stdout: ${line}`);
    // Status:
    // Fra:2 Mem:42.85M (Peak 43.96M) | Time:00:00.49 | Rendering 256 / 256 samples
    if (line.startsWith('Fra:')) {
      const frame = parseInt(line.split(' ')[0].split(':')[1], 10);
      const progress = frame / total;
      log(`Rendering frame ${frame} (${Math.round(progress * 100)}%)`);
    }
    //
    // If skipped:
    // skipping existing frame "/render/What-Sequencer-Step1/0002.exr"
    //
    // If done:
    // Saved: '/render/What-Sequencer-Step1/0002.exr'
    // Saved: '/render/What-Sequencer-Step1/0002.jpg'
    //  Time: 00:00.79 (Saving: 00:00.35)
  }

  const promise = (async () => {
    const proc = Bun.spawn({
      cmd: [
        project.paths.execBlender,
        '-b',
        clip.filename,
        '-f',
        rangeToString(resolveRange(ranges)),
      ],
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });

    // TODO: wait for bun #1320 to get fixed.
    // const reader = (proc.stdout as ReadableStream).getReader();
    // const td = new TextDecoder();
    //
    // let { value, done } = await reader.readMany();
    // let buffer = '';
    // while (!done) {
    //   for (const chunk of value) {
    //     buffer += td.decode(chunk);
    //     const lines = buffer.split(/\n|\r/g);
    //     buffer = lines.pop() ?? '';
    //     lines.forEach(x => handleLine(x.trim()));
    //   }
    //   ({ value, done } = await reader.readMany());
    // }

    const exitCode = await proc.exited;

    log(`Exited with code ${exitCode}`);

    if (exitCode !== 0) {
      throw new Error(`Blender exited with code ${exitCode}`);
    }
  })();

  (emitter as any).done = promise;

  if (bar) {
    const progress = new Progress({
      text: `Rendering step${clip.step}:${clip.label}`,
      total,
    });
    emitter.on('progress', frame => {
      frame;
    });
    promise.then(() => progress.success()).catch(x => progress.error(x));
  }

  return emitter as ClipRenderer;
}
