import { KingWorld, t } from 'kingworld';
import { apiGetProjectById } from '../state/projects';
import { APIFilmShotPreviewSchema, APIFilmShotSchema, APIFilmTakeSchema } from '../structs/film';

export default (app: KingWorld) =>
  app
    .get(
      '/project/:projectId/film',
      async ({ params: { projectId } }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        const filmStore = await project.getFilmStore();
        return [...filmStore.shots.values()].map(x => ({
          id: x.id,
          start: x.start,
          end: x.end,
          takeCount: x.takes.size,
          createdAt: x.createdAt.getTime(),
        }));
      },
      {
        schema: {
          response: t.Union([
            t.Array(APIFilmShotPreviewSchema),
            t.Object({
              error: t.String(),
            }),
          ]),
        },
      }
    )
    .post(
      '/project/:projectId/film',
      async ({ params: { projectId }, body }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        const filmStore = await project.getFilmStore();
        const shot = await filmStore.createShot(body);
        return {
          id: shot.id,
          start: shot.start,
          end: shot.end,
          comment: shot.comment,
          takes: [...shot.takes.values()].map(take => ({
            num: take.num,
            createdAt: take.createdAt.getTime(),
            filename: take.filename,
          })),
          createdAt: shot.createdAt.getTime(),
          root: shot.root,
          nextTakeNum: shot.nextTakeNum,
        };
      },
      {
        schema: {
          response: t.Union([
            APIFilmShotSchema,
            t.Object({
              error: t.String(),
            }),
          ]),
          body: t.Object({
            id: t.String(),
            start: t.Number(),
            end: t.Number(),
          }),
        },
      }
    )
    .get(
      '/project/:projectId/film/:shotId',
      async ({ params: { projectId, shotId } }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        const filmStore = await project.getFilmStore();
        const shot = filmStore.getShot(shotId);
        if (!shot) {
          return {
            error: 'Shot not found',
          };
        }
        return {
          id: shot.id,
          start: shot.start,
          end: shot.end,
          comment: shot.comment,
          takes: [...shot.takes.values()].map(take => ({
            num: take.num,
            createdAt: take.createdAt.getTime(),
            filename: take.filename,
          })),
          createdAt: shot.createdAt.getTime(),
          root: shot.root,
          nextTakeNum: shot.nextTakeNum,
        };
      },
      {
        schema: {
          response: t.Union([
            APIFilmShotSchema,
            t.Object({
              error: t.String(),
            }),
          ]),
        },
      }
    )
    .post(
      '/project/:projectId/film/:shotId/take',
      async ({ params: { projectId, shotId } }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        const filmStore = await project.getFilmStore();
        const shot = filmStore.getShot(shotId);
        if (!shot) {
          return {
            error: 'Shot not found',
          };
        }
        const take = await shot.createTake();
        return {
          num: take.num,
          createdAt: take.createdAt.getTime(),
          filename: take.filename,
        };
      },
      {
        schema: {
          response: t.Union([
            APIFilmTakeSchema,
            t.Object({
              error: t.String(),
            }),
          ]),
        },
      }
    )
    .post(
      '/project/:projectId/film/:shotId/take/:takeNum/delete',
      async ({ params: { projectId, shotId, takeNum } }) => {
        const project = apiGetProjectById(projectId);
        if (!project) {
          return {
            error: 'Project not found',
          };
        }
        const filmStore = await project.getFilmStore();
        const shot = filmStore.getShot(shotId);
        if (!shot) {
          return {
            error: 'Shot not found',
          };
        }
        const take = shot.getTake(takeNum);
        if (!take) {
          return {
            error: 'Take not found',
          };
        }
        await take.delete();
        return {
          status: 'ok',
        };
      },
      {
        schema: {
          response: t.Union([
            t.Object({
              error: t.String(),
            }),
            t.Object({
              status: t.String(),
            }),
          ]),
        },
      }
    );
