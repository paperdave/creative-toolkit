import type { Paths } from './project';

export const PROJECT_FORMAT_VERSION = 1;

export interface ProjectJSON {
  id: string;
  name: string;
  dates: Array<[dateString: string, label: string]>;
  paths?: Partial<Paths>;
  format: 1;
}

export type ProjectJSONAnyVersion = ProjectJSON;

export function migrateProjectJSON(current: ProjectJSONAnyVersion): ProjectJSON {
  switch (current.format ?? 1) {
    case PROJECT_FORMAT_VERSION:
      return current;
    default: {
      const error = `Unsupported project format: ${current.format}. Please update Creative Toolkit`;
      console.error(error);
      process.exit(52);
      return null!; // unreachable, but ts complains if i dont return.
    }
  }
}