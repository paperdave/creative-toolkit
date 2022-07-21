import { TableCallExpression, TableConstructorExpression } from "luaparse";
import { jsonToAST, LuaTable } from "./lua-table";

export class FuId<T> extends LuaTable {
  static from<T>(value: T): FuId<T> {
    const input = new FuId<T>(`FuId { "" }`);
    input.value = value;
    return input;
  }
  get value() {
    return this.get<T>(0);
  }
  set value(id: T) {
    (
      (this.root as TableCallExpression).arguments as TableConstructorExpression
    ).fields[0].value = jsonToAST(id);
  }
}
