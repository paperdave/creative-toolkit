import path from 'path';
import { Emitter } from '@paperdave/events';
import { Logger, Progress } from '@paperdave/logger';
import { ClipRenderer, ClipRendererEvents, RenderClipOptions } from './render-clip';
import { execReadCTData } from '../util/exec';
import { countRangeFrames, rangeToString, resolveRange } from '../util/range';

export function renderFusionClip({
  project,
  clip,
  ranges: _ranges,
  bar = false,
}: RenderClipOptions): ClipRenderer {
  const ranges = resolveRange(_ranges);

  const emitter = new Emitter<ClipRendererEvents>();
  const log = new Logger('render:fusion');

  const promise = (async () => {
    log('Rendering Fusion Clip: %s (%s frames)', clip.label, countRangeFrames(ranges));

    await project.getFusionServer();
    await execReadCTData({
      cmd: [
        project.paths.execFuScript,
        path.join(import.meta.dir, '../fusion-scripts/fusion-render.lua'),
      ],
      env: {
        ...process.env,
        ct_filename: clip.filename,
        ct_ranges: rangeToString(ranges),
      },
      onData(data) {
        log(data);
      },
    });
  })();

  (emitter as any).done = promise;

  if (bar) {
    const progress = new Progress({
      text: `Rendering step${clip.step}:${clip.label}`,
    });
    emitter.on('progress', frame => {
      frame;
    });
    promise.then(() => progress.success()).catch(x => progress.error(x));
  }

  return emitter as ClipRenderer;
}
