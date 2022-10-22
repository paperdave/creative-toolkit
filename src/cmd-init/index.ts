import path from "path";
import { RunCommand } from "$cmd-runner";
import { TOOLKIT_DATE } from "$constants";
import { Project } from "$project";
import { Composition, SaverTool } from "@paperdave/fusion";
import { Logger } from "@paperdave/logger";
import { pathExists } from "@paperdave/utils";
import { paramCase } from "change-case";
import { mkdir, writeFile } from "fs/promises";

export const project = false;

export const run: RunCommand = async ({}) => {
  if (await pathExists("project.json")) {
    Logger.error(`project already exists here!`);
    return;
  }

  const root = process.cwd();

  Logger.info("Initializing project at: " + root);
  Logger.info();

  const name = prompt("name", path.basename(process.cwd()));
  if (!name) return;

  const autoGenId = paramCase(name);
  const id = prompt("id", autoGenId);

  Logger.info();

  const project = new Project(
    root,
    {
      id,
      name,
      audioTiming: {
        bpm: 120,
      },
      format: TOOLKIT_DATE,
    },
    {}
  );
  await project.writeJSON();

  await mkdir("./sequence");

  const thumbnailComp = Composition.create();
  const saver = new SaverTool(/* lua */ `Saver {
    NameSet = true,
    Inputs = {
      ProcessWhenBlendIs00 = Input { Value = 0, },
      Clip = Input {
        Value = Clip {
          Filename = "/../UNSET",
          FormatID = "PNGFormat",
          Length = 0,
          Saving = true,
          TrimIn = 0,
          ExtendFirst = 0,
          ExtendLast = 0,
          Loop = 1,
          AspectMode = 0,
          Depth = 0,
          TimeCode = 0,
          GlobalStart = -2000000000,
          GlobalEnd = 0
        },
      },
      OutputFormat = Input { Value = FuID { "PNGFormat" }, },
    },
    ViewInfo = OperatorInfo { Pos = { 829, 249 } },
  }`);
  thumbnailComp.Tools.set("MainOutput", saver);

  const firstComp = thumbnailComp.clone();

  thumbnailComp.RenderRange = [0, 0];
  thumbnailComp.GlobalRange = [0, 0];
  thumbnailComp.writeAndMoveFile("./thumbnail.comp");

  firstComp.writeAndMoveFile("./sequence/first.comp");

  if (!(await pathExists(path.join(root, ".bitwig-project")))) {
    await writeFile(path.join(root, ".bitwig-project"), "");
  }
};
