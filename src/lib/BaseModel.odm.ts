import { Container, SqlParameter } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";
import { error } from "console";

type FieldsFromSchema<T extends z.ZodObject<any>> = {
  [K in keyof z.infer<T>]: { name: string };
};

type StandarOutput<T extends z.ZodObject<any>> = {
  resource?: z.infer<T> | null;
  resources?: z.infer<T>[] | [];
  count?: number | 0;
  deleted?: boolean | false;
  itemsUpdated?: number | 0;
  itemsFailed?: number | 0;
  error?: Error | Error[];
  success?: boolean;
  querySpec?: {
    query: string;
    parameters?: SqlParameter[];
  };
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

  private defineModel<S extends z.ZodObject<any>>(
    schema: S,
    prefix = "",
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

  async insert(doc: z.infer<T>): Promise<StandarOutput<T>> {
    try {
      const validatedDoc = this._schema.safeParse(doc);
      if (!validatedDoc.success) {
        throw new Error(validatedDoc.error.message);
      }
      const { resource } = await this._collection.items.create(
        validatedDoc.data,
      );
      return {
        resource: resource as z.infer<T>,
        count: 1,
        itemsUpdated: 1,
        success: true,
      };
    } catch (error: any) {
      return {
        resource: null,
        count: 0,
        itemsFailed: 1,
        error: error,
        success: false,
      };
    }
  }

  async insertMany(docs: z.infer<T>[]): Promise<StandarOutput<T>> {
    try {
      const validatedDocs = this._schema.array().safeParse(docs);
      if (!validatedDocs.success) {
        throw new Error(validatedDocs.error.message);
      }

      const resources: z.infer<T>[] = await Promise.all(
        docs.map(async (doc) => {
          const { resource } = await this._collection.items.create(
            doc as z.infer<T>,
          );
          return resource as z.infer<T>;
        }),
      );

      return {
        resources: resources,
        count: resources.length,
        itemsUpdated: resources.length,
        success: true,
      };
    } catch (error: any) {
      return {
        resources: [],
        count: 0,
        itemsFailed: docs.length,
        error: error,
        success: false,
      };
    }
  }

  async findById(id: string): Promise<StandarOutput<T>> {
    try {
      const query = `SELECT * FROM c WHERE c.id = @id`;
      const parameters: SqlParameter[] = [{ name: "@id", value: id }];

      const { resources } = await this._collection.items
        .query({
          query,
          parameters,
        })
        .fetchAll();

      if (!resources?.length) {
        return { resource: null };
      }
      return { resource: resources[0], count: 1, success: true };
    } catch (error: any) {
      return { resource: null, error: error, count: 0, success: false };
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
  }): Promise<StandarOutput<T>> {
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

      const iterator = this._collection.items.query(querySpec);

      const { resources } = await iterator.fetchAll();

      return {
        resources: resources as z.infer<T>[],
        count: resources.length,
        querySpec,
        success: true,
      };
    } catch (error: any) {
      return { resources: [], error: error, count: 0, success: false };
    }
  }

  async findOne({
    filter,
    fields,
    orderBy,
  }: {
    filter?: QB;
    fields?: FieldsFromSchema<T>;
    orderBy?: string;
  }): Promise<StandarOutput<T>> {
    try {
      const { resources } = await this.find({
        filter: filter!,
        fields: fields!,
        orderBy: orderBy!,
        limit: 1,
      });

      if (!resources || resources?.length === 0) {
        return { resource: null, count: 0, success: true };
      }

      return {
        resource: resources[0] as z.infer<T>,
        count: 1,
        success: true,
      };
    } catch (error: any) {
      return { resource: null, error: error, count: 0, success: false };
    }
  }

  async updateById({
    doc,
    id,
  }: {
    doc: z.infer<T>;
    id: string;
  }): Promise<StandarOutput<T>> {
    if (!doc) {
      throw new Error("Nothing To Update");
    }
    try {
      const { resource: existingDoc } = await this.findById(id);
      if (!existingDoc) {
        throw new Error("Document not found");
      }

      if (typeof existingDoc === "object" && existingDoc !== null) {
        const mergedDoc = { ...existingDoc, ...doc };

        const { resource } = await this._collection.items.upsert(mergedDoc);

        return {
          resource: resource as z.infer<T>,
          itemsUpdated: 1,
          count: 1,
          success: true,
        };
      }

      throw new Error("Cannot merge non-object types");
    } catch (error: any) {
      return {
        resource: null,
        error: error,
        itemsFailed: 1,
        count: 0,
        success: false,
      };
    }
  }

  async update({
    doc,
    filter,
  }: {
    doc: z.infer<T>;
    filter: QB;
  }): Promise<StandarOutput<T>> {
    if (!doc) {
      throw new Error("Nothing To Update");
    }

    if (!filter) {
      throw new Error("Filter is required");
    }
    try {
      const { resources: existingDocs } = await this.find({ filter });

      if (!existingDocs?.length) {
        throw new Error("Documents not found");
      }

      const mergedDocs = existingDocs.map((edoc) => {
        if (typeof edoc === "object" && edoc !== null) {
          const mergedDoc = { ...edoc, ...doc };
          return mergedDoc;
        }
        throw new Error("Cannot merge non-object types");
      });

      let itemsUpdated = 0;
      let updateFailed = 0;
      let errorStack: Error[] = [];

      const updatedDocs = await Promise.all(
        mergedDocs.map(async (doc) => {
          try {
            const { resource } = await this._collection.items.upsert(doc);
            itemsUpdated++;
            return resource;
          } catch (error: any) {
            updateFailed++;
            errorStack.push(error);
          }
        }),
      );

      return {
        resources: updatedDocs as z.infer<T>[],
        itemsUpdated,
        itemsFailed: updateFailed,
        count: itemsUpdated,
        error: errorStack,
        success: true,
      };
    } catch (error: any) {
      return {
        resources: [],
        count: 0,
        error: error,
        itemsFailed: 1,
        success: false,
      };
    }
  }

  async upsertOne({
    doc,
    filter,
  }: {
    doc: z.infer<T>;
    filter: QB;
  }): Promise<StandarOutput<T>> {
    try {
      const { resources: existingDocs } = await this.find({ filter });
      let data;
      if (!existingDocs || existingDocs.length === 0) {
        data = await this.insert(doc);
      } else {
        data = await this.update({ doc, filter });
      }

      let response;

      if (data.resource) response = data.resource;
      else {
        if (data.resources && data.resources.length > 0)
          response = data.resources[0];
        else response = null;
      }

      return {
        resource: response as z.infer<T>,
        count: 0,
        itemsFailed: 0,
        success: true,
      };
    } catch (error: any) {
      return {
        resources: [],
        count: 0,
        error: error,
        itemsFailed: 1,
        success: false,
      };
    }
  }

  async count({
    filter,
    field,
  }: { filter?: QB; field?: { name: string } } = {}): Promise<
    StandarOutput<T>
  > {
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
        return {
          resources: resources,
          count: resources[0] || 0,
          querySpec,
          success: true,
        };
      }

      let querySpec = { query: `SELECT VALUE COUNT(${countField}) FROM c` };
      const { resources } = await this._collection.items
        .query(querySpec.query)
        .fetchAll();

      return {
        resources: resources,
        count: resources[0] || 0,
        querySpec: { query: `SELECT VALUE COUNT(${countField}) FROM c` },
        success: true,
      };
    } catch (error: any) {
      return { resources: [], count: 0, error: error, success: false };
    }
  }

  async deleteById(
    id: string,
    partitionKey: string = id,
  ): Promise<StandarOutput<T>> {
    try {
      await this._collection.item(id, partitionKey).delete();
      return {
        deleted: true,
        count: 1,
        itemsUpdated: 1,
        success: true,
      };
    } catch (error: any) {
      return { deleted: false, error: error, itemsFailed: 1, success: false };
    }
  }

  async deleteByFilter({ filter }: { filter: QB }): Promise<StandarOutput<T>> {
    try {
      if (!filter) {
        throw new Error("Filter is Required");
      }
      const { resources: itemToDelete } = await this.find({ filter });

      if (!itemToDelete?.length) {
        throw new Error("No Document found to Delete.");
      }

      let itemsFailed = 0;
      let itemsDeleted = 0;
      let errorStack: Error[] = [];
      await Promise.all(
        itemToDelete.map(async (doc) => {
          let { deleted, error } = await this.deleteById(
            (doc?.id || "").toString(),
            (doc?.partitionKey || doc?.id || "").toString(),
          );

          if (deleted) itemsDeleted++;
          else {
            itemsFailed++;
            errorStack.push(error as Error);
          }
        }),
      );

      return {
        deleted: true,
        itemsUpdated: itemsDeleted,
        itemsFailed: itemsFailed,
        error: errorStack,
        success: true,
      };
    } catch (error: any) {
      return {
        deleted: false,
        error: error,
        itemsFailed: 1,
        success: false,
      };
    }
  }

  async findByQuery(
    query: string,
    parameters?: SqlParameter[],
  ): Promise<StandarOutput<T>> {
    try {
      const querySpec = parameters ? { query, parameters } : { query };

      const { resources } = await this._collection.items
        .query(querySpec)
        .fetchAll();

      return {
        resources: resources,
        count: resources.length,
        success: true,
      };
    } catch (error: any) {
      return { resources: [], count: 0, error: error, success: false };
    }
  }
}

export { Model };
