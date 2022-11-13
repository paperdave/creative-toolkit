import { APIProject } from '$/gui-api/serializers/project';
import { postJSON } from '../data-sources';
import { $project, $projectList } from '../data-sources/project';

export async function guiActionLoadProject(path: string) {
  const project = await postJSON<APIProject>('/project/load', { path });
  $project.set(project.id, project);
  $projectList.invalidate();
  return project;
}
