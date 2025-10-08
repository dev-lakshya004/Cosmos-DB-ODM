import z from "zod";
class Model {
    constructor(schema, collection) {
        this._schema = schema;
        this._collection = collection;
        this.fields = this.defineModel(schema);
        Object.keys(this.fields).forEach((key) => {
            Object.defineProperty(this, key, {
                get: () => this.fields[key],
                enumerable: true,
            });
        });
    }
    defineModel(schema, prefix = "") {
        const fields = Object.keys(schema.shape).reduce((acc, key) => {
            const fieldSchema = schema.shape[key];
            const fullName = prefix ? `${prefix}.${key}` : key;
            if (fieldSchema instanceof z.ZodObject) {
                acc[key] = {
                    name: fullName,
                    ...this.defineModel(fieldSchema, fullName),
                };
            }
            else {
                acc[key] = { name: fullName };
            }
            return acc;
        }, {});
        return fields;
    }
    async insert(doc) {
        try {
            const validatedDoc = this._schema.safeParse(doc);
            if (!validatedDoc.success) {
                throw new Error(validatedDoc.error.message);
            }
            const { resource } = await this._collection.items.create(validatedDoc.data);
            return {
                resource: resource,
                count: 1,
                itemsUpdated: 1,
                success: true,
            };
        }
        catch (error) {
            return {
                resource: null,
                count: 0,
                itemsFailed: 1,
                error: error,
                success: false,
            };
        }
    }
    async insertMany(docs) {
        try {
            const validatedDocs = this._schema.array().safeParse(docs);
            if (!validatedDocs.success) {
                throw new Error(validatedDocs.error.message);
            }
            const resources = await Promise.all(docs.map(async (doc) => {
                const { resource } = await this._collection.items.create(doc);
                return resource;
            }));
            return {
                resources: resources,
                count: resources.length,
                itemsUpdated: resources.length,
                success: true,
            };
        }
        catch (error) {
            return {
                resources: [],
                count: 0,
                itemsFailed: docs.length,
                error: error,
                success: false,
            };
        }
    }
    async findById(id) {
        try {
            const query = `SELECT * FROM c WHERE c.id = @id`;
            const parameters = [{ name: "@id", value: id }];
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
        }
        catch (error) {
            return { resource: null, error: error, count: 0, success: false };
        }
    }
    async find({ filter, fields, limit = 100, offset = 0, orderBy, }) {
        try {
            const projection = fields
                ? Object.entries(fields)
                    .map(([alias, col]) => `c.${col.name} AS ${alias}`)
                    .join(", ")
                : "*";
            const built = filter?.build();
            const whereSql = built?.query ? ` WHERE ${built.query}` : "";
            let parameters = built?.params;
            const querySpec = parameters && parameters.length
                ? {
                    query: `SELECT ${projection} FROM c${whereSql} ${orderBy ? orderBy : ""} OFFSET ${offset} LIMIT ${limit} `,
                    parameters,
                }
                : {
                    query: `SELECT ${projection} FROM c${whereSql} ${orderBy ? orderBy : ""} OFFSET ${offset} LIMIT ${limit} `,
                };
            const iterator = this._collection.items.query(querySpec);
            const { resources } = await iterator.fetchAll();
            return {
                resources: resources,
                count: resources.length,
                querySpec,
                success: true,
            };
        }
        catch (error) {
            return { resources: [], error: error, count: 0, success: false };
        }
    }
    async updateById({ doc, id, }) {
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
                    resource: resource,
                    itemsUpdated: 1,
                    count: 1,
                    success: true,
                };
            }
            throw new Error("Cannot merge non-object types");
        }
        catch (error) {
            return {
                resource: null,
                error: error,
                itemsFailed: 1,
                count: 0,
                success: false,
            };
        }
    }
    async update({ doc, filter, }) {
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
            let errorStack = [];
            const updatedDocs = await Promise.all(mergedDocs.map(async (doc) => {
                try {
                    const { resource } = await this._collection.items.upsert(doc);
                    itemsUpdated++;
                    return resource;
                }
                catch (error) {
                    updateFailed++;
                    errorStack.push(error);
                }
            }));
            return {
                resources: updatedDocs,
                itemsUpdated,
                itemsFailed: updateFailed,
                count: itemsUpdated,
                error: errorStack,
                success: true,
            };
        }
        catch (error) {
            return {
                resources: [],
                count: 0,
                error: error,
                itemsFailed: 1,
                success: false,
            };
        }
    }
    async count({ filter, field, } = {}) {
        try {
            const countField = field ? `c.${field.name}` : "1";
            if (filter) {
                const built = filter.build();
                const whereSql = built?.query ? ` WHERE ${built.query}` : "";
                let parameters = built?.params;
                const querySpec = parameters && parameters.length
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
        }
        catch (error) {
            return { resources: [], count: 0, error: error, success: false };
        }
    }
    async deleteById(id, partitionKey = id) {
        try {
            await this._collection.item(id, partitionKey).delete();
            return {
                deleted: true,
                count: 1,
                itemsUpdated: 1,
                success: true,
            };
        }
        catch (error) {
            return { deleted: false, error: error, itemsFailed: 1, success: false };
        }
    }
    async deleteByFilter({ filter }) {
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
            let errorStack = [];
            await Promise.all(itemToDelete.map(async (doc) => {
                let { deleted, error } = await this.deleteById((doc?.id || "").toString(), (doc?.partitionKey || doc?.id || "").toString());
                if (deleted)
                    itemsDeleted++;
                else {
                    itemsFailed++;
                    errorStack.push(error);
                }
            }));
            return {
                deleted: true,
                itemsUpdated: itemsDeleted,
                itemsFailed: itemsFailed,
                error: errorStack,
                success: true,
            };
        }
        catch (error) {
            return {
                deleted: false,
                error: error,
                itemsFailed: 1,
                success: false,
            };
        }
    }
    async findByQuery(query, parameters) {
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
        }
        catch (error) {
            return { resources: [], count: 0, error: error, success: false };
        }
    }
}
export { Model };
//# sourceMappingURL=BaseModel.odm.js.map