import { Awaitable } from '@paperdave/utils';
import { Project } from '../project';

export interface CommandEvent {
  project: Project;
}

export type CommandEventNoProject = { project?: Project } & Omit<CommandEvent, 'project'>;

export type RunCommand = (event: CommandEvent) => Awaitable<void>;
export type RunCommandNoProject = (event: CommandEventNoProject) => Awaitable<void>;
