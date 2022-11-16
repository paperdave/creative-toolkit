import { filmShotList } from '$data';
import type { LayoutLoadEvent } from './$types';

export async function load({ params: { projectId } }: LayoutLoadEvent) {
  await Promise.all([
    //
    filmShotList.fetch(projectId),
  ]);
}
