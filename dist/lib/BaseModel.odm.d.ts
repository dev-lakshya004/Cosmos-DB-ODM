import { Container } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";
type FieldsFromSchema<T extends z.ZodObject<any>> = {
    [K in keyof z.infer<T>]: {
        name: string;
    };
};
declare class Model<T extends ZodObject<any>> {
    private _schema;
    private _collection;
    fields: FieldsFromSchema<T>;
    constructor(schema: T, collection: Container);
    private defineModel;
    insert(doc: z.infer<T>): Promise<z.infer<T> | null>;
    insertMany(docs: z.infer<T>[]): Promise<z.infer<T>[]>;
    findById(id: string, partitionKey?: string): Promise<z.infer<T> | null>;
    find({ filter, fields, limit, offset, }: {
        filter?: QB;
        fields?: FieldsFromSchema<T>;
        limit?: number;
        offset?: number;
    }): Promise<{
        resources: z.infer<T>[];
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
    count({ filter, field, }?: {
        filter?: QB;
        field?: {
            name: string;
        };
    }): Promise<number>;
    deleteById(id: string, partitionKey?: string): Promise<Boolean>;
}
export { Model };
//# sourceMappingURL=BaseModel.odm.d.ts.map