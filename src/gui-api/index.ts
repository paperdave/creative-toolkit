import cors from '@kingworldjs/cors';
import swagger from '@kingworldjs/swagger';
import path from 'path';
import { TOOLKIT_DATE } from '$/constants';
import { Logger } from '@paperdave/logger';
import { readdirSync } from 'fs';
import { KingWorld } from 'kingworld';

const log = new Logger('api');

export function createAPIServer() {
  const kingWorld = new KingWorld();

  kingWorld.use(swagger, {
    path: '/docs',
    exclude: ['/', '/docs', '/docs/json'],
    swagger: {
      info: {
        title: 'Creative Toolkit GUI API',
        description: 'Interact with Creative Toolkit project data.',
        version: TOOLKIT_DATE,
      },
    },
  });

  kingWorld.use(cors, {
    origin: ['http://localhost:18325'],
  });

  for (const file of readdirSync(path.join(import.meta.dir, './routes')).sort()) {
    require(`./routes/${file}`).default(kingWorld);
  }

  kingWorld.get('/', ({ set }) => {
    set.redirect = '/docs';
  });

  kingWorld.onStart(x => {
    const { port, hostname } = x.server!;
    log(`api server is running: http://${hostname}:${port}`);
  });

  return kingWorld;
}
