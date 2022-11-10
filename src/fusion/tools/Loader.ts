import { TableOf } from "../LuaTable";
import { Clip } from "../structs/Clip";
import { Tool } from "../structs/Tool";

export class LoaderTool extends Tool {
  get Clips() {
    return new TableOf(Clip, this.get("Clips"));
  }
  set Clips(value: TableOf<Clip>) {
    this.set("Clips", value);
  }
}
