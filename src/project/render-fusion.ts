import { Emitter } from '@paperdave/events';
import { Logger } from '@paperdave/logger';
import { ClipRenderer, ClipRendererEvents, RenderClipOptions } from './render-clip';
import { countRangeFrames, rangeToString, resolveRange } from '../util/range';

export function renderFusionClip({
  project,
  clip,
  ranges: _ranges,
}: RenderClipOptions): ClipRenderer {
  const ranges = resolveRange(_ranges);

  const emitter = new Emitter<ClipRendererEvents>();
  const log = new Logger('render:fusion');

  const promise = (async () => {
    log('Rendering Fusion Clip: %s (%s frames)', clip.label, countRangeFrames(ranges));

    let frame = resolveRange(ranges)[0].start;
    emitter.emit('raw_progress', {
      frame,
      status: 'Loading Render Node...',
    });
    const renderNode = await project.getFusionRenderNode();
    emitter.emit('raw_progress', {
      frame,
      status: 'Loading Composition...',
    });
    await renderNode.spawnScript({
      script: 'render.lua',
      env: {
        ct_filename: clip.filename,
        ct_ranges: rangeToString(ranges),
      },
      onData(data) {
        if (data.frame >= 0) {
          frame = data.frame;
        }
        emitter.emit('raw_progress', {
          ...data,
          frame,
          status: [
            data.lastFrameTime && `Last: ${data.lastFrameTime.toFixed(2)}s`,
            data.averageFrameTime && `Avg: ${data.averageFrameTime.toFixed(2)}s`,
          ]
            .filter(Boolean)
            .join(' | '),
        });
      },
    });
  })().catch(e => e);

  (emitter as any).done = promise;

  return emitter as ClipRenderer;
}
