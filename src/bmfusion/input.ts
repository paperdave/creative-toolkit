/* Creative Toolkit - by dave caruso */
import {
  isTableResolvable,
  jsonToAST,
  LuaTable,
  LuaTableResolvable,
} from "./lua-table";

export class Input<T = any> extends LuaTable {
  constructor(value: T) {
    let isResolved = isTableResolvable(value);
    super(isResolved ? (value as unknown as LuaTableResolvable) : undefined);
    if (!isResolved) {
      this.Value = value;
    }
  }
  get Value(): T {
    return this.get("Value");
  }
  set Value(value: T) {
    this.set("Value", value);
  }
}
