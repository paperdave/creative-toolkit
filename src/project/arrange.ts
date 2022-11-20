/* eslint-disable require-atomic-updates */
/* eslint-disable @typescript-eslint/no-loop-func */
import path from 'path';
import {
  BoolNum,
  Clip,
  ClipAspectMode,
  ClipDepth,
  Composition,
  FormatID,
  FuId,
  Input,
  LoaderTool,
  LuaTable,
  SaverTool,
  Tool,
} from '$/fusion-format';
import { appPath } from '$/global/exec-paths';
import { IRange, rangeToSingle } from '$/util';
import { arrayGroupByA } from '$/util/array';
import { Logger, Spinner } from '@paperdave/logger';
import { asyncMap } from '@paperdave/utils';
import { rename } from 'fs/promises';
import { SequenceClip, UnarrangedSequenceClip } from './clip';
import { RenderProgram } from './paths';
import { Project } from './project';
import { getClipRenderInput, getClipRenderOutput } from './render';
import { spawnReadCTData } from '../util/spawn';

const log = new Logger('arrange');

function setFuidInput(tool: Tool, name: string, value: string) {
  let input = tool.Inputs.get(name);
  if (!input) {
    input = new Input(`{ Value = FuID { "" } }`);
    tool.Inputs.set(name, input);
  }
  input.valueAs(FuId).value = value;
}

async function arrangeSingleClip(
  project: Project,
  clip: UnarrangedSequenceClip,
  inputRange: IRange
) {
  const renderOutput = getClipRenderOutput(project, clip);
  const renderInput = getClipRenderInput(project, clip);

  switch (clip.type) {
    case RenderProgram.Blender: {
      let data;
      await spawnReadCTData({
        cmd: [
          appPath.blender,
          '--background',
          clip.filename,
          '--python',
          path.join(import.meta.dir, '../blender-scripts/arrange.py'),
          '--',
          renderOutput + '/#',
        ],
        onData: x => (data = x),
        cwd: project.paths.temp,
      });
      if (!data) {
        throw new Error('No data received from Blender');
      }
      return data;
    }
    case RenderProgram.Fusion: {
      const comp = await Composition.fromFile(clip.filename);

      const MainInput = comp.Tools.get('MainInput', LoaderTool);
      if (renderInput) {
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

          inputClip.Filename = `${renderInput}/0.exr`;
          inputClip.FormatID = FormatID.OpenEXR;
          inputClip.StartFrame = inputRange.start;
          inputClip.LengthSetManually = true;
          inputClip.TrimIn = inputRange.start;
          inputClip.TrimOut = inputRange.end;
          inputClip.Length = inputRange.end - inputRange.start + 1;
          inputClip.ExtendFirst = 0;
          inputClip.ExtendLast = 0;
          inputClip.Loop = BoolNum.True;
          inputClip.AspectMode = ClipAspectMode.FromFile;
          inputClip.Depth = ClipDepth.Format;
          inputClip.TimeCode = 0;
          inputClip.GlobalStart = inputRange.start;
          inputClip.GlobalEnd = inputRange.end;

          setFuidInput(MainInput, 'Clip1.OpenEXRFormat.RedName', 'ViewLayer.Combined.R');
          setFuidInput(MainInput, 'Clip1.OpenEXRFormat.GreenName', 'ViewLayer.Combined.G');
          setFuidInput(MainInput, 'Clip1.OpenEXRFormat.BlueName', 'ViewLayer.Combined.B');
          setFuidInput(MainInput, 'Clip1.OpenEXRFormat.AlphaName', 'ViewLayer.Combined.A');
        }
      } else if (MainInput) {
        Logger.warn(`step${clip.step}:${clip.label} requests input when none is available.`);
      }

      const MainOutput = comp.Tools.get('MainOutput', SaverTool);
      if (!MainInput) {
        Logger.warn(`No MainOutput tool found in Fusion step${clip.step}:${clip.label}.`);
      } else if (MainOutput.Type !== 'Saver') {
        Logger.warn(`MainOutput tool in Fusion step${clip.step}:${clip.label} is not a Saver.`);
      } else {
        MainOutput.Clip.Filename = `${renderOutput}/0.png`;
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
  const clips = await project.getRawClips();

  const spinner = new Spinner({
    text: ({ n }) => `Arranging clips... ${n}/${clips.length}`,
    props: { n: 0 },
  });

  let maxPadding = 0;

  const steps = arrayGroupByA(clips, x => x.step);

  let lastStepInput: IRange[] = [];
  for (const stepClips of steps) {
    lastStepInput = await asyncMap(stepClips, async clip => {
      const [start, end] = await arrangeSingleClip(project, clip, rangeToSingle(lastStepInput));
      clip.start = start;
      clip.end = end;
      clip.length = end - start + 1;
      maxPadding = Math.max(maxPadding, Math.log10(clip.start!) + 1, Math.log10(clip.end!) + 1);
      spinner.update({ n: spinner.props.n + 1 });
      return { start, end };
    });
  }

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
      log(
        `moved ${path.relative(project.root, clip.filename)} --> ${path.relative(
          project.root,
          desiredFileName
        )}`
      );
      await rename(clip.filename, desiredFileName);
      clip.filename = desiredFileName;
    } else {
      log(`arranged ${path.relative(project.root, clip.filename)}`);
    }
  }

  project.arranged = true;
  spinner.success('Arranged clips');

  return clips as SequenceClip[];
}
