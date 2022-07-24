import path from 'path';
import { createPrompt } from 'bun-promptx';
import { exec } from 'bun-utilities';
import type { Command } from '..';
import { ArrangeCommand } from './a';
import { exists } from '../util/fs';

export const AudioFromFileCommand: Command = {
  usage: 'ct audio-from [file]',
  desc: 'sets project audio using file',
  async run({ project, argv, ...etc }) {
    const file = argv._[0];
    if (!file) {
      console.error('usage: ct audio-from [file]');
      return;
    }
    if (!(await exists(file))) {
      console.error(`file ${file} does not exist`);
      return;
    }

    if (await exists(project.paths.audio)) {
      const { value } = createPrompt('overwrite existing audio? [yN] ', {
        charLimit: 1,
        required: false,
      });
      if (value?.toLowerCase() !== 'y') {
        return;
      }
    }

    const result = exec([
      project.paths.execFFmpeg,
      '-i',
      file,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '44100',
      project.paths.audio,
    ]);
    if (!result.isExecuted) {
      console.error('failed to execute');
      return;
    }

    project.hasAudio = true;

    console.log(
      `Project audio set from ${file}, (${path.relative(project.root, project.paths.audio)})`
    );
    console.log();
    await ArrangeCommand.run({ ...etc, project, argv: { _: [] } });
  },
};
