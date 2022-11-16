import { APIProject } from '$/gui-api/structs/project';
import { APIProjectMeta } from '$/gui-api/structs/project-meta';
import { uiActiveProjectId } from '../state/global-ui';
import { jsonFetcher, Store } from '../utils';

export const $projectList = new Store(
  jsonFetcher({
    formatUrl: () => '/project',
    transform: data => data as APIProjectMeta[],
  })
);

export const $project = new Store(
  jsonFetcher({
    formatUrl: (id: string) => `/project/${id}`,
    transform: data => data as APIProject,
  })
);

export function readActiveProject() {
  return $project.read(uiActiveProjectId.use());
}
