import { apiGetProjectById } from '$/gui-api/state/projects';
import { KingWorld, t } from 'kingworld';
import { APIArrangeClipResult } from '../structs/project-meta';

export default (app: KingWorld) =>
  app.get(
    '/project/:projectId/arrange',
    async ({ params: { projectId } }) => {
      const project = apiGetProjectById(projectId);
      if (!project) {
        return {
          error: 'Project not found',
        };
      }
      const clips = await project.getClips();
      return {
        clips,
      };
    },
    {
      schema: {
        response: t.Union([
          APIArrangeClipResult,
          t.Object({
            error: t.String(),
          }),
        ]),
      },
    }
  );
