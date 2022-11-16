import { APIStatus } from '$/gui-api/routes/status';
import { jsonFetcher, Store } from '../utils';

export const $status = new Store(
  jsonFetcher({
    formatUrl: () => '/status',
    transform: data => data as APIStatus,
  })
);
