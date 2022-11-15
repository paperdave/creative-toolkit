import { loadProject, Project } from '$/project';
import { Logger } from '@paperdave/logger';
import { asyncMap } from '@paperdave/utils';

const log = new Logger('api');

export const PROJECT_TIMEOUT = 1000 * 60 * 60 * 2; // 2 hours

export interface ProjectRef {
  path: string;
  project: Project;
  lastUsed: Date;
  other: ProjectRef;
}

const projectsByPath = new Map<string, ProjectRef>();
const projectsById = new Map<string, ProjectRef>();

export async function apiLoadProject(path: string) {
  const ref = projectsByPath.get(path);
  if (ref) {
    ref.lastUsed = new Date();
    ref.other.lastUsed = new Date();
    return ref.project;
  }

  try {
    log('loading project %s', path);
    const project = await loadProject(path);
    log('project %s (%s) loaded', project.name, project.id);
    apiAddProject(project);
    return project;
  } catch {
    return null;
  }
}

export function apiGetProjectById(id: string) {
  const ref = projectsById.get(id);
  if (ref) {
    ref.lastUsed = new Date();
    ref.other.lastUsed = new Date();
    return ref.project;
  }
  return null;
}

export async function apiCloseProject(path: string) {
  const ref = projectsByPath.get(path);
  if (ref) {
    log('closing project %s', ref.project.id);
    ref.project.close();
    projectsByPath.delete(path);
  }
}

export async function apiCloseAllProjects() {
  await asyncMap(projectsByPath.keys(), apiCloseProject);
}

export async function apiCloseUnusedProjects() {
  const now = new Date();
  await asyncMap(projectsByPath.values(), async ref => {
    if (now.getTime() - ref.lastUsed.getTime() > PROJECT_TIMEOUT) {
      await apiCloseProject(ref.path);
    }
  });
}

export function apiGetAllProjects() {
  return [...projectsByPath.values()];
}

export function apiAddProject(project: Project) {
  const byPath: ProjectRef = { path: project.root, project, lastUsed: new Date(), other: null! };
  const byId: ProjectRef = { path: project.root, project, lastUsed: new Date(), other: null! };
  byPath.other = byId;
  byId.other = byPath;
  projectsByPath.set(project.root, byPath);
  projectsById.set(project.id, byId);
}
