import {
  countRangeFrames,
  intersectRanges,
  IRange,
  iterateRange,
  mergeRanges,
  rangeContains,
} from '$util';
import { Logger } from '@paperdave/logger';
import { readdir } from 'fs/promises';
import { SequenceClip, UnarrangedSequenceClip } from './clip';
import { RenderProgram } from './paths';
import { Project } from './project';
import { renderClip } from './render-clip';

interface QueueEntry {
  clip: SequenceClip;
  ranges: IRange[];
}

export function getClipRenderOutput(project: Project, clip: UnarrangedSequenceClip) {
  return project.getRenderFullPath(RenderProgram.CTSequencer, 'Step' + clip.step);
}

export function getClipRenderInput(project: Project, clip: UnarrangedSequenceClip) {
  if (clip.step === 0) {
    return null;
  }
  return project.getRenderFullPath(RenderProgram.CTSequencer, 'Step' + (clip.step - 1));
}

export async function renderProject(project: Project, range?: IRange) {
  const log = new Logger('render');

  const clips = (await project.arrange()) as SequenceClip[];

  // check that step 1 is exactly the same
  const step1 = clips.filter(clip => clip.step === 1);
  const step1Range = {
    start: Math.min(...step1.map(clip => clip.start)),
    end: Math.max(...step1.map(clip => clip.end)),
  };
  const step2 = clips.filter(clip => clip.step === 2);
  const step2Range = {
    start: Math.min(...step2.map(clip => clip.start)),
    end: Math.max(...step2.map(clip => clip.end)),
  };
  if (step1Range.start !== step2Range.start || step1Range.end !== step2Range.end) {
    Logger.warn("Step 1's render range doesn't match step 2");
    Logger.warn(`Step 1: ${step1Range.start} - ${step1Range.end}`);
    Logger.warn(`Step 2: ${step2Range.start} - ${step2Range.end}`);
  }

  if (!range) {
    range = step2Range;
  }

  // Step 1
  const renderQueue: QueueEntry[] = [];

  const step1Files: string[] = await readdir(
    project.getRenderFullPath(RenderProgram.CTSequencer, 'Step1')
  ).catch(() => []);

  const missingFrames = [];
  for (const frame of iterateRange(range)) {
    if (!step1Files.includes(`${frame}.exr`)) {
      missingFrames.push(frame);
    }
  }
  if (missingFrames.length > 0) {
    const ranges = mergeRanges(missingFrames);
    for (const clip of step1) {
      const intersection = mergeRanges(
        ranges.map(r => intersectRanges(r, clip)).filter(Boolean) as IRange[]
      );

      if (intersection.length > 0) {
        log('STEP 1: %s render %j', clip.label + '.' + clip.ext, intersection);
        renderQueue.push({ clip, ranges: intersection });
      } else {
        Logger.info("STEP 1: %s is't needed for this render", clip.label + '.' + clip.ext);
      }
    }
  } else {
    Logger.info('STEP 1: All frames already rendered');
  }

  // Step 2
  const framesForStep2 = mergeRanges(step1);

  const step2Files: string[] = await readdir(
    project.getRenderFullPath(RenderProgram.CTSequencer, 'Step2')
  ).catch(() => []);

  const missingFrames2 = [];
  for (const frame of iterateRange(framesForStep2)) {
    if (!step2Files.includes(`${frame}.png`)) {
      missingFrames2.push(frame);
    }
  }

  if (missingFrames2.length > 0) {
    const ranges = mergeRanges(missingFrames2);
    for (const clip of step2) {
      const intersection = mergeRanges(
        ranges.map(r => intersectRanges(r, clip)).filter(Boolean) as IRange[]
      );

      if (intersection.length > 0) {
        log('STEP 2: %s render %j', clip.label + '.' + clip.ext, intersection);

        if (!rangeContains(clip, step1)) {
          Logger.warn('STEP 2: %s is not fully covered by step 1', clip.label + '.' + clip.ext);
        }

        renderQueue.push({ clip, ranges: intersection });
      } else {
        Logger.info("STEP 2: %s is't needed for this render", clip.label + '.' + clip.ext);
      }
    }
  } else {
    Logger.info('STEP 2: All frames already rendered');
  }

  for (const entry of renderQueue) {
    log(
      'Rendering %s (%s frames)',
      entry.clip.label + '.' + entry.clip.ext,
      countRangeFrames(entry.ranges)
    );

    const render = renderClip({
      project,
      clip: entry.clip,
      ranges: entry.ranges,
    });

    await render.done;
  }

  project.close();
}
