import { Container, SqlParameter } from "@azure/cosmos";
import z, { ZodObject } from "zod";
import { QB } from "./QueryBuilder";
type FieldsFromSchema<T extends z.ZodObject<any>> = {
    [K in keyof z.infer<T>]: {
        name: string;
    };
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
declare class Model<T extends ZodObject<any>> {
    private _schema;
    private _collection;
    fields: FieldsFromSchema<T>;
    constructor(schema: T, collection: Container);
    private defineModel;
    insert(doc: z.infer<T>): Promise<StandarOutput<T>>;
    insertMany(docs: z.infer<T>[]): Promise<StandarOutput<T>>;
    findById(id: string): Promise<StandarOutput<T>>;
    find({ filter, fields, limit, offset, orderBy, }: {
        filter?: QB;
        fields?: FieldsFromSchema<T>;
        limit?: number;
        offset?: number;
        orderBy?: string;
    }): Promise<StandarOutput<T>>;
    updateById({ doc, id, }: {
        doc: z.infer<T>;
        id: string;
    }): Promise<StandarOutput<T>>;
    update({ doc, filter, }: {
        doc: z.infer<T>;
        filter: QB;
    }): Promise<StandarOutput<T>>;
    count({ filter, field, }?: {
        filter?: QB;
        field?: {
            name: string;
        };
    }): Promise<StandarOutput<T>>;
    deleteById(id: string, partitionKey?: string): Promise<StandarOutput<T>>;
    deleteByFilter({ filter }: {
        filter: QB;
    }): Promise<StandarOutput<T>>;
}
export { Model };
//# sourceMappingURL=BaseModel.odm.d.ts.map