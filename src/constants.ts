import path from "path";
import { readJSONSync } from "@paperdave/utils";

export const TOOLKIT_VERSION = (
  readJSONSync(path.join(import.meta.dir, "../package.json"), {}) as any
).version;

export const TOOLKIT_DATE = TOOLKIT_VERSION.replaceAll(".", "-");
