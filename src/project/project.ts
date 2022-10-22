import path from "path";
import { TOOLKIT_DATE } from "$constants";
import { writeJSON } from "@paperdave/utils";
import { pascalCase } from "change-case";
import { existsSync, mkdirSync } from "fs";
import { DEFAULT_PATHS, Paths, resolveExec } from "./paths";
import { AudioTiming, ProjectJSON } from "./project-json";

export class Project {
  root: string;
  id: string;
  name: string;
  paths: Paths;
  audioTiming: AudioTiming;
  overridePaths: Partial<Paths> = {};
  hasAudio: boolean;

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
      format: TOOLKIT_DATE,
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
}
