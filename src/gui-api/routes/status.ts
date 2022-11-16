import os from 'os';
import path from 'path';
import { TOOLKIT_CODENAME, TOOLKIT_VERSION } from '$/constants';
import { KingWorld } from 'kingworld';
import { schemaOf } from '../structs/utils';

export const TOOLKIT_STATUS_RESPONSE = {
  message: 'i love you',
  version: TOOLKIT_VERSION,
  codename: TOOLKIT_CODENAME,
  source: path.join(import.meta.dir, '..', '..', '..'),
  system: {
    platform: process.platform,
    arch: process.arch,
    version: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalmem: os.totalmem(),
  },
  versions: {
    toolkit: TOOLKIT_VERSION,
    bun: process.versions.bun,
    node: process.versions.node,
  },
} as const;

const APIStatusSchema = schemaOf(TOOLKIT_STATUS_RESPONSE);

export type APIStatus = typeof TOOLKIT_STATUS_RESPONSE;

export default (app: KingWorld) =>
  app.get('/status', () => TOOLKIT_STATUS_RESPONSE, {
    schema: {
      response: APIStatusSchema,
    },
  });
