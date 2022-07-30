import path from 'path';
import { readdir } from 'fs/promises';
import { Composition } from '../bmfusion/composition';
import { BoolNum, FormatID } from '../bmfusion/enum';
import { SaverTool } from '../bmfusion/tool/saver';
import { Command } from '../cmd';
import { RenderProgram } from '../project';
import { info, warn } from '@paperdave/logger';

export const ArrangeCommand = new Command({
  usage: 'ct a',
  desc: 'arrange',
  async run({ project }) {
    await project.writeJSON();

    const comps = (await readdir(project.paths.comps))
      .filter(filename => filename.endsWith('.comp'))
      .map(filename => Composition.fromFile(path.join(project.paths.comps, filename)));

    const longestNum = comps
      .flatMap(comp => comp.RenderRange)
      .reduce((acc, curr) => Math.max(acc, curr));

    const newFilenames: any[] = [];

    for (const comp of comps) {
      const originalName = path.basename(comp.filepath!);
      const label = originalName.replace(/^[0-9]+-[0-9]+_|.comp$/g, '');
      const prefix = comp.RenderRange.map(x =>
        x.toString().padStart(longestNum.toString().length, '0')
      ).join('-');
      const filename = label === 'thumbnail' ? 'thumbnail.comp' : `${prefix}_${label}.comp`;

      if (label !== 'thumbnail') {
        newFilenames.push({
          prefix,
          filename,
          label,
        });
      }

      const saver = comp.Tools.get('MainOutput', SaverTool);
      if (saver) {
        if (saver.Type !== 'Saver') {
          warn(`${filename} has something named \`MainOutput\` that is not a Saver.`);
        }

        const renderId = project.getRenderId(RenderProgram.Fusion, label);

        saver.Clip.Filename = `${project.paths.render}/${renderId}/.png`;
        saver.Clip.FormatID = FormatID.PNG;
        saver.CreateDir = BoolNum.True;
        saver.OutputFormat = FormatID.PNG;
      }

      if (filename !== 'thumbnail.comp') {
        if (project.hasAudio) {
          comp.AudioFilename = project.paths.audio;
          comp.AudioOffset = 0;
        }
      }

      if (comp.dirty) {
        info('modifying comp: ' + label);
      }

      comp.writeAndMoveFile(path.join(project.paths.comps, filename));
    }

    info();

    comps
      .filter(x => !x.filepath!.endsWith('thumbnail.comp'))
      .forEach((comp, i) => {
        const { label } = newFilenames[i];
        const saver = !!comp.Tools.has('MainOutput');

        info(
          `[${i}] ${label} - frames ${comp.RenderRange.join('-')} - ${comp.Tools.length} Tools${
            saver ? '' : ' [MISSING SAVER]'
          }`
        );
      });
  },
});
