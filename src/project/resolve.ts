import path from "path";
import { TOOLKIT_DATE, TOOLKIT_VERSION } from "$constants";
import { CLIError } from "@paperdave/logger";
import { pathExists, readJSON } from "@paperdave/utils";
import { Paths } from "./paths";
import { Project } from "./project";
import { ProjectJSON } from "./project-json";
import { walkUpDirectoryTree } from "../util/fs";

export async function resolveProject(
  startPath = process.cwd(),
  paths: Partial<Paths> = {}
): Promise<Project> {
  const root = await walkUpDirectoryTree(
    startPath, //
    (dir) => pathExists(path.join(dir, "project.json"))
  );

  if (!root) {
    const e = new CLIError(
      "Could not find a creative toolkit project",
      "Run `ct init` to create a new project."
    );
    (e as any).code = "ENOENT";
    throw e;
  }

  const json = (await readJSON(
    path.join(root, "project.json"),
    {}
  )) as ProjectJSON;

  if (json.format !== TOOLKIT_VERSION) {
    const current = json.format === 1 ? "2022-10-06" : json.format;
    throw new CLIError(
      "Incorrect Creative Toolkit Version",
      `This project was saved with toolkit ${current}. You are currently running toolkit ${TOOLKIT_DATE}.`
    );
  }
  return new Project(root, json, paths);
}
