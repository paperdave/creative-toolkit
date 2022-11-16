import { Static } from '@sinclair/typebox';
import { t } from 'kingworld';

export const APIFilmTakeSchema = t.Object({
  num: t.Number(),
  createdAt: t.Number(),
  filename: t.String(),
});

export type APIFilmTake = Static<typeof APIFilmTakeSchema>;

export const APIFilmShotPreviewSchema = t.Object({
  id: t.String(),
  start: t.Number(),
  end: t.Number(),
  takeCount: t.Number(),
  createdAt: t.Number(),
});

export type APIFilmShotPreview = Static<typeof APIFilmShotPreviewSchema>;

export const APIFilmShotSchema = t.Object({
  id: t.String(),
  start: t.Number(),
  end: t.Number(),
  comment: t.String(),
  createdAt: t.Number(),
  root: t.String(),
  nextTakeNum: t.Number(),
  takes: t.Array(APIFilmTakeSchema),
});

export type APIFilmShot = Static<typeof APIFilmShotSchema>;
