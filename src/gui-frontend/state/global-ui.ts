import { State } from '../utils';

export const uiActiveProjectId = new State({
  initialState() {
    return null as string | null;
  },
});

export type UITabType = 'info' | 'clips' | 'film';

export const uiActiveTab = new State({
  initialState() {
    return 'clips' as UITabType;
  },
});

export const uiActiveFilmShotId = new State({
  initialState() {
    return null as string | null;
  },
});
