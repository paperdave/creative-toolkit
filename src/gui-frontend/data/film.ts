import type { FilmShotFilenameSplit } from '$/film/film-store';
import type { APIFilmShot, APIFilmShotPreview } from '$/gui-api/structs/film';
import { page } from '$app/stores';
import { derived } from 'svelte/store';
import { createCacheStore, postJSON } from './fetch';

export const filmShotList = createCacheStore(
  (projectId: string) => `/project/${projectId}/film`,
  (data: APIFilmShotPreview[]) => data
);

export const filmShot = createCacheStore(
  (projectId: string, shotId: string) => `/project/${projectId}/film/${shotId}`,
  (data: APIFilmShot) => data
);

export const activeFilmShotList = derived(
  //
  [filmShotList, page],
  ([$filmShotList, $page]) => $filmShotList($page.params.projectId)
);

export const activeFilmShot = derived(
  //
  [filmShot, page],
  ([$filmShot, $page]) => $filmShot($page.params.projectId, $page.params.shotId)
);

export async function guiActionCreateFilmShot(projectId: string, opts: FilmShotFilenameSplit) {
  const film = await postJSON<APIFilmShot>(`/project/${projectId}/film`, opts);
  filmShot.set(projectId, film.id, film);
  filmShotList.update(projectId, old => [
    ...old,
    {
      id: film.id,
      start: film.start,
      end: film.end,
      createdAt: film.createdAt,
      takeCount: film.takes.length,
    },
  ]);
  return film;
}
