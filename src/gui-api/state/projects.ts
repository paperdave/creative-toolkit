import { Project, resolveProject } from '$/project';
import { Logger } from '@paperdave/logger';
import { asyncMap } from '@paperdave/utils';

const log = new Logger('api');

export const PROJECT_TIMEOUT = 1000 * 60 * 60 * 2; // 2 hours

export interface ProjectRef {
  path: string;
  project: Project;
  lastUsed: Date;
}

const guiApiOpenProjects = new Map<string, ProjectRef>();

export async function guiApiGetProject(path: string) {
  const ref = guiApiOpenProjects.get(path);
  if (ref) {
    ref.lastUsed = new Date();
    return ref.project;
  }

  try {
    log('loading project %s', path);
    const project = await resolveProject(path);
    log('project %s (%s) loaded', project.name, project.id);
    guiApiOpenProjects.set(path, { path, project, lastUsed: new Date() });
    return project;
  } catch {
    return null;
  }
}

export async function guiApiCloseProject(path: string) {
  const ref = guiApiOpenProjects.get(path);
  if (ref) {
    log('closing project %s', ref.project.id);
    ref.project.close();
    guiApiOpenProjects.delete(path);
  }
}

export async function guiApiCloseAllProjects() {
  await asyncMap(guiApiOpenProjects.keys(), guiApiCloseProject);
}

export async function guiApiCloseUnusedProjects() {
  const now = new Date();
  await asyncMap(guiApiOpenProjects.values(), async ref => {
    if (now.getTime() - ref.lastUsed.getTime() > PROJECT_TIMEOUT) {
      await guiApiCloseProject(ref.path);
    }
  });
}

export function guiApiGetAllProjects() {
  return [...guiApiOpenProjects.values()];
}
