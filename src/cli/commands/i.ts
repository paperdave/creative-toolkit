import path from 'path';
import { RunCommand } from '$/cli';
import { RUNTIME_NAME, RUNTIME_VERSION, TOOLKIT_CODENAME, TOOLKIT_VERSION } from '$/constants';
import { chalk, Logger } from '@paperdave/logger';
import { range } from '@paperdave/utils';

export const run: RunCommand = async ({ project }) => {
  Logger.writeLine(chalk.bold.whiteBright('CREATIVE TOOLKIT:'));
  Logger.writeLine(chalk.yellowBright(`  version:    `) + TOOLKIT_VERSION);
  Logger.writeLine(chalk.yellowBright(`  codename:   `) + TOOLKIT_CODENAME);
  Logger.writeLine(chalk.yellowBright(`  runtime:    `) + RUNTIME_NAME + ' v' + RUNTIME_VERSION);

  Logger.writeLine(chalk.bold.whiteBright('PROJECT:'));
  Logger.writeLine(chalk.yellowBright(`  id:         `) + project.id);
  Logger.writeLine(chalk.yellowBright(`  name:       `) + project.name);
  Logger.writeLine(chalk.yellowBright(`  hasAudio:   `) + project.hasAudio);

  Logger.writeLine(chalk.bold.whiteBright('CLIPS:'));
  const clips = await project.getRawClips();
  const maxStep = Math.max(...clips.map(c => c.step));
  for (const step of range(1, maxStep + 1)) {
    const stepClips = clips.filter(c => c.step === step);
    const len = stepClips.length;
    Logger.writeLine(
      chalk.white(`  ${chalk.magentaBright(`STEP ${step}:`)} ${len} clip${len === 1 ? '' : 's'}`)
    );
  }
  if (maxStep < 0) {
    Logger.writeLine(chalk.dim.white(` (empty)`));
  }

  Logger.writeLine(chalk.bold.whiteBright('PATH MAP:'));
  const padding = Object.keys(project.paths).reduce((acc, key) => Math.max(acc, key.length), 0) + 1;
  Logger.writeLine(chalk.bold.cyan('  ' + 'project root:'.padEnd(padding) + ' ' + project.root));

  for (const [key, value] of Object.entries(project.paths)) {
    const dir = (path.dirname(value) + '/')
      .replace(/\/\//g, '/')
      .replace(project.root + '/', chalk.white('./'));
    Logger.writeLine(
      `  ${chalk.green((key + ':').padEnd(padding))} ${dir}${chalk.magentaBright(
        path.basename(value)
      )}`
    );
  }
};
