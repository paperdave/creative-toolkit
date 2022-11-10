/* eslint-disable no-constant-condition */
import { Logger } from '@paperdave/logger';
import { SequenceClip } from './clip';
import { Project } from './project';
import { RangeResolvable, rangeToString, resolveRange } from '../util/range';

export async function renderBlenderClip(
  project: Project,
  clip: SequenceClip,
  ranges: RangeResolvable
) {
  const log = new Logger('render:blender');

  const proc = Bun.spawn({
    cmd: [
      project.paths.execBlender,
      '-b',
      clip.filename,
      '-f',
      rangeToString(resolveRange(ranges)),
    ],
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  });

  function handleLine(line: string) {
    // Status:
    // Fra:2 Mem:42.85M (Peak 43.96M) | Time:00:00.49 | Rendering 256 / 256 samples
    //
    // If skipped:
    // skipping existing frame "/render/What-Sequencer-Step1/0002.exr"
    //
    // If done:
    // Saved: '/render/What-Sequencer-Step1/0002.exr'
    // Saved: '/render/What-Sequencer-Step1/0002.jpg'
    //  Time: 00:00.79 (Saving: 00:00.35)
    // TODO: wait for bun #1320 to get fixed.
  }

  const reader = (proc.stdout as ReadableStream).getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    log(`stdout: ${new TextDecoder().decode(value)}`);
  }
  const exitCode = await proc.exited;

  log('exit code: %s', exitCode);
}
