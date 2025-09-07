import { Container, SqlParameter } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";

type FieldsFromSchema<T extends z.ZodObject<any>> = {
  [K in keyof z.infer<T>]: { name: string };
};

class Model<T extends ZodObject<any>> {
  private _schema: T;
  private _collection: Container;
  public fields: FieldsFromSchema<T>;

  constructor(schema: T, collection: Container) {
    this._schema = schema;
    this._collection = collection;
    this.fields = this.defineModel(schema);

    Object.keys(this.fields).forEach((key) => {
      Object.defineProperty(this, key, {
        get: () => this.fields[key as keyof z.infer<T>],
        enumerable: true,
      });
    });
  }

  // private defineModel<S extends z.ZodObject<any>>(schema: S) {
  //   const fields = Object.keys(schema.shape).reduce((acc, key) => {
  //     acc[key as keyof z.infer<S>] = { name: key } as any;
  //     return acc;
  //   }, {} as FieldsFromSchema<S>);

  //   return fields;
  // }

  private defineModel<S extends z.ZodObject<any>>(
    schema: S,
    prefix = ""
  ): FieldsFromSchema<S> {
    const fields = Object.keys(schema.shape).reduce((acc, key) => {
      const fieldSchema = schema.shape[key];

      const fullName = prefix ? `${prefix}.${key}` : key;

      if (fieldSchema instanceof z.ZodObject) {
        acc[key as keyof z.infer<S>] = {
          name: fullName,
          ...(this.defineModel(fieldSchema, fullName) as any),
        };
      } else {
        acc[key as keyof z.infer<S>] = { name: fullName } as any;
      }

      return acc;
    }, {} as FieldsFromSchema<S>);

    return fields;
  }

  async insert(doc: z.infer<T>): Promise<z.infer<T> | null> {
    try {
      const validatedDoc = this._schema.safeParse(doc);
      if (!validatedDoc.success) {
        throw new Error(validatedDoc.error.message);
      }
      const { resource } = await this._collection.items.create(
        validatedDoc.data
      );
      return resource as z.infer<T>;
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async insertMany(docs: z.infer<T>[]): Promise<z.infer<T>[]> {
    try {
      const validatedDocs = this._schema.array().safeParse(docs);
      if (!validatedDocs.success) {
        throw new Error(validatedDocs.error.message);
      }

      const resources: z.infer<T>[] = await Promise.all(
        docs.map(async (doc) => {
          const { resource } = await this._collection.items.create(
            doc as z.infer<T>
          );
          return resource as z.infer<T>;
        })
      );

      return resources;
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async findById(
    id: string,
    partitionKey: string = id
  ): Promise<z.infer<T> | null> {
    try {
      const { resource } = await this._collection.item(id, partitionKey).read();

      if (!resource) {
        return null;
      }
      return resource;
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async find({
    filter,
    fields,
    limit = 100,
    offset = 0,
    orderBy,
  }: {
    filter?: QB;
    fields?: FieldsFromSchema<T>;
    limit?: number;
    offset?: number;
    orderBy?: string;
  }): Promise<{ resources: z.infer<T>[] } | null> {
    try {
      const projection = fields
        ? Object.entries(fields)
            .map(([alias, col]) => `c.${col.name} AS ${alias}`)
            .join(", ")
        : "*";

      const built = filter?.build();

      const whereSql = built?.query ? ` WHERE ${built.query}` : "";
      let parameters: SqlParameter[] | undefined = built?.params;

      const querySpec =
        parameters && parameters.length
          ? {
              query: `SELECT ${projection} FROM c${whereSql} ${
                orderBy ? orderBy : ""
              } OFFSET ${offset} LIMIT ${limit} `,
              parameters,
            }
          : {
              query: `SELECT ${projection} FROM c${whereSql} ${
                orderBy ? orderBy : ""
              } OFFSET ${offset} LIMIT ${limit} `,
            };

      console.log("querySpec: ", querySpec);

      const iterator = this._collection.items.query(querySpec);

      const { resources } = await iterator.fetchAll();

      if (!resources || !resources.length) {
        return { resources: [] };
      }

      return { resources: resources as z.infer<T>[] };
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async updateById({
    doc,
    id,
    partitionKey = id,
  }: {
    doc: z.infer<T>;
    id: string;
    partitionKey: string;
  }): Promise<z.infer<T> | null> {
    if (!doc) {
      throw new Error("Nothing To Update");
    }
    try {
      const { resource: existingDoc } = await this._collection
        .item(id, partitionKey)
        .read();
      if (!existingDoc) {
        throw new Error("Document not found");
      }

      if (typeof existingDoc === "object" && existingDoc !== null) {
        const mergedDoc = { ...existingDoc, ...doc };

        const validatedDoc = this._schema.safeParse(mergedDoc);
        if (!validatedDoc.success) {
          throw new Error(validatedDoc.error.message);
        }

        const { resource } = await this._collection
          .item(id, partitionKey)
          .replace(validatedDoc.data);

        return resource as z.infer<T>;
      }

      throw new Error("Cannot merge non-object types");
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async update({
    doc,
    filter,
  }: {
    doc: z.infer<T>;
    filter: QB;
  }): Promise<z.infer<T>[]> {
    if (!doc) {
      throw new Error("Nothing To Update");
    }

    if (!filter) {
      throw new Error("Filter is required");
    }
    try {
      const existingDocs = await this.find({ filter });

      if (!existingDocs?.resources.length) {
        throw new Error("Documents not found");
      }

      const mergedDocs = existingDocs.resources.map((edoc) => {
        if (typeof edoc === "object" && edoc !== null) {
          const mergedDoc = { ...edoc, ...doc };
          return mergedDoc;
        }
        throw new Error("Cannot merge non-object types");
      });

      const validatedDocs = this._schema.array().safeParse(mergedDocs);
      if (!validatedDocs.success) {
        throw new Error(validatedDocs.error.message);
      }

      const updatedDocs = await Promise.all(
        validatedDocs.data.map(async (doc) => {
          const { resource } = await this._collection
            .item(
              (doc.id || "").toString(),
              (doc.partitionKey || doc.id || "").toString()
            )
            .replace(doc);
          return resource;
        })
      );

      return updatedDocs as z.infer<T>[];
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async count({
    filter,
    field,
  }: { filter?: QB; field?: { name: string } } = {}): Promise<number> {
    try {
      const countField = field ? `c.${field.name}` : "1";
      if (filter) {
        const built = filter.build();
        const whereSql = built?.query ? ` WHERE ${built.query}` : "";
        let parameters: SqlParameter[] | undefined = built?.params;

        const querySpec =
          parameters && parameters.length
            ? {
                query: `SELECT VALUE COUNT(${countField}) FROM c${whereSql}`,
                parameters,
              }
            : { query: `SELECT VALUE COUNT(${countField}) FROM c${whereSql}` };

        const { resources } = await this._collection.items
          .query(querySpec)
          .fetchAll();
        return resources[0] || 0;
      }
      const { resources } = await this._collection.items
        .query(`SELECT VALUE COUNT(${countField}) FROM c`)
        .fetchAll();

      return resources[0] || 0;
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }

  async deleteById(id: string, partitionKey: string = id): Promise<Boolean> {
    try {
      await this._collection.item(id, partitionKey).delete();
      return true;
    } catch (error: any) {
      console.log("error", error);
      throw error;
    }
  }
}

export { Model };
