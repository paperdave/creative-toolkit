import path from "path";
import { TOOLKIT_FORMAT } from "$constants";
import { Logger, Spinner } from "@paperdave/logger";
import { asyncMap, writeJSON } from "@paperdave/utils";
import { pascalCase } from "change-case";
import { existsSync, mkdirSync } from "fs";
import { readdir, rename } from "fs/promises";
import { SequenceClip } from "./clip";
import {
  DEFAULT_PATHS,
  extensionToRenderProgram,
  Paths,
  RenderProgram,
  resolveExec,
} from "./paths";
import { AudioTiming, ProjectJSON } from "./project-json";
import { Composition } from "../fusion/structs/Composition";

export class Project {
  root: string;
  id: string;
  name: string;
  paths: Paths;
  audioTiming: AudioTiming;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;
  isArranged = false;

  constructor(root: string, json: ProjectJSON, pathOverrides: Partial<Paths>) {
    this.root = path.resolve(root);

    this.id = json.id;
    this.name = json.name;
    this.audioTiming = json.audioTiming;
    this.overridePaths = json.paths ?? {};

    this.paths = {} as Paths;

    const pathObjects = [DEFAULT_PATHS, json.paths, pathOverrides] //
      .filter(Boolean) as Paths[];

    for (const pathObject of pathObjects) {
      for (const key in pathObject) {
        if (pathObject[key as keyof Paths]) {
          this.paths[key as keyof Paths] = key.startsWith("exec")
            ? resolveExec(pathObject[key as keyof Paths], this.root)
            : path.resolve(
                this.root,
                pathObject[key as keyof Paths].replaceAll("{id}", this.id)
              );
        }
      }
    }

    this.hasAudio = existsSync(this.paths.audio);

    if (!existsSync(this.paths.temp)) {
      mkdirSync(this.paths.temp);
    }

    if (!existsSync(this.paths.step1)) {
      mkdirSync(this.paths.step1);
    }

    if (!existsSync(this.paths.step2)) {
      mkdirSync(this.paths.step2);
    }
  }

  get json(): ProjectJSON {
    return {
      id: this.id,
      name: this.name,
      paths:
        Object.keys(this.overridePaths).length > 0
          ? this.overridePaths
          : undefined,
      audioTiming: this.audioTiming,
      format: TOOLKIT_FORMAT,
    };
  }

  async writeJSON() {
    await writeJSON(this.paths.projectJSON, this.json, {
      spaces: 2,
      replacer: null,
    });
  }

  getRenderId(program: string, ...shot: string[]) {
    return [this.id, program, ...shot]
      .filter(Boolean)
      .map((x) => pascalCase(x!))
      .join("-");
  }

  getRenderFullPath(program: string, ...shot: string[]) {
    return path.resolve(this.paths.render, this.getRenderId(program, ...shot));
  }

  async getClips(step: "step1" | "step2"): Promise<SequenceClip[]> {
    const contents = await readdir(this.paths[step]);
    return contents.map((x) => {
      let [start, end, label, ext] =
        x.match(/^(\d+)-(\d+)_(.*)\.(.*)$/).slice(1) ?? [];

      if (!start) {
        ext = x.match(/\.(\w+)$/)?.[1];
        label = x.replace(`.${ext}`, "");
      }

      return {
        type: extensionToRenderProgram(ext),
        start: start ? Number(start) : null,
        end: end ? Number(end) : null,
        label,
        ext,
        filename: path.join(this.paths[step], x),
        step: step === "step1" ? 1 : 2,
        length: end ? Number(end) - Number(start) + 1 : null,
      };
    });
  }

  async runBlenderScript(blend: string, script: string, ...args: string[]) {
    const blender = Bun.spawn({
      cmd: [
        this.paths.execBlender,
        "--background",
        blend,
        "--python",
        path.join(import.meta.dir, "../", "blender-scripts", script),
        "--",
        ...args,
      ],
      cwd: this.paths.temp,
      stdio: ["inherit", "pipe", "pipe"],
    });
    await blender.exited;
    const text =
      (await new Response(blender.stdout as any).text()) +
      (await new Response(blender.stderr as any).text());
    const match = text.match(/CTK_DATA\n(.*)\n/);
    if (match) {
      return JSON.parse(match[1]);
    } else {
      throw new Error("Blender script failed: " + text);
    }
  }

  private async arrangeSingleClip(
    clip: SequenceClip
  ): Promise<[number, number]> {
    const renderOutput = this.getRenderFullPath(
      RenderProgram.CTSequencer,
      "Step" + clip.step
    );
    const renderInput =
      clip.step > 1
        ? this.getRenderFullPath(
            RenderProgram.CTSequencer,
            "Step" + (clip.step - 1)
          ) + ""
        : null;

    switch (clip.type) {
      case RenderProgram.Blender: {
        if (clip.step !== 1) {
          throw new Error("Blender clips can only be in step 1");
        }
        return await this.runBlenderScript(
          clip.filename,
          "arrange.py",
          renderOutput + "/"
        );
      }
      case RenderProgram.Fusion: {
        if (clip.step !== 2) {
          throw new Error("Fusion clips can only be in step 2");
        }
        return (await Composition.fromFile(clip.filename)).RenderRange;
      }
      default:
        throw new Error("Unknown render program " + clip.type);
    }
  }

  async arrange() {
    const spinner = new Spinner("Arranging clips...");

    const clips = [
      ...(await this.getClips("step1")),
      ...(await this.getClips("step2")),
    ];

    let maxPadding = 0;

    await asyncMap(clips, async (clip) => {
      const [start, end] = await this.arrangeSingleClip(clip);
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
          `${path.relative(this.root, clip.filename)} --> ${path.relative(
            this.root,
            desiredFileName
          )}`
        );
        await rename(clip.filename, desiredFileName);
        clip.filename = desiredFileName;
      } else {
        Logger.info(`${path.relative(this.root, clip.filename)} all good`);
      }
    }

    this.isArranged = true;
    spinner.success("Arranged clips");
  }
}
