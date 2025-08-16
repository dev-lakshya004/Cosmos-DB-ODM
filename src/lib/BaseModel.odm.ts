import { Container, FeedOptions, SqlParameter } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";

class Model<T extends ZodObject<any>> {
  private _schema: T;
  private _collection: Container;

  constructor(schema: T, collection: Container) {
    this._schema = schema;
    this._collection = collection;
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
    fields = [],
    limit,
    offset,
  }: {
    filter?: QB;
    fields?: string[];
    limit?: number;
    offset?: string;
  }): Promise<{ resources: z.infer<T>[]; continuationToken?: string } | null> {
    try {
      const projection = fields?.length
        ? fields.map((field) => `c.${field}`).join(", ")
        : "*";

      const built = filter?.build();

      const whereSql = built?.query ? ` WHERE ${built.query}` : "";
      let parameters: SqlParameter[] | undefined = built?.params;

      const querySpec =
        parameters && parameters.length
          ? { query: `SELECT ${projection} FROM c${whereSql}`, parameters }
          : { query: `SELECT ${projection} FROM c${whereSql}` };

      console.log("querySpec: ", querySpec);

      const options: FeedOptions = {
        maxItemCount: limit || 100,
      };

      const iterator = this._collection.items.query(querySpec, options);
      if (offset) {
        (iterator as any).continuationToken = offset;
      }

      const { resources, continuationToken } = await iterator.fetchNext();

      if (!resources || !resources.length) {
        return { resources: [], continuationToken };
      }

      return { resources, continuationToken };
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

  async count({ filter }: { filter?: QB }) {
    try {
      if (filter) {
        const built = filter.build();
        const whereSql = built?.query ? ` WHERE ${built.query}` : "";
        let parameters: SqlParameter[] | undefined = built?.params;

        const querySpec =
          parameters && parameters.length
            ? { query: `SELECT VALUE COUNT(1) FROM c${whereSql}`, parameters }
            : { query: `SELECT VALUE COUNT(1) FROM c${whereSql}` };

        const { resources } = await this._collection.items
          .query(querySpec)
          .fetchAll();
        return resources[0] || 0;
      }
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
