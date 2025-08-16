import { Container } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";
declare class Model<T extends ZodObject<any>> {
    private _schema;
    private _collection;
    constructor(schema: T, collection: Container);
    insert(doc: z.infer<T>): Promise<z.infer<T> | null>;
    insertMany(docs: z.infer<T>[]): Promise<z.infer<T>[]>;
    findById(id: string, partitionKey?: string): Promise<z.infer<T> | null>;
    find({ filter, fields, limit, offset, }: {
        filter?: QB;
        fields?: string[];
        limit?: number;
        offset?: string;
    }): Promise<{
        resources: z.infer<T>[];
        continuationToken?: string;
    } | null>;
    updateById({ doc, id, partitionKey, }: {
        doc: z.infer<T>;
        id: string;
        partitionKey: string;
    }): Promise<z.infer<T> | null>;
    update({ doc, filter, }: {
        doc: z.infer<T>;
        filter: QB;
    }): Promise<z.infer<T>[]>;
    count({ filter }: {
        filter?: QB;
    }): Promise<any>;
    deleteById(id: string, partitionKey?: string): Promise<Boolean>;
}
export { Model };
//# sourceMappingURL=BaseModel.odm.d.ts.map