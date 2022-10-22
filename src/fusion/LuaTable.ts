// fusion format stuff
// fusion files are lua files that contain just a table. it works similar to json, but lets you do some more stuff
// this file is a mini library that lets you do stuff with fusion files without wanting to kill yourself.

import type * as AST from "luaparse";
import type { Class } from "@paperdave/utils";
import { parse } from "luaparse";

interface NodeWithDirty {
  dirty?: boolean;
}

/** Converts a LUA AST to a JSON object. Not all LUA ASTs are supported. */
export function astToJSON(t: AST.Node): any {
  switch (t.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "VarargLiteral":
    case "NilLiteral":
    case "BooleanLiteral":
      return t.value;
    case "Identifier":
      return t.name;
    case "TableCallExpression": {
      const x = astToJSON(t.arguments);
      x._type = astToJSON(t.base);
      return x;
    }
    case "TableConstructorExpression": {
      const x: any = t.fields.some((y) => y.type === "TableValue") ? [] : {};
      t.fields.forEach((field, i) => {
        x["key" in field ? (astToJSON(field.key) as string) : i] = astToJSON(
          field.value
        );
      });
      return x;
    }
    case "CallExpression": {
      return {
        func: astToJSON(t.base),
        args: t.arguments.map((x) => astToJSON(x)),
      };
    }
    case "UnaryExpression": {
      const x = astToJSON(t.argument);
      switch (t.operator) {
        case "-":
          return -x;
        default:
          throw new Error(`unhandled operator ${t.operator}`);
      }
    }
    default:
      throw new Error(`unhandled type ${t.type}`);
  }
}

/** Converts a JSON-like object to a LUA AST Expression. */
export function jsonToAST(x: any): AST.Expression {
  if (x instanceof LuaTable) {
    return (x as any).root;
  } else if (typeof x === "string") {
    return {
      type: "StringLiteral",
      value: x,
      raw: x,
    };
  } else if (typeof x === "number") {
    return {
      type: "NumericLiteral",
      value: x,
      raw: x.toString(),
    };
  } else if (typeof x === "boolean") {
    return {
      type: "BooleanLiteral",
      value: x,
      raw: x.toString(),
    };
  } else if (x === null || x === undefined) {
    return {
      type: "NilLiteral",
      value: null,
      raw: "nil",
    };
  } else if (Array.isArray(x)) {
    return {
      type: "TableConstructorExpression",
      fields: x.map((y) => ({
        type: "TableValue",
        value: jsonToAST(y),
      })),
    };
  } else if (typeof x === "object") {
    return {
      type: "TableConstructorExpression",
      fields: Object.entries(x).map(([k, v]) => ({
        type: "TableValue",
        value: jsonToAST(v),
        key: {
          type: "StringLiteral",
          value: k,
        },
      })),
    };
  }
  throw new Error(`unhandled type ${typeof x}`);
}

/** Converts a LUA ast to a string. */
export function astToString(t: AST.Node): string {
  switch (t.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return JSON.stringify(t.value);
    case "NilLiteral":
      return "nil";
    case "Identifier":
      return t.name;
    case "TableCallExpression":
      return `${astToString(t.base)} ${astToString(t.arguments)}`;
    case "TableConstructorExpression": {
      if (t.fields.length === 0) {
        return "{}";
      }
      let multiline = true;
      if (
        t.fields.length < 5 &&
        t.fields.every((x) => x.type === "TableValue") &&
        t.fields.every((x) => x.value.type.includes("Literal"))
      ) {
        multiline = false;
      }
      if (multiline) {
        return `{\n${t.fields
          .map((x) => `\t${astToString(x).replace(/\n/g, "\n\t")},\n`)
          .join("")}}`;
      }
      return `{ ${t.fields
        .map((x) => `${astToString(x).replace(/\n/g, "\t")}`)
        .join(", ")} }`;
    }
    case "CallExpression":
      return `${astToString(t.base)}(${t.arguments
        .map((x) => astToString(x))
        .join(",")})`;
    case "UnaryExpression":
      return `${t.operator}${astToString(t.argument)}`;
    case "TableKeyString":
    case "TableKey": {
      const k = astToString(t.key);
      return `${t.key.type === "Identifier" ? k : `[${k}]`} = ${astToString(
        t.value
      )}`;
    }
    case "TableValue":
      return astToString(t.value);
    case "MemberExpression":
      return `${astToString(t.base)}${t.indexer}${astToString(t.identifier)}`;
    default:
      throw new Error(`unhandled type ${t.type}`);
  }
}

