import path from 'path';
import { error, info } from '@paperdave/logger';
import { spawnSync } from 'child_process';
import { ArrangeCommand } from './a';
import { Command } from '../cmd';
import { exists } from '../util/fs';

export const AudioFromFileCommand = new Command({
  usage: 'ct audio-from <file>',
  desc: 'sets project audio using file',
  async run({ project, args }) {
    const file = args._[0];
    if (!file) {
      error('usage: ct audio-from [file]');
      return;
    }
    if (!(await exists(file))) {
      error(`file ${file} does not exist`);
      return;
    }

    if (await exists(project.paths.audio)) {
      const prompt = (await import('prompts')).default;
      const { value } = await prompt({
        type: 'confirm',
        message: 'overwrite existing audio?',
        name: 'value',
        initial: false,
      });
      if (value?.toLowerCase() !== 'y') {
        return;
      }
    }

    const result = spawnSync(project.paths.execFFmpeg, [
      '-i',
      file,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '44100',
      project.paths.audio,
    ]);
    if (result.status !== 0) {
      error(result.stderr.toString());
      return;
    }

    project.hasAudio = true;

    info(`Project audio set from ${file}, (${path.relative(project.root, project.paths.audio)})`);
    info();
    await ArrangeCommand.run({ project });
  },
});
