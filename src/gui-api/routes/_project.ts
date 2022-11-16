import { apiGetAllProjects, apiGetProjectById, apiLoadProject } from '$/gui-api/state/projects';
import { APIProjectSchema, serializeProject } from '$/gui-api/structs/project';
import { KingWorld, t } from 'kingworld';
import { APIProjectMetaSchema } from '../structs/project-meta';

export default (app: KingWorld) =>
  app
    .get(
      '/project',
      () => {
        const projects = apiGetAllProjects();
        return projects.map(x => ({
          id: x.project.id,
          name: x.project.name,
          path: x.path,
          lastUsed: x.lastUsed.toISOString(),
        }));
      },
      {
        schema: {
          response: t.Array(APIProjectMetaSchema),
        },
      }
    )
    .get(
      '/project/:projectId',
      async ({ params: { projectId } }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        return serializeProject(project);
      },
      {
        schema: {
          response: t.Union([
            APIProjectSchema,
            t.Object({
              error: t.String(),
            }),
          ]),
        },
      }
    )
    .post(
      '/project/load',
      async ({ body }) => {
        const project = await apiLoadProject(body.path);
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
