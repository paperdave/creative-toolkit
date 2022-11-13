import { DEFAULT_PATHS, Paths, Project } from '$project';
import { Static, TString } from '@sinclair/typebox';
import { t } from 'kingworld';
import { UnarrangedSequenceClipSchema } from './clip';

export const APIProjectSchema = t.Object(
  {
    id: t.String({ examples: ['mystery-of-life'] }),
    name: t.String({ examples: ['mystery of life'] }),
    root: t.String({ examples: ['/project/mystery-of-life'] }),
    clips: t.Array(UnarrangedSequenceClipSchema),
    isArranged: t.Boolean(),
    hasAudio: t.Boolean(),
    paths: t.Object(
      Object.fromEntries(
        Object.entries(DEFAULT_PATHS).map(([key, value]) => [key, t.String({ examples: [value] })])
      ) as Record<keyof Paths, TString>
    ),
  },
  {
    title: 'Project',
    description: 'A project in the creative toolkit',
  }
);

export type APIProject = Static<typeof APIProjectSchema>;

export async function serializeProject(project: Project): Promise<APIProject> {
  return {
    id: project.id,
    name: project.name,
    root: project.root,
    clips: await project.getRawClips(),
    isArranged: project.isArranged,
    hasAudio: project.hasAudio,
    paths: project.paths,
  };
}