function getOnTable(t: AST.TableConstructorExpression, key: string | number) {
  if (typeof key === "number") {
    return t.fields.filter((x) => x.type === "TableValue")[key]?.value;
  }
  return t.fields.find((x) => "key" in x && astToJSON(x.key) === key)?.value;
}

function hasOnTable(t: AST.TableConstructorExpression, key: string | number) {
  if (typeof key === "number") {
    return t.fields.filter((x) => x.type === "TableValue").length > key;
  }
  return t.fields.some((x) => "key" in x && astToJSON(x.key) === key);
}

export type LuaTableResolvable =
  | string
  | AST.TableConstructorExpression
  | AST.TableCallExpression
  | LuaTable;

export function isTableResolvable(data: any): data is LuaTableResolvable {
  return (
    typeof data === "string" ||
    data instanceof LuaTable ||
    (typeof data === "object" &&
      data != null &&
      "type" in data &&
      (data.type === "TableConstructorExpression" ||
        data.type === "TableCallExpression"))
  );
}

function tableNodeIsDirty(table: AST.TableConstructorExpression): boolean {
  if ((table as NodeWithDirty).dirty) {
    return true;
  }
  return table.fields.some((field) => {
    if (field.value.type === "TableConstructorExpression") {
      return tableNodeIsDirty(field.value);
    } else if (field.value.type === "TableCallExpression") {
      return tableNodeIsDirty(
        field.value.arguments as AST.TableConstructorExpression
      );
    }
    return false;
  });
}

function tableNodeClearDirty(table: AST.TableConstructorExpression) {
  delete (table as NodeWithDirty).dirty;
  for (const { value } of table.fields) {
    if (value.type === "TableConstructorExpression") {
      tableNodeClearDirty(value);
    } else if (value.type === "TableCallExpression") {
      tableNodeClearDirty(value.arguments as AST.TableConstructorExpression);
    }
  }
}

function astNodesEqual(a: AST.Node, b: AST.Node): boolean {
  if (a === b) {
    return true;
  }
  if (a.type !== b.type) {
    return false;
  }

  return (
    //
    (a.type === "Identifier" && a.name === (b as AST.Identifier).name) ||
    //
    (a.type.endsWith("Literal") &&
      (a as AST.StringLiteral).value === (b as AST.StringLiteral).value) ||
    //
    (a.type === "TableCallExpression" &&
      astNodesEqual(a.base, (b as AST.TableCallExpression).base) &&
      astNodesEqual(a.arguments, (b as AST.TableCallExpression).arguments)) ||
    //
    (a.type === "TableConstructorExpression" &&
      a.fields.every((field, i) =>
        astNodesEqual(field, (b as AST.TableConstructorExpression).fields[i])
      )) ||
    //
    ((a.type === "TableKey" || a.type === "TableKeyString") &&
      astNodesEqual(a.key, (b as AST.TableKey).key) &&
      astNodesEqual(a.value, (b as AST.TableKey).value)) ||
    //
    (a.type === "TableValue" &&
      astNodesEqual(a.value, (b as AST.TableKey).value))
  );
}

/** Abstraction on top of a LUA Table AST, similar to a Map. */
export class LuaTable {
  protected root: AST.TableConstructorExpression | AST.TableCallExpression;
  protected table: AST.TableConstructorExpression;

