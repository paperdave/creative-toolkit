import { FilmShotFilenameSplit } from '$/film/film-store';
import { APIFilmShot } from '$/gui-api/structs/film';
import { $filmShot, $filmShotList } from '../data-sources/film';
import { postJSON } from '../utils';

export async function guiActionCreateFilmShot(projectId: string, opts: FilmShotFilenameSplit) {
  const film = await postJSON<APIFilmShot>(`/project/${projectId}/film`, opts);
  $filmShotList.update(projectId, old => [
    ...old,
    {
      id: film.id,
      start: film.start,
      end: film.end,
      createdAt: film.createdAt,
      takeCount: film.takes.length,
    },
  ]);
  $filmShot.set(projectId, film.id, film);
  return film;
}
