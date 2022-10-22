import path from 'path';
import { copyFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { exists } from '../../../src/util/fs';

export const ThumbnailRenderCommand = new Command({
  usage: 'ct tr',
  desc: 'thumbnail render',
  async run({ project }) {
    // TODO FIX
    const thumb = path.join(project.root, `${project.id}.png`);

    if (await exists(thumb)) {
      await unlink(thumb);
    }

    const src = path.join(project.getRenderFullPath(RenderProgram.Fusion, 'thumbnail'), '0000.png');
    copyFileSync(src, thumb);
  },
});
