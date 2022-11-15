import { APIStatus } from '$/gui-api/serializers/status';
import { jsonFetcher, Store } from '../utils';

export const $status = new Store(
  jsonFetcher({
    formatUrl: () => '/status',
    transform: data => data as APIStatus,
  })
);
