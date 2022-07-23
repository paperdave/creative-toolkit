export let PROJECT: string;
export let PROJECT_NAME: string;
export let RENDER_ROOT: string;
export let COMP_ROOT: string;
export let PATH_TO_FUSION: string;

export interface SetPaths {
  PROJECT: string;
  PROJECT_NAME: string;
  RENDER_ROOT: string;
  COMP_ROOT: string;
  PATH_TO_FUSION: string;
}

export function setPaths(paths: SetPaths) {
  PROJECT = paths.PROJECT;
  PROJECT_NAME = paths.PROJECT_NAME;
  RENDER_ROOT = paths.RENDER_ROOT;
  COMP_ROOT = paths.COMP_ROOT;
  PATH_TO_FUSION = paths.PATH_TO_FUSION;
}
