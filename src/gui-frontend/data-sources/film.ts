import { APIFilmShot, APIFilmShotPreview } from '$/gui-api/structs/film';
import { uiActiveFilmShotId, uiActiveProjectId } from '../state/global-ui';
import { jsonFetcher, Store } from '../utils';

export const $filmShotList = new Store(
  jsonFetcher({
    formatUrl: (projectId: string) => `/project/${projectId}/film`,
    transform: data => data as APIFilmShotPreview[],
  })
);

export const $filmShot = new Store(
  jsonFetcher({
    formatUrl: (projectId: string, shotId: string) => `/project/${projectId}/film/${shotId}`,
    transform: data => data as APIFilmShot,
  })
);

export function readAPFilmShotList() {
  return $filmShotList.read(uiActiveProjectId.use());
}

export function readAPFilmShot(shotId: string) {
  return $filmShot.read(uiActiveProjectId.use(), shotId);
}

export function readActiveFilmShot() {
  return $filmShot.read(uiActiveProjectId.use(), uiActiveFilmShotId.use());
}
