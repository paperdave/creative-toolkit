#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import * as path from "path";
import chalk from "chalk";
import { Logger } from "@paperdave/logger";
import { readJSONSync, walk, writeJSONSync } from "@paperdave/utils";
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
} from "fs";

interface Link {
  file: string;
  directory: boolean;
}

type Manifest = Record<string, ManifestEntry>;
interface ManifestEntry {
  backup?: string;
}

const DIR_LINK_NAME = ".linker";

const SRC = path.join(import.meta.dir, "../home");
const DEST = path.resolve(process.env.HOME);

let manifest: Manifest = {};

if (existsSync(path.join(DEST, ".linker.json"))) {
  manifest = readJSONSync(path.join(DEST, ".linker.json"), {}) as Manifest;
}

const existingLinks = new Set<string>();
const fileLinks: Link[] = [];
const directoryLinks: Link[] = [];

for await (const file of walk(SRC, { directories: false })) {
  const rel = file.slice(SRC.length + 1);
  if (rel.endsWith("/" + DIR_LINK_NAME)) {
    const dir = rel.slice(0, -DIR_LINK_NAME.length - 1);
    directoryLinks.push({
      file: dir,
      directory: true,
    });
    existingLinks.add(dir);
  } else if (!rel.endsWith(".gitignore")) {
    fileLinks.push({
      file: rel,
      directory: false,
    });
    existingLinks.add(rel);
  }

  if (rel.startsWith("bin")) {
    chmodSync(file, 0o755);
  }
}

const links = [
  // remove file links already specified in directory links
  ...fileLinks.filter(
    (file) => !directoryLinks.some((dir) => file.file.startsWith(dir.file))
  ),
  ...directoryLinks,
];

interface LinkWithAction extends Link {
  action: "none" | "create" | "overwrite" | "backup" | "delete" | "restore";
}

const actions: LinkWithAction[] = links.map((entry) => {
  const srcPath = path.join(SRC, entry.file);
  const destPath = path.join(DEST, "." + entry.file);

  let action: LinkWithAction["action"] = "none";
  if (!existsSync(destPath)) {
    action = "create";
  } else {
    const destStat = lstatSync(destPath);
    if (
      destStat.isSymbolicLink()
        ? readlinkSync(destPath) === srcPath
        : destStat.ino === lstatSync(srcPath).ino
    ) {
      action = "none";
    } else if (manifest[entry.file]) {
      action = "overwrite";
    } else {
      action = "backup";
    }
  }

  return {
    ...entry,
    action,
  };
});

const actionList = actions.filter(({ action }) => action !== "none");
const noneCount = actions.length - actionList.length;

// look for deleted files in the manifest
for (const file in manifest) {
  if (!existingLinks.has(file)) {
    actionList.unshift({
      file,
      directory: false,
      action: manifest[file].backup ? "restore" : "delete",
    });
  }
}

const actionLabels: any = {
  create: chalk.green("link"),
  backup: chalk.yellow("backup and link"),
  overwrite: chalk.red("overwrite old link"),
  delete: chalk.white("delete"),
  restore: chalk.blue("restore backup"),
};

if (actionList.length) {
  Logger.writeLine(chalk.bold("Linker Summary"));
  for (const { file: linkSrc, action } of actionList) {
    Logger.writeLine(`${actionLabels[action]} .${linkSrc}`);
  }
  if (noneCount > 0) {
    if (process.argv.includes("-l")) {
      for (const { file, directory } of actions.filter(
        (x) => x.action === "none"
      )) {
        Logger.writeLine("");
        Logger.writeLine(
          `${chalk.grey(`linked ${directory ? "dir " : "file"}`)} .${file}`
        );
      }
    } else {
      Logger.writeLine(`+ ${noneCount} links already synced`);
    }
  }
  Logger.writeLine("");
} else {
  Logger.writeLine(chalk.bold(`everything is up to date`));
}

if (actionList.length === 0) {
  if (process.argv.includes("-l")) {
    for (const { file, directory } of links) {
      Logger.writeLine(
        `${chalk.grey(`linked ${directory ? "dir " : "file"}`)} .${file}`
      );
    }
  }
  Logger.info(
    "checked %d links in %sms",
    actions.length,
    performance.now().toFixed(1)
  );
  process.exit(0);
}

// // first map out all the directories that need to be created
for (const { file } of actions) {
  mkdirSync(path.join(DEST, "." + file, "../"), { recursive: true });
}

// then create the links
for (const { file, directory, action } of actionList) {
  const srcPath = path.join(SRC, file);
  const destPath = path.join(DEST, "." + file);

  if (action === "backup") {
    let n = 0;
    let backupPath: string;
    do {
      backupPath = path.join(DEST, "." + file + ".bak" + (n === 0 ? "" : n));
      n++;
    } while (existsSync(backupPath));
    renameSync(destPath, backupPath);
    manifest[file] = {
      backup: path.relative(DEST, backupPath),
    };
  }

  if (["overwrite", "delete", "restore"].includes(action)) {
    rmSync(destPath, { recursive: true });
    if (manifest[file]) {
      if (manifest[file].backup) {
        renameSync(destPath + ".bak", destPath);
      }
    }
    delete manifest[file];
  }

  if (["create", "overwrite", "backup"].includes(action)) {
    manifest[file] ??= {};
    const stats = lstatSync(srcPath);
    if (directory || stats.isSymbolicLink()) {
      symlinkSync(srcPath, destPath);
    } else {
      linkSync(srcPath, destPath);
    }
  }
}

writeJSONSync(path.join(DEST, ".linker.json"), manifest);

Logger.info(
  "synced %d files in %sms",
  actions.length,
  performance.now().toFixed(1)
);
