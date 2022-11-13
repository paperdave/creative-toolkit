import { KingWorld, t } from 'kingworld';
import { APIProjectSchema, serializeProject } from '../serializers/project';
import { guiApiGetAllProjects, guiApiGetProject } from '../state/projects';

export default (app: KingWorld) =>
  app
    .get(
      '/project',
      () => {
        const projects = guiApiGetAllProjects();
        return projects.map(x => ({
          id: x.project.id,
          name: x.project.name,
          path: x.path,
          lastUsed: x.lastUsed.toISOString(),
        }));
      },
      {
        schema: {
          response: t.Array(
            t.Object({
              id: t.String({ examples: ['mystery-of-life'] }),
              name: t.String({ examples: ['mystery of life'] }),
              path: t.String({ examples: ['/project/mystery-of-life'] }),
              lastUsed: t.String({}),
            })
          ),
        },
      }
    )
    .post(
      '/project/load',
      async ({ body }) => {
        const project = await guiApiGetProject(body.path);
        if (!project) {
          return {
            error: 'project not found',
          };
        }

        return serializeProject(project);
      },
      {
        schema: {
          body: t.Object({
            path: t.String(),
          }),
          response: t.Union([
            APIProjectSchema,
            t.Object({
              error: t.String(),
            }),
          ]),
        },
      }
    );
