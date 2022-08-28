import path from 'path';
import { Logger } from '@paperdave/logger';
import { pathExists } from '@paperdave/utils';
import { mkdir, readdir } from 'fs/promises';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { runFFMpeg } from '../util/ffmpeg-progress';

export const FilmExtractCommand = new Command({
  usage: 'ct film-extract [<id> <take>]',
  desc: 'extract filmed stuff',
  async run({ project, argList }) {
    const id = argList[0];
    const take = parseInt(argList[1], 10);

    if (!id) {
      Logger.error('usage: ct film-extract <id> <take>');
      return;
    }
    if (!take || isNaN(take)) {
      Logger.error('usage: ct film-extract <id> <take>');
      return;
    }

    const ids = await readdir(project.paths.film);
    const foundId = ids.find(findId => /^\d+-\d+_(.*)$/.exec(findId)![1] === id);
    if (!foundId) {
      Logger.error(`Could not find id: ${id}`);
      return;
    }

    const [start, end] = foundId
      .split('_')[0]
      .split('-')
      .map(x => parseInt(x, 10));

    const takePath = path.join(project.paths.film, foundId, `take${take}.mp4`);
    if (!(await pathExists(takePath))) {
      Logger.error(`Could not find take #${take} for id ${id}`);
      return;
    }

    const storePath = project.getRenderFullPath(RenderProgram.CTFilm, id, `T${take}`);

    await mkdir(storePath, { recursive: true });

    await runFFMpeg(
      project,
      ['-i', takePath, '-start_number', `${start}`, path.join(storePath, '%d.png')],
      {
        text: `Extracting ${id} take #${take}`,
        durationFrames: end - start + 1,
      }
    );
  },
});
