import express from 'express';
import path from 'path';
import { info } from '@paperdave/logger';
import { readdirSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { CT_SOURCE_ROOT } from '../paths';
import type { Project } from '../project';
import { exists, readJSON } from '../util/fs';

export async function startServer(project: Project) {
  const Vite = await import('vite');

  const app = express();
  const viteServer = await Vite.createServer({
    root: path.join(CT_SOURCE_ROOT, 'web'),
    configFile: path.join(CT_SOURCE_ROOT, 'web/vite.config.ts'),
    server: {
      middlewareMode: true,
    },
  });

  app.use(express.static(path.join(CT_SOURCE_ROOT, 'res')));

  app.get('/api/project.json', (req, res) => {
    res.send(project.json);
  });

  app.get('/api/audio.wav', async (req, res) => {
    if (await exists(project.paths.audio)) {
      res.setHeader('Content-Type', 'audio/wav');
      res.send(await readFile(project.paths.audio));
    } else {
      res.status(404).send('No audio found');
    }
  });

  app.get('/api/takes', async (req, res) => {
    const takes = await readdir(project.paths.film);
    res.send(
      takes.map(take => {
        const [start, end, id] = /^(\d+)-(\d+)_(.*)$/.exec(take)?.slice(1) ?? [];
        return {
          id,
          start: parseInt(start, 10),
          end: parseInt(end, 10),
          takeCount: readdirSync(path.join(project.paths.film, take)).length,
          path: path.join(project.paths.film, take),
        };
      })
    );
  });

  app.get('/api/takes/:groupId', async (req, res) => {
    const takes = await readdir(project.paths.film);

    const match = takes.find(take => {
      const [, , id] = /^(\d+)-(\d+)_(.*)$/.exec(take)?.slice(1) ?? [];
      return id === req.params.groupId;
    });

    if (!match) {
      res.status(404).send('Not found');
      return;
    }

    const metaFile = path.join(project.paths.film, match, 'metadata.json');
    if (!(await exists(metaFile))) {
      res.status(404).send('Not found');
      return;
    }

    const metadata = (await readJSON(metaFile)) as any;

    const [start, end, id] = /^(\d+)-(\d+)_(.*)$/.exec(match)?.slice(1) ?? [];
    res.send({
      id,
      start: parseInt(start, 10),
      end: parseInt(end, 10),
      takeCount: takes.length,
      path: path.join(project.paths.film, match),
      ...metadata,
    });
  });

  app.use(viteServer.middlewares);

  app.listen(18325, () => {
    info('Server listening on port 18325');
  });
}
