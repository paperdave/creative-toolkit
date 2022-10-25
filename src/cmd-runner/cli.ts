#!/usr/bin/env bun

import path from "path";
import { hint } from "$logger";
import { Project, resolveProject } from "$project";
import { injectLogger, Logger } from "@paperdave/logger";
import { pathExists } from "@paperdave/utils";
import { CommandEvent } from "./types";

const commandName = process.argv[2];

if (!commandName) {
  Logger.error("usage: ct <cmd> [...]");
  process.exit(1);
}

if (commandName.match(/[^a-z0-9_-]/)) {
  Logger.error("invalid command: " + commandName);
  hint("commands are located at ./src/cmd-{name}/index.ts");
  process.exit(1);
}

if (
  !(await pathExists(
    path.join(import.meta.dir, `../cmd-${commandName}/index.ts`)
  ))
) {
  Logger.error("unknown command: " + commandName);
  hint("commands are located at ./src/cmd-{name}/index.ts");
  process.exit(1);
}

if (commandName === "runner") {
  Logger.error("cannot run the command runner a command.");
  process.exit(1);
}

injectLogger();
try {
  const command = await import(`../cmd-${commandName}/index.ts`);

  let project!: Project;
  if (command.project === undefined || command.project === true) {
    project = await resolveProject();
  }

  const event: CommandEvent = {
    project,
  };

  await command.run(event);
} catch (error) {
  console.log(error);
  Logger.error(error);
  process.exit(2);
}
