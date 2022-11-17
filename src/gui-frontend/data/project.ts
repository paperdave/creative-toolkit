import type { APIProject } from '$/gui-api/structs/project';
import type { APIArrangeClipResult, APIProjectMeta } from '$/gui-api/structs/project-meta';
import { page } from '$app/stores';
import { derived, get } from 'svelte/store';
import { createCacheStore, createSimpleCacheStore, fetchJSON, postJSON } from './fetch';

export const projectList = createSimpleCacheStore<APIProjectMeta[]>('/project');

export const project = createCacheStore(
  (id: string) => `/project/${id}`,
  (data: APIProject) => data
);

export const activeProject = derived(
  //
  [project, page],
  ([$project, $page]) => $project($page.params.projectId)
);

export async function guiActionLoadProject(path: string) {
  const newProject = await postJSON<APIProject>('/project/load', { path });
  project.set(newProject.id, newProject);
  projectList.update(x =>
    x.concat({
      id: newProject.id,
      name: newProject.name,
      path: newProject.root,
    })
  );
  return project;
}

export async function guiActionArrangeClips(projectId: string) {
  const clips = await fetchJSON<APIArrangeClipResult>('/project/' + projectId + '/arrange');
  project.update(projectId, p => {
    p.clips = clips.clips;
    p.isArranged = true;
    return p;
  });
  return clips;
}

export function getActiveProjectFPS() {
  return get(activeProject).fps;
}
