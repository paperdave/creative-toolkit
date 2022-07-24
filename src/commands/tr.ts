import path from 'path';
import { unlink } from 'fs/promises';
import type { Command } from '..';
import { RenderCompCommand } from './r';
import { RenderProgram } from '../project';
import { exists } from '../util/fs';

export const ThumbnailRenderCommand: Command = {
  usage: 'ct tr',
  desc: 'thumbnail render',
  async run({ project, ...etc }) {
    await RenderCompCommand.run({ ...etc, project, args: { _: ['thumbnail'] } });

    const thumb = path.join(project.root, `${project.id}.png`);

    if (await exists(thumb)) {
      await unlink(thumb);
    }

    const src = path.join(project.getRenderFullPath(RenderProgram.Fusion, 'thumbnail'), '0000.png');
    Bun.write(Bun.file(thumb), Bun.file(src));
  },
};
