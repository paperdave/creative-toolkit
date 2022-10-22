import path from "path";
import { Awaitable, isRootDirectory } from "@paperdave/utils";

export async function walkUpDirectoryTree(
  startDir: string,
  filter: (dir: string) => Awaitable<boolean>
): Promise<string | null> {
  let dir = startDir;
  do {
    if (await filter(dir)) {
      return dir;
    }
    dir = path.dirname(dir);
  } while (!isRootDirectory(dir));
  return null;
}
