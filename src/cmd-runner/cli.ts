#!/usr/bin/env bun
import * as YAML from "yaml";
import path from "path";
import { TOOLKIT_DATE } from "$constants";
import { hint } from "$logger";
import { Project, resolveProject } from "$project";
import { chalk, injectLogger, Logger } from "@paperdave/logger";
import { pathExists } from "@paperdave/utils";
import { readdirSync, readFileSync } from "fs";
import { CommandEvent } from "./types";

const commandName = process.argv[2];

if (!commandName) {
  Logger.writeLine(
    chalk.greenBright(`dave caruso's creative toolkit, ${TOOLKIT_DATE}`)
  );
  Logger.writeLine(chalk.grey("usage: ct <cmd> [...]"));
  Logger.writeLine("");

  const cmds = readdirSync(path.join(import.meta.dir, ".."))
    .filter((x) => x.startsWith("cmd-") && x !== "cmd-runner")
    .map((name) => {
      try {
        const parsed = YAML.parse(
          readFileSync(
            path.join(import.meta.dir, "..", name, "meta.yaml")
          ).toString()
        );
        return {
          sort: 0,
          ...parsed,
          name: name.slice(4),
        };
      } catch (error) {
        Logger.warn(`could not find src/${name}/meta.yaml`);
        return {
          sort: 0,
          name: name.slice(4),
          desc: "",
        };
      }
    })
    .sort((a, b) => b.sort - a.sort);

  const padding = Math.max(...cmds.map((x) => x.name.length)) + 2;

  for (const cmd of cmds) {
    const space = " ".repeat(padding - cmd.name.length);
    Logger.writeLine(`- ${chalk.green("ct " + cmd.name)}:${space}${cmd.desc}`);
  }
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
  Logger.error("cannot run the command runner as a command.");
  process.exit(1);
}

injectLogger();

const command = await import(`../cmd-${commandName}/index.ts`);
const meta = YAML.parse(
  readFileSync(
    path.join(import.meta.dir, `../cmd-${commandName}/meta.yaml`)
  ).toString()
);

let project!: Project;
if (command.project === undefined || command.project === true) {
  project = await resolveProject();
}

const event: CommandEvent = {
  project,
};

await command.run(event);
