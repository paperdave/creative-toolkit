#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-dynamic-delete */
import chalk from 'chalk';
import path from 'path';
import { Logger } from '@paperdave/logger';
import { asyncMap, pathExists, readJSONSync, walk, writeJSONSync } from '@paperdave/utils';
import { existsSync, statSync } from 'fs';
import { link, mkdir, rename, rm, symlink } from 'fs/promises';

interface Link {
  file: string;
  directory: boolean;
}

type Manifest = Record<string, ManifestEntry>;
interface ManifestEntry {
  backup?: string;
}

const DIR_LINK_NAME = '.linker';

const SRC = path.join(import.meta.dir, 'home');
// const DEST = path.join(import.meta.dir, 'test');
const DEST = path.resolve(process.env.HOME);

let manifest: Manifest = {};

if (existsSync(path.join(DEST, '.linker.json'))) {
  manifest = readJSONSync(path.join(DEST, '.linker.json'), {}) as Manifest;
}

const existingLinks = new Set<string>();
const fileLinks: Link[] = [];
const directoryLinks: Link[] = [];

for await (const file of walk(SRC, { directories: false })) {
  const rel = file.slice(SRC.length + 1);
  if (rel.endsWith('/' + DIR_LINK_NAME)) {
    const dir = rel.slice(0, -DIR_LINK_NAME.length - 1);
    directoryLinks.push({
      file: dir,
      directory: true,
    });
    existingLinks.add(dir);
  } else if (!rel.endsWith('.gitignore')) {
    fileLinks.push({
      file: rel,
      directory: false,
    });
    existingLinks.add(rel);
  }
}

const links = [
  // remove file links already specified in directory links
  ...fileLinks.filter(file => !directoryLinks.some(dir => file.file.startsWith(dir.file))),
  ...directoryLinks,
];

interface LinkWithAction extends Link {
  action: 'none' | 'create' | 'overwrite' | 'backup' | 'delete' | 'restore';
}

const actions: LinkWithAction[] = await asyncMap(links, async entry => {
  const srcPath = path.join(SRC, entry.file);
  const destPath = path.join(DEST, '.' + entry.file);

  let action: LinkWithAction['action'] = 'none';
  if (!(await pathExists(destPath))) {
    action = 'create';
  } else {
    const srcStat = statSync(srcPath);
    const destStat = statSync(destPath);
    if (srcStat.ino === destStat.ino) {
      action = 'none';
    } else if (manifest[entry.file]) {
      action = 'overwrite';
    } else {
      action = 'backup';
    }
  }

  return {
    ...entry,
    action,
  };
});

const actionList = actions.filter(({ action }) => action !== 'none');
const noneCount = actions.length - actionList.length;

// look for deleted files in the manifest
for (const file in manifest) {
  if (!existingLinks.has(file)) {
    actionList.unshift({
      file,
      directory: false,
      action: manifest[file].backup ? 'restore' : 'delete',
    });
  }
}

const actionLabels: any = {
  create: chalk.green('link'),
  backup: chalk.yellow('backup and link'),
  overwrite: chalk.red('overwrite old link'),
  delete: chalk.white('delete'),
  restore: chalk.blue('restore backup'),
};

if (actionList.length) {
  Logger.writeLine(chalk.bold('Linker Summary'));
  for (const { file: linkSrc, action } of actionList) {
    Logger.writeLine(`${actionLabels[action]} ${linkSrc}`);
  }
  if (noneCount > 0) {
    Logger.writeLine(`+ ${noneCount} already synced`);
  }
  Logger.writeLine('');
} else {
  Logger.writeLine(chalk.bold(`everything is up to date`));
}

if (actionList.length === 0) {
  Logger.info('checked %d links in %sms', actions.length, performance.now().toFixed(1));
  process.exit(0);
}

// first map out all the directories that need to be created
const directoriesToCreate = new Set<string>();
for (const { file } of actions) {
  directoriesToCreate.add(path.join(DEST, '.' + file, '../'));
}
await asyncMap([...directoriesToCreate], async dir =>
  mkdir(dir, { recursive: true }).catch(() => {})
);

// then create the links
await asyncMap(actionList, async ({ file, directory, action }) => {
  const srcPath = path.join(SRC, file);
  const destPath = path.join(DEST, '.' + file);

  if (action === 'backup') {
    let n = 0;
    let backupPath: string;
    do {
      backupPath = path.join(DEST, '.' + file + '.bak' + (n === 0 ? '' : n));
      n++;
    } while (await pathExists(backupPath));
    await rename(destPath, backupPath);
    manifest[file] = {
      backup: path.relative(DEST, backupPath),
    };
  }

  if (['overwrite', 'delete', 'restore'].includes(action)) {
    await rm(destPath, { recursive: true });
    if (manifest[file]) {
      if (manifest[file].backup) {
        await rename(destPath + '.bak', destPath);
      }
    }
    delete manifest[file];
  }

  if (['create', 'overwrite', 'backup'].includes(action)) {
    manifest[file] ??= {};
    if (directory) {
      await symlink(srcPath, destPath);
    } else {
      await link(srcPath, destPath);
    }
  }
});

writeJSONSync(path.join(DEST, '.linker.json'), manifest);

Logger.info('synced %d files in %sms', actions.length, performance.now().toFixed(1));
