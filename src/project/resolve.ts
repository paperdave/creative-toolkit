import path from "path";
import { TOOLKIT_FORMAT } from "$constants";
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

  if (json.format !== TOOLKIT_FORMAT) {
    throw new CLIError(
      "Incorrect Creative Toolkit Version",
      `This project was saved with format #${json.format}, expected #${TOOLKIT_FORMAT}.`
    );
  }
  return new Project(root, json, paths);
}
