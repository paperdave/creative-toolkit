import minimist from 'minimist';
import type { Project } from './project';

export interface CommandContext {
  project: Project;
  args: minimist.ParsedArgs;
  argList: string[];
}

export interface CommandOptions<T> {
  usage: string;
  desc: string;
  flags?: Array<{ name: string; desc: string }>;
  arrangeFirst?: boolean;
  run(args: CommandContext): Promise<T>;
}

export interface CommandRunOptions {
  project: Project;
  args?: string | string[];
}

export class Command<T = any> {
  usage: string;
  desc: string;
  flags?: Array<{ name: string; desc: string }>;
  arrangeFirst?: boolean;
  #handler: (args: CommandContext) => Promise<T>;

  constructor(options: CommandOptions<T>) {
    this.usage = options.usage;
    this.desc = options.desc;
    this.flags = options.flags;
    this.arrangeFirst = options.arrangeFirst;
    this.#handler = options.run;
  }

  async run(options: CommandRunOptions): Promise<T> {
    const argList = Array.isArray(options.args) ? options.args : options.args?.split(' ') ?? [];
    return await this.#handler({
      project: options.project,
      args: minimist(argList),
      argList,
    });
  }
}
