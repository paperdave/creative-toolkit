import { RenderProgram } from '$/project';
import { t } from 'kingworld';
import { Nullable } from './utils';

export const UnarrangedSequenceClipSchema = t.Object(
  {
    start: Nullable(t.Integer({ minimum: 0 })),
    end: Nullable(t.Integer({ minimum: 0 })),
    label: t.String(),
    ext: t.String(),
    filename: t.String(),
    step: t.Integer({ minimum: 0 }),
    type: t.Enum(RenderProgram),
    length: Nullable(t.Integer({ minimum: 0 })),
  },
  {
    title: 'UnarrangedSequenceClip',
    description: 'A clip that may have incorrect or missing start/end time',
    examples: [
      {
        type: RenderProgram.Blender,
        start: 0,
        end: 100,
        label: 'clip-1',
        ext: 'blend',
        filename: '/project/test/step1/000-100_clip-1.blend"',
        step: 1,
        length: 101,
      },
      {
        type: RenderProgram.Fusion,
        start: null,
        end: null,
        label: 'clip-2',
        ext: 'blend',
        filename: '/project/test/step1/clip-2.comp"',
        step: 2,
        length: null,
      },
    ],
  }
);

export const SequenceClipSchema = t.Object(
  {
    start: t.Integer({ minimum: 0 }),
    end: t.Integer({ minimum: 0 }),
    label: t.String(),
    ext: t.String(),
    filename: t.String(),
    step: t.Integer({ minimum: 0 }),
    type: t.Enum(RenderProgram),
    length: t.Integer({ minimum: 0 }),
  },
  {
    title: 'SequenceClip',
    description: "A clip in a project's sequence",
    examples: [
      {
        type: RenderProgram.Blender,
        start: 0,
        end: 100,
        label: 'clip-1',
        ext: 'blend',
        filename: '/project/test/step1/000-100_clip-1.blend"',
        step: 1,
        length: 101,
      },
    ],
  }
);
