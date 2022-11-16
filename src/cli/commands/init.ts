/* eslint-disable no-alert */
import path from 'path';
import { RunCommandNoProject } from '$/cli';
import { TOOLKIT_FORMAT } from '$/constants';
import { Project } from '$/project';
import { Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { paramCase } from 'change-case';
import { mkdir, writeFile } from 'fs/promises';

export const desc = 'initialize a creative toolkit project';
export const sort = 100;
export const requiresProject = false;

export const run: RunCommandNoProject = async () => {
  if (await pathExists('project.yaml')) {
    Logger.error(`project already exists here!`);
    return;
  }

  const root = process.cwd();

  Logger.info('Initializing project at: ' + root);
  Logger.info();

  const name = prompt('name', path.basename(process.cwd()));
  if (!name) {
    return;
  }

  const autoGenId = paramCase(name);
  const id = prompt('id', autoGenId) ?? autoGenId;

  const newProject = new Project(
    root,
    {
      id,
      name,
      audioTiming: {
        bpm: 120,
      },
      format: TOOLKIT_FORMAT,
    },
    {}
  );

  await mkdir('./out', { recursive: true });
  await mkdir('./film', { recursive: true });
  await mkdir('./materials', { recursive: true });
  await mkdir('./step1', { recursive: true });
  await mkdir('./step2', { recursive: true });

  await newProject.write();

  if (!(await pathExists(path.join(root, '.bitwig-project')))) {
    await writeFile(path.join(root, '.bitwig-project'), '');
  }
};
