import { info } from '@paperdave/logger';
import express from 'express';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import type { Project } from '../project';
import bodyParser from 'body-parser';
import path from 'path';
import { readdirSync } from 'fs';
import { exists, readJSON, writeJSON } from '../util/fs';

export function startServer(project: Project) {
  const app = express();

  app.use(express.static(fileURLToPath(new URL('../src/web', import.meta.url))));

  app.get('/project.json', (req, res) => {
    res.send(project.json);
  });

  app.get('/audio.wav', async (req, res) => {
    res.setHeader('Content-Type', 'audio/wav');
    res.send(await readFile(project.paths.audio));
  });

  app.post('/take', bodyParser.raw({ type: 'video/webm', limit: Infinity }), async (req, res) => {
    const startTimeFrame = req.query.startFrame;
    const endTimeFrame = req.query.endFrame;
    const groupId = req.query.groupId;

    info(`Saving Take: ${startTimeFrame} - ${endTimeFrame}`);

    // Read video file uploaded
    if (req.headers['content-type'] !== 'video/webm') {
      res.status(400).send('Invalid content type');
      return;
    }

    const dir = path.join(project.paths.film, `${startTimeFrame}-${endTimeFrame}_${groupId}`);

    if (!await exists(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const list = await readdir(dir);

    let n = 1;
    while (list.includes(`take${n}.webm`)) {
      n++;
    }
    
    const saveTo = path.join(dir, `take${n}.webm`);
    await writeFile(saveTo, req.body);

    if (!await exists(path.join(dir, 'metadata.json'))) {
      await writeJSON(path.join(dir, 'metadata.json'), {
        id: groupId,
        date: new Date().toISOString(),
        takes: [],
      });
    }

    const metadata = await readJSON(path.join(dir, 'metadata.json')) as any;
    metadata.takes.push({
      id: n,
      date: new Date().toISOString(),
      export: null
    });
    await writeJSON(path.join(dir, 'metadata.json'), metadata);

    res.status(200).send({ path: saveTo });
  });

  app.get('/takes', async (req, res) => {
    const takes = await readdir(project.paths.film);
    res.send(takes.map(take => {
      const [start, end, id] = /^(\d+)-(\d+)_(.*)$/.exec(take)?.slice(1) ?? [];
      return {
        id,
        start: parseInt(start, 10),
        end: parseInt(end, 10),
        takeCount: readdirSync(path.join(project.paths.film, take)).length,
        path: path.join(project.paths.film, take),
      };
    }));
  });

  app.get('/takes/:groupId', async(req, res) => {
    const takes = await readdir(project.paths.film);

    const match = takes.find(take => {
      const [,, id] = /^(\d+)-(\d+)_(.*)$/.exec(take)?.slice(1) ?? [];
      return id === req.params.groupId;
    });

    if (!match) {
      res.status(404).send('Not found');
      return;
    }

    const metaFile = path.join(project.paths.film, match, 'metadata.json');
    if (!await exists(metaFile)) {
      res.status(404).send('Not found');
      return;
    }

    const metadata = await readJSON(metaFile) as any;

    const [start, end, id] = /^(\d+)-(\d+)_(.*)$/.exec(match)?.slice(1) ?? [];
    res.send({
      id,
      start: parseInt(start, 10),
      end: parseInt(end, 10),
      takeCount: takes.length,
      path: path.join(project.paths.film, match),
      ...metadata
    });
  });

  app.use((req, res) => {
    res.send('404');
  })

  app.listen(3000, () => {
    info('Server listening on port 3000');
  });
}