  constructor(data?: LuaTableResolvable) {
    if (typeof data === "string") {
      const root = parse("__value__=" + data.replace(/\0$/, ""), {
        // TODO: switch to none but then fix the .value === null by parsing the string ourselves
        encodingMode: "x-user-defined",
      });
      this.root = (root.body[0] as AST.AssignmentStatement).init[0] as
        | AST.TableConstructorExpression
        | AST.TableCallExpression;
    } else if (data instanceof LuaTable) {
      this.root = data.root;
    } else if (data) {
      this.root = data;
    } else {
      this.root = {
        type: "TableConstructorExpression",
        fields: [],
      };
    }
    this.table =
      this.root.type === "TableCallExpression"
        ? (this.root.arguments as AST.TableConstructorExpression)
        : this.root;
  }

  keys(): Array<string | number> {
    return this.table.fields
      .filter((x) => "key" in x)
      .map((x, i) => ("key" in x ? astToJSON(x.key) : i));
  }

  has(key: string | number) {
    return hasOnTable(this.table, key);
  }

  get<X = any>(key: string | number, as?: Class<X>): X {
    const value = getOnTable(this.table, key);
    if (!value) {
      return undefined as any;
    }
    if (
      value.type === "TableCallExpression" ||
      value.type === "TableConstructorExpression"
    ) {
      return new (as ?? LuaTable)(value) as any;
    }
    return astToJSON(value);
  }

  set(key: string, value: unknown, noDirty?: boolean) {
    const field = this.table.fields.find(
      (x) => "key" in x && astToJSON(x.key) === key
    );
    if (!field) {
      this.table.fields.push({
        type: "TableKey",
        value: jsonToAST(value),
        key: {
          type: "Identifier",
          name: key,
        },
      });
      if (!noDirty) {
        this.dirty = true;
      }
    } else {
      const newAst = jsonToAST(value);
      if (!astNodesEqual(newAst, field.value)) {
        if (!noDirty) {
          this.dirty = true;
        }
        field.value = newAst;
      }
    }
  }

  toArray(): any[] {
    return this.table.fields
      .filter((x) => x.type === "TableValue")
      .map((x) => astToJSON(x.value));
  }

  toString(): string {
    return astToString(this.root);
  }

  unmarkDirty() {
    tableNodeClearDirty(this.table);
  }

  get dirty() {
    return tableNodeIsDirty(this.table);
  }

  set dirty(v: boolean) {
    if (v) {
      (this.table as NodeWithDirty).dirty = true;
    } else {
      this.unmarkDirty();
    }
  }

  get length() {
    return this.keys().length;
  }

  clone(): this {
    return new (this.constructor as any)(this.toString());
  }

  [Symbol.for("nodejs.util.inspect.custom")](
    depth: number,
    options: any,
    inspect: any
  ) {
    const name = (this.root as any)?.base?.name || "";
    const constructor =
      this.constructor.name === LuaTable.name
        ? "LuaTable"
        : this.constructor.name;
    const type = options.stylize(
      `[${constructor}${name ? " " + name : ""}]`,
      "special"
    );

    if (depth < 0) {
      return type;
    }

    const newOptions = {
      ...options,
      depth: options.depth === null ? null : options.depth - 1,
    };

    let inner = this.keys()
      .map((key) => {
        const value = this.get(key);
        return `  ${key}: ${inspect(value, newOptions).replace(
          /\n/g,
          `\n  `
        )},`;
      })
      .join("\n")
      .slice(0, -1);
    inner = `\n${inner}\n`.replace(/^\n\n$/, "");

    if (this.table.fields.length === 1) {
      inner = inner.slice(2, -1) + " ";
    }

    return `${type} {${inner}}`;
  }
}

export class TableOf<T extends LuaTable> extends LuaTable {
  constructor(private readonly childClass: Class<T>, data: LuaTableResolvable) {
    super(data);
  }

  get<X = T>(key: string | number, as?: Class<X>): X {
    const value = super.get(key);
    if (!value) {
      return undefined!;
    }
    return new (as ?? this.childClass)(value) as any;
  }

  set(key: string, value: T | LuaTable) {
    super.set(key, value);
  }

  toArray(): T[] {
    return this.keys().map((key) => this.get(key)!);
  }
}
