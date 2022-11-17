import { filmShot } from '$data';
import type { LayoutLoadEvent } from './$types';

export async function load({ params: { projectId, shotId } }: LayoutLoadEvent) {
  await Promise.all([
    //
    filmShot.fetch(projectId, shotId),
  ]);
}
