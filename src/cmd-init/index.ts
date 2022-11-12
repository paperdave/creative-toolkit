import path from 'path';
import { RunCommand } from '$cmd-runner';
import { TOOLKIT_DATE } from '$constants';
import { Project } from '$project';
import { Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { paramCase } from 'change-case';
import { mkdir, writeFile } from 'fs/promises';

export const project = false;

export const run: RunCommand = async ({}) => {
  if (await pathExists('project.json')) {
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
      format: TOOLKIT_DATE,
    },
    {}
  );
  await newProject.writeJSON();

  await mkdir('./out');
  await mkdir('./film');
  await mkdir('./materials');
  await mkdir('./step1');
  await mkdir('./step2');

  if (!(await pathExists(path.join(root, '.bitwig-project')))) {
    await writeFile(path.join(root, '.bitwig-project'), '');
  }
};
