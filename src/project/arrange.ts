import path from "path";
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
} from "@paperdave/fusion";
import { Logger, Spinner } from "@paperdave/logger";
import { asyncMap } from "@paperdave/utils";
import { rename } from "fs/promises";
import { SequenceClip } from "./clip";
import { RenderProgram } from "./paths";
import { Project } from "./project";

async function arrangeSingleClip(project: Project, clip: SequenceClip) {
  const renderOutput = project.getRenderFullPath(
    RenderProgram.CTSequencer,
    "Step" + clip.step
  );
  const renderInput =
    clip.step > 1
      ? project.getRenderFullPath(
          RenderProgram.CTSequencer,
          "Step" + (clip.step - 1)
        ) + ""
      : null;

  switch (clip.type) {
    case RenderProgram.Blender: {
      if (clip.step !== 1) {
        throw new Error("Blender clips can only be in step 1");
      }
      return await project.runBlenderScript(
        clip.filename,
        "arrange.py",
        renderOutput + "/"
      );
    }
    case RenderProgram.Fusion: {
      if (clip.step !== 2) {
        throw new Error("Fusion clips can only be in step 2");
      }
      const comp = await Composition.fromFile(clip.filename);

      const MainInput = comp.Tools.get("MainInput", LoaderTool);
      if (!MainInput) {
        Logger.warn(
          `No MainInput tool found in Fusion step${clip.step}:${clip.label}`
        );
      } else if (MainInput.Type !== "Loader") {
        Logger.warn(
          `MainOutput tool in Fusion step${clip.step}:${clip.label} is not a Saver.`
        );
      } else {
        let clip: Clip;

        if (MainInput.Clips.length === 1) {
          clip = MainInput.Clips.get(0);
        } else {
          clip = new Clip();
          clip.ID = "Clip1";
          MainInput.set("Clips", new LuaTable());
          MainInput.Clips.push(clip);
        }

        clip.Filename = `${renderInput}/0001.exr`;
        clip.FormatID = FormatID.OpenEXR;
        clip.StartFrame = 1;
        clip.LengthSetManually = true;
        clip.TrimIn = 0;
        clip.TrimOut = 50;
        clip.Length = 20;
        clip.ExtendFirst = 0;
        clip.ExtendLast = 0;
        clip.Loop = BoolNum.True;
        clip.AspectMode = ClipAspectMode.FromFile;
        clip.Depth = ClipDepth.Format;
        clip.TimeCode = 0;
        clip.GlobalStart = 0;
        clip.GlobalEnd = 50;
      }

      const MainOutput = comp.Tools.get("MainOutput", SaverTool);
      if (!MainInput) {
        Logger.warn(
          `No MainOutput tool found in Fusion step${clip.step}:${clip.label}.`
        );
      } else if (MainOutput.Type !== "Saver") {
        Logger.warn(
          `MainOutput tool in Fusion step${clip.step}:${clip.label} is not a Saver.`
        );
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

      await comp.writeAndMoveFile();

      return comp.RenderRange;
    }
    default:
      throw new Error("Unknown render program " + clip.type);
  }
}

export async function arrangeProject(project: Project) {
  if (project.isArranged) {
    return;
  }

  const spinner = new Spinner("Arranging clips...");

  const clips = [
    ...(await project.getClips("step1")),
    ...(await project.getClips("step2")),
  ];

  let maxPadding = 0;

  await asyncMap(clips, async (clip) => {
    const [start, end] = await arrangeSingleClip(project, clip);
    clip.start = start;
    clip.end = end;
    clip.length = end - start + 1;
    maxPadding = Math.max(
      maxPadding,
      Math.log10(clip.start) + 1,
      Math.log10(clip.end) + 1
    );
  });

  for (const clip of clips) {
    const desiredFileName = path.join(
      path.dirname(clip.filename),
      [clip.start, clip.end]
        .map((x) => x.toString().padStart(maxPadding, "0"))
        .join("-") +
        "_" +
        clip.label +
        "." +
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
  spinner.success("Arranged clips");
}
