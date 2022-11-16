import { APIProject } from '$/gui-api/serializers/project';
import { APIArrangeClipResult } from '$/gui-api/serializers/project-meta';
import { $project, $projectList } from '../data-sources/project';
import { getJSON, postJSON } from '../utils';

export async function guiActionLoadProject(path: string) {
  const project = await postJSON<APIProject>('/project/load', { path });
  $project.set(project.id, project);
  $projectList.invalidate();
  return project;
}

export async function guiActionArrangeClips(projectId: string) {
  const clips = await getJSON<APIArrangeClipResult>('/project/' + projectId + '/arrange');
  $project.update(projectId, project => {
    project.clips = clips.clips;
    project.isArranged = true;
    return project;
  });
  return clips;
}
