import type { APIStatus } from '$/gui-api/routes/__status';
import { createSimpleCacheStore } from './fetch';

export const status = createSimpleCacheStore<APIStatus>('/status');
