import cors from '@kingworldjs/cors';
import swagger from '@kingworldjs/swagger';
import path from 'path';
import { TOOLKIT_DATE } from '$/constants';
import { Logger } from '@paperdave/logger';
import { walk } from '@paperdave/utils';
import { KingWorld } from 'kingworld';

const log = new Logger('api');

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

for await (const file of walk(path.join(import.meta.dir, 'routes'), { directories: false })) {
  (await import(file).then(x => x.default))(kingWorld);
}

kingWorld.get('/', ({ set }) => {
  set.redirect = '/docs';
});

kingWorld.listen(2004, x => {
  log(`listening on port ${x.hostname}:${x.port}`);
});
