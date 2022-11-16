import cors from '@kingworldjs/cors';
import swagger from '@kingworldjs/swagger';
import path from 'path';
import { TOOLKIT_VERSION } from '$/constants';
import { Logger } from '@paperdave/logger';
import { asyncMap } from '@paperdave/utils';
import { readdir } from 'fs/promises';
import { KingWorld } from 'kingworld';

const log = new Logger('api');

const modules = await readdir(path.join(import.meta.dir, './routes'))
  .then(x => x.sort())
  .then(x => asyncMap(x, name => import(`./routes/${name}`)))
  .then(x => asyncMap(x, module => module.default));

export function createAPIServer() {
  const kingWorld = new KingWorld();

  kingWorld.use(swagger, {
    path: '/docs',
    exclude: ['/', '/docs', '/docs/json'],
    swagger: {
      info: {
        title: 'Creative Toolkit GUI API',
        description: 'Interact with Creative Toolkit project data.',
        version: TOOLKIT_VERSION,
      },
    },
  });

  kingWorld.use(cors, {
    origin: ['http://localhost:18325'],
  });

  kingWorld.get('/', ({ set }) => {
    set.redirect = '/docs';
  });

  for (const plugin of modules) {
    plugin(kingWorld);
  }

  kingWorld.onStart(x => {
    const { port, hostname } = x.server!;
    log(`api server is running: http://${hostname}:${port}`);
  });

  return kingWorld;
}
