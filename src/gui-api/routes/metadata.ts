import { TOOLKIT_DATE } from '$constants';
import { KingWorld } from 'kingworld';
import { APIStatusSchema } from '../serializers/status';

export default (app: KingWorld) =>
  app.get(
    '/status',
    () => ({
      message: 'creative toolkit api is functioning',
      version: TOOLKIT_DATE,
      system: {
        platform: process.platform,
        arch: process.arch,
      },
      versions: {
        ...process.versions,
        toolkit: TOOLKIT_DATE,
      },
    }),
    {
      schema: {
        response: APIStatusSchema,
      },
    }
  );
