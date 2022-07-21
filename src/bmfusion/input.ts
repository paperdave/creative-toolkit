import { Class } from "@davecode/types";
import { LuaTable } from "./lua-table";

export class Input<T = any> extends LuaTable {
  static from<T>(value: T): Input<T> {
    const input = new Input<T>(`Input { Value = 0 }`);
    input.set("Value", value, true);
    return input;
  }
  get Value(): T {
    return this.get("Value");
  }
  set Value(value: T) {
    this.set("Value", value);
  }
  valueAs<C>(as: Class<C>) {
    return new as(this.Value);
  }
}
