import { Static } from '@sinclair/typebox';
import { t } from 'kingworld';
import { SequenceClipSchema } from './clip';

export const APIProjectMetaSchema = t.Object({
  id: t.String({ examples: ['mystery-of-life'] }),
  name: t.String({ examples: ['mystery of life'] }),
  path: t.String({ examples: ['/project/mystery-of-life'] }),
  lastUsed: t.String({}),
});

export type APIProjectMeta = Static<typeof APIProjectMetaSchema>;

export const APIArrangeClipResult = t.Object({
  clips: t.Array(SequenceClipSchema),
});

export type APIArrangeClipResult = Static<typeof APIArrangeClipResult>;
