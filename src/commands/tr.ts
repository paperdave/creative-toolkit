import path from 'path';
import { copyFile, unlink } from 'fs/promises';
import type { Command } from '..';
import { RenderCompCommand } from './r';
import { RenderProgram } from '../project';
import { exists } from '../util/fs';

export const ThumbnailRenderCommand: Command = {
  usage: 'ct tr',
  desc: 'thumbnail render',
  async run({ project, ...etc }) {
    await RenderCompCommand.run({ ...etc, project, argv: { _: ['thumbnail'] } });

    const thumb = path.join(project.root, `${project.id}.png`);

    if (await exists(thumb)) {
      await unlink(thumb);
    }

    await copyFile(
      path.join(project.getRenderFullPath(RenderProgram.Fusion, 'thumbnail'), '0000.png'),
      thumb
    );
  },
};
