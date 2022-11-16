import { project } from '$data';
import type { LayoutLoadEvent } from './$types';

export async function load({ params: { projectId } }: LayoutLoadEvent) {
  await Promise.all([
    //
    project.fetch(projectId),
  ]);
}
