import { Static, TSchema, Type } from '@sinclair/typebox';

export function Nullable<T extends TSchema>(schema: T) {
  return Type.Unsafe<Static<T> | null>({ ...schema, nullable: true });
}

export function schemaOf<T>(t: T): TSchema & { static: T } {
  if (typeof t === 'string') {
    return Type.String({ default: t }) as any;
  } else if (typeof t === 'number') {
    return Type.Number({ default: t }) as any;
  } else if (typeof t === 'boolean') {
    return Type.Boolean({ default: t }) as any;
  } else if (Array.isArray(t)) {
    const schemas = t.map(schemaOf);
    return Type.Array(Type.Union(schemas)) as any;
  } else if (typeof t === 'object') {
    const schema = Object.fromEntries(
      Object.entries(t as any).map(([key, value]) => [key, schemaOf(value)])
    ) as any;
    return Type.Object(schema) as any;
  }
  throw new Error('Unsupported type');
}
