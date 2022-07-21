/* Creative Toolkit - by dave caruso */
import { Input } from "./input";
import { astToJSON, LuaTable, TableOf } from "./lua-table";

export class Tool extends LuaTable {
  get Type(): string {
    return astToJSON((this.root as any).base);
  }
  set Type(value: string) {
    (this.root as any).base = { type: "Identifier", name: value };
  }
  get Inputs() {
    return new TableOf(Input, this.get("Inputs")!);
  }
  get FlowX(): number {
    return this.get("ViewInfo").get("Pos").get(0);
  }
  set FlowX(value: number) {
    this.get("ViewInfo").get("Pos").set(0, value);
  }
  get FlowY(): number {
    return this.get("ViewInfo").get("Pos").get(1);
  }
  set FlowY(value: number) {
    this.get("ViewInfo").get("Pos").set(1, value);
  }
}
