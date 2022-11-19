import type { FilmShotFilenameSplit } from '$/film/film-store';
import type { APIFilmShot, APIFilmShotPreview, APIFilmTake } from '$/gui-api/structs/film';
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

export async function guiActionDeleteFilmShot(projectId: string, shotId: string) {
  await postJSON(`/project/${projectId}/film/${shotId}/delete`);
  filmShotList.update(projectId, old => old.filter(shot => shot.id !== shotId));
  filmShot.delete(projectId, shotId);
}

interface FilmShotSettings {
  id: string;
  start: number;
  end: number;
}

export async function guiActionCreateFilmShotTake(
  projectId: string,
  shotIdOrSettings: string | FilmShotSettings
) {
  const { id, start, end } =
    typeof shotIdOrSettings === 'string'
      ? { id: shotIdOrSettings, end: undefined, start: undefined }
      : shotIdOrSettings;

  try {
    const shot = await filmShot.fetch(projectId, id);
    if ((shot as any).error) {
      throw new Error((shot as any).error);
    }
  } catch (error) {
    if (start == null || end == null) {
      throw new Error('Could not create take: ' + error);
    }
    await guiActionCreateFilmShot(projectId, { id, start, end });
  }
  const take = await postJSON<APIFilmTake>(`/project/${projectId}/film/${id}/take`);
  filmShot.update(projectId, id, shot => ({
    ...shot,
    takes: [...shot.takes, take],
    nextTakeNum: shot.nextTakeNum + 1,
  }));
  filmShotList.update(projectId, data => {
    const shot = data.find(x => x.id === id)!;
    shot.takeCount++;
    return data;
  });
  return take;
}

export async function guiActionDeleteFilmShotTake(
  projectId: string,
  shotId: string,
  takeNum: number
) {
  await postJSON(`/project/${projectId}/film/${shotId}/take/${takeNum}/delete`);
  filmShot.update(projectId, shotId, shot => {
    const takes = shot.takes.filter(take => take.num !== takeNum);
    return {
      ...shot,
      takes,
      nextTakeNum: Math.max(...takes.map(take => take.num)) + 1,
    };
  });
  filmShotList.update(projectId, data => {
    const shot = data.find(s => s.id === shotId);
    if (shot) {
      shot.takeCount--;
    }
    return data;
  });
}
