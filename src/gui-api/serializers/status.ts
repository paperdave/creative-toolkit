import { Static } from '@sinclair/typebox';
import { t } from 'kingworld';

export const APIStatusSchema = t.Object({
  message: t.String({}),
  version: t.String({ pattern: '\\d{4}-\\d{2}-\\d{2}' }),
  system: t.Object({
    platform: t.String(),
    arch: t.String(),
  }),
  versions: t.Record(t.String(), t.String()),
});

export type APIStatus = Static<typeof APIStatusSchema>;
