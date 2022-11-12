import { chalk, Logger } from '@paperdave/logger';

export const hint = new Logger(`${chalk.yellowBright('hint')}${chalk.reset.black(':')}`, {
  color: undefined,
});
