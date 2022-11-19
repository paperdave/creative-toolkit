import { getActiveProjectFPS } from '$data';
import type { FilmStatus } from './film-app-logic';

export function roundSecondToFrame(seconds: number, fps = getActiveProjectFPS()) {
  return Math.floor(seconds * fps) / fps;
}

export function getReadableStatus(status: FilmStatus, countdown: null | number) {
  switch (status) {
    case 'idle':
      return 'Idle...';
    case 'recording':
      return 'Recording...';
    case 'previewing':
      return 'Previewing Audio...';
    case 'recording_prep':
      return `Recording in ${countdown}...`;
    case 'recording_post':
      return 'Finishing Recording...';
    default:
      return 'Unknown: ' + status;
  }
}
