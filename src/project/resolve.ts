import path from 'path';
import YAML from 'yaml';
import { TOOLKIT_FORMAT } from '$/constants';
import { CLIError } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { readFile } from 'fs/promises';
import { Paths } from './paths';
import { Project } from './project';
import { RawProject } from './project-json';
import { walkUpDirectoryTree } from '../util/fs';

export async function loadProject(
  startPath = process.cwd(),
  paths: Partial<Paths> = {}
): Promise<Project> {
  const root = await walkUpDirectoryTree(
    startPath, //
    dir => pathExists(path.join(dir, 'project.yaml'))
  );

  if (!root) {
    const e = new CLIError(
      'Could not find a creative toolkit project',
      'Run `ct init` to create a new project.'
    );
    (e as any).code = 'ENOENT';
    throw e;
  }

  const json = YAML.parse(await readFile(path.join(root, 'project.yaml'), 'utf8')) as RawProject;

  if (json.format !== TOOLKIT_FORMAT) {
    throw new CLIError(
      'Incorrect Creative Toolkit Version',
      `This project was saved with format #${json.format}, expected #${TOOLKIT_FORMAT}.`
    );
  }

  return new Project(root, json, paths);
}
