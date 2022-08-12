import { paramCase } from 'change-case';
import { mkdir } from 'fs/promises';
import { ArrangeCommand } from './a';
import { Composition } from '../bmfusion/composition';
import { SaverTool } from '../bmfusion/tool/saver';
import { Command } from '../cmd';
import { Project } from '../project';
import { error, info } from '@paperdave/logger';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

export const InitCommand = new Command({
  usage: 'ct init',
  desc: 'setup project structure.',
  async run({ project: existingProject }) {
    if (existingProject) {
      error(`Project already exists: ${existingProject.name}`);
      return;
    }

    const root = process.cwd();

    info('generating project at: ' + root);
    info("if this isn't ok press Ctrl+C");
    info('');

    const prompt = (await import('prompts')).default;
    const { name } = await prompt({
      message: 'name:',
      type: 'text',
      name: 'name',
    });
    if (!name) {return;}
    const autoGenId = paramCase(name);
    const {id} = await prompt({
      message: 'id:',
      type: 'text',
      name: 'id',
      initial: autoGenId,
    });
    info('');

    const date = new Date();
    const today = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map(x => x.toString().padStart(2, '0'))
      .join('-');

    const project = new Project(
      root,
      {
        id,
        name,
        audioTiming: {
          bpm: 120,
        },
        dates: [[today, 'Project Start']],
        format: 1,
      },
      {}
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

    if(!existsSync(path.join(root, '.bitwig-project'))) {
      writeFileSync(path.join(root, '.bitwig-project'), '');
    }

    await ArrangeCommand.run({
      project,
    });
  },
});
