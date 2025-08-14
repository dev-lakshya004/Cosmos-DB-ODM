import { CosmosClient } from "@azure/cosmos";
export class DBConnection {
    constructor(endpoint, key) {
        this.DBInstances = new Map();
        this.CollectionStore = new Map();
        this.client = new CosmosClient({ endpoint, key });
    }
    validateName(name, type) {
        if (!name || typeof name !== "string" || !name.trim()) {
            throw new Error(`${type} name must be a non-empty string.`);
        }
    }
    async connectDatabase(dbName) {
        this.validateName(dbName, "Database");
        if (this.DBInstances.has(dbName)) {
            return this.DBInstances.get(dbName);
        }
        const { database } = await this.client.databases.createIfNotExists({
            id: dbName,
        });
        this.DBInstances.set(dbName, database);
        return database;
    }
    async connectCollection(dbName, collectionName) {
        this.validateName(dbName, "Database");
        this.validateName(collectionName, "Collection");
        const db = await this.connectDatabase(dbName);
        if (this.CollectionStore.has(dbName)) {
            const dbCollections = this.CollectionStore.get(dbName);
            if (dbCollections.has(collectionName)) {
                return dbCollections.get(collectionName);
            }
        }
        const { container } = await db.containers.createIfNotExists({
            id: collectionName,
        });
        if (!this.CollectionStore.has(dbName)) {
            this.CollectionStore.set(dbName, new Map());
        }
        this.CollectionStore.get(dbName).set(collectionName, container);
        return container;
    }
}
//# sourceMappingURL=db.connection.js.map