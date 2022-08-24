import path from 'path';
import { spawnSync } from 'child_process';
import { readdir } from 'fs/promises';
import { Command } from '../cmd';

export const FusionCommand = new Command({
  usage: 'ct f [...args]',
  desc: 'runs fusion, will resolve compname for you',
  async run({ project, argList }) {
    const compAliases = Object.fromEntries(
      (await readdir(project.paths.comps))
        .filter(filename => filename.endsWith('.comp'))
        .map(filename => [
          filename.replace(/^[0-9]+-[0-9]+_|.comp$/g, ''),
          path.join(project.paths.comps, filename),
        ])
    );

    spawnSync(
      project.paths.execFusion,
      argList.map(arg => compAliases[arg] ?? arg)
    );
  },
});
