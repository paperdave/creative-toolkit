import { apiGetProjectById } from '$/gui-api/state/projects';
import { KingWorld, t } from 'kingworld';
import { APIArrangeClipResult } from '../serializers/project-meta';

export default (app: KingWorld) =>
  app.get(
    '/jfdsai/:id',
    async ({ params: { id } }) => {
      const project = apiGetProjectById(id);
      if (!project) {
        return {
          error: 'Project not found',
        };
      }
      const clips = await project.getArrangedClips();
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
