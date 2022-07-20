/* Creative Toolkit - by dave caruso */
import { jsonToAST, LuaTable } from "./lua-table";

export class Input<T = any> extends LuaTable {
  constructor(value: T) {
    super();
    this.Value = value;
  }
  get Value(): T {
    return this.get("Value");
  }
  set Value(value: T) {
    this.set("Value", value);
  }
}
