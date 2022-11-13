import { APIProject } from '$/gui-api/serializers/project';
import { jsonFetcher, Store } from './utils';

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
