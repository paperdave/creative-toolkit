import { Awaitable } from "@paperdave/utils";
import { Project } from "../project";

export interface CommandEvent {
  project: Project;
}

export type RunCommand = (event: CommandEvent) => Awaitable<void>;
