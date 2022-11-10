import path from 'path';
import {
  BoolNum,
  Clip,
  ClipAspectMode,
  ClipDepth,
  Composition,
  FormatID,
  LoaderTool,
  LuaTable,
  SaverTool,
} from '@paperdave/fusion';
import { Logger, Spinner } from '@paperdave/logger';
import { asyncMap } from '@paperdave/utils';
import { rename } from 'fs/promises';
import type { SequenceClip } from './clip';
import { RenderProgram } from './paths';
import type { Project } from './project';
import { getClipRenderInput, getClipRenderOutput } from './render';

async function arrangeSingleClip(project: Project, clip: SequenceClip) {
  const renderOutput = getClipRenderOutput(project, clip);
  const renderInput = getClipRenderInput(project, clip);

  switch (clip.type) {
    case RenderProgram.Blender: {
      if (clip.step !== 1) {
        throw new Error('Blender clips can only be in step 1');
      }
      return project.runBlenderScript(clip.filename, 'arrange.py', renderOutput + '/');
    }
    case RenderProgram.Fusion: {
      if (clip.step !== 2) {
        throw new Error('Fusion clips can only be in step 2');
      }
      const comp = await Composition.fromFile(clip.filename);

      const MainInput = comp.Tools.get('MainInput', LoaderTool);
      if (!MainInput) {
        Logger.warn(`No MainInput tool found in Fusion step${clip.step}:${clip.label}`);
      } else if (MainInput.Type !== 'Loader') {
        Logger.warn(`MainOutput tool in Fusion step${clip.step}:${clip.label} is not a Saver.`);
      } else {
        let inputClip: Clip;

        if (MainInput.Clips.length === 1) {
          inputClip = MainInput.Clips.get(0);
        } else {
          inputClip = new Clip();
          inputClip.ID = 'Clip1';
          MainInput.set('Clips', new LuaTable());
          MainInput.Clips.push(inputClip);
        }

        inputClip.Filename = `${renderInput}/0001.exr`;
        inputClip.FormatID = FormatID.OpenEXR;
        inputClip.StartFrame = 1;
        inputClip.LengthSetManually = true;
        inputClip.TrimIn = 0;
        inputClip.TrimOut = 50;
        inputClip.Length = 20;
        inputClip.ExtendFirst = 0;
        inputClip.ExtendLast = 0;
        inputClip.Loop = BoolNum.True;
        inputClip.AspectMode = ClipAspectMode.FromFile;
        inputClip.Depth = ClipDepth.Format;
        inputClip.TimeCode = 0;
        inputClip.GlobalStart = 0;
        inputClip.GlobalEnd = 50;
      }

      const MainOutput = comp.Tools.get('MainOutput', SaverTool);
      if (!MainInput) {
        Logger.warn(`No MainOutput tool found in Fusion step${clip.step}:${clip.label}.`);
      } else if (MainOutput.Type !== 'Saver') {
        Logger.warn(`MainOutput tool in Fusion step${clip.step}:${clip.label} is not a Saver.`);
      } else {
        MainOutput.Clip.Filename = `${renderOutput}/.png`;
        MainOutput.Clip.FormatID = FormatID.PNG;
        MainOutput.CreateDir = BoolNum.True;
        MainOutput.OutputFormat = FormatID.PNG;
      }

      if (project.hasAudio) {
        comp.AudioFilename = project.paths.audio;
        comp.AudioOffset = 0;
      }

      comp.writeAndMoveFile();

      return comp.RenderRange;
    }
    default:
      throw new Error('Unknown render program ' + clip.type);
  }
}

export async function arrangeProject(project: Project): Promise<SequenceClip[]> {
  if (project.isArranged) {
    return project.getClips();
  }

  const clips = await project.getClips();

  const spinner = new Spinner({
    text: ({ n }) => `Arranging clips... ${n}/${clips.length}`,
    props: { n: 0 },
  });

  let maxPadding = 0;

  /* eslint-disable require-atomic-updates */
  await asyncMap(clips, async clip => {
    const [start, end] = await arrangeSingleClip(project, clip);
    clip.start = start;
    clip.end = end;
    clip.length = end - start + 1;
    maxPadding = Math.max(maxPadding, Math.log10(clip.start!) + 1, Math.log10(clip.end!) + 1);
    spinner.update({ n: spinner.props.n + 1 });
  });

  for (const clip of clips) {
    const desiredFileName = path.join(
      path.dirname(clip.filename),
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      [clip.start, clip.end].map(x => String(x).padStart(maxPadding, '0')).join('-') +
        '_' +
        clip.label +
        '.' +
        clip.ext
    );

    if (clip.filename !== desiredFileName) {
      Logger.info(
        `${path.relative(project.root, clip.filename)} --> ${path.relative(
          project.root,
          desiredFileName
        )}`
      );
      await rename(clip.filename, desiredFileName);
      clip.filename = desiredFileName;
    } else {
      Logger.info(`${path.relative(project.root, clip.filename)} all good`);
    }
  }

  project.isArranged = true;
  spinner.success('Arranged clips');

  return clips;
}
