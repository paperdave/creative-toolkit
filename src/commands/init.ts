import { paramCase } from 'change-case';
import { mkdir } from 'fs/promises';
import { ArrangeCommand } from './a';
import { Composition } from '../bmfusion/composition';
import { SaverTool } from '../bmfusion/tool/saver';
import type { Command } from '../index';
import { Project } from '../project';

export const InitCommand: Command = {
  usage: 'ct init',
  desc: 'setup project structure.',
  async run({ project: existingProject, pathOverrides, ...etc }) {
    if (existingProject) {
      console.log(`Project already exists: ${existingProject.name}`);
      return;
    }

    const root = process.cwd();

    console.log('generating project at: ' + root);
    console.log("if this isn't ok press Ctrl+C");
    console.log('');

    const name = prompt('name:')!;
    const autoGenId = paramCase(name);
    const id = prompt(`id:`, autoGenId)!;
    console.log('');

    const date = new Date();
    const today = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map(x => x.toString().padStart(2, '0'))
      .join('-');

    const project = new Project(
      root,
      {
        id,
        name,
        dates: [[today, 'Project Start']],
      },
      pathOverrides
    );
    await project.writeJSON();

    await mkdir('./comps');

    const thumbnailComp = Composition.create();
    const saver = new SaverTool(/* lua */ `Saver {
      NameSet = true,
      Inputs = {
        ProcessWhenBlendIs00 = Input { Value = 0, },
        Clip = Input {
          Value = Clip {
            Filename = "/../UNSET",
            FormatID = "PNGFormat",
            Length = 0,
            Saving = true,
            TrimIn = 0,
            ExtendFirst = 0,
            ExtendLast = 0,
            Loop = 1,
            AspectMode = 0,
            Depth = 0,
            TimeCode = 0,
            GlobalStart = -2000000000,
            GlobalEnd = 0
          },
        },
        OutputFormat = Input { Value = FuID { "PNGFormat" }, },
      },
      ViewInfo = OperatorInfo { Pos = { 829, 249 } },
    }`);
    thumbnailComp.Tools.set('MainOutput', saver);

    const firstComp = thumbnailComp.clone();

    thumbnailComp.RenderRange = [0, 0];
    thumbnailComp.GlobalRange = [0, 0];
    thumbnailComp.writeAndMoveFile('./comps/thumbnail.comp');

    firstComp.writeAndMoveFile('./comps/first.comp');

    await ArrangeCommand.run({
      project,
      pathOverrides,
      ...etc,
    });
  },
};
