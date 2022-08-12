import path from 'path';
import { copyfile } from 'bun-utilities/fs';
import { unlink } from 'fs/promises';
import { RenderCompCommand } from './r';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { exists } from '../util/fs';

export const ThumbnailRenderCommand = new Command({
  usage: 'ct tr',
  desc: 'thumbnail render',
  async run({ project }) {
    await RenderCompCommand.run({ project, args: 'thumbnail' });

    const thumb = path.join(project.root, `${project.id}.png`);

    if (await exists(thumb)) {
      await unlink(thumb);
    }

    const src = path.join(project.getRenderFullPath(RenderProgram.Fusion, 'thumbnail'), '0000.png');
    copyfile(src, thumb);
  },
});
