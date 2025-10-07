import { Database, Container } from "@azure/cosmos";
export declare class DBConnection {
    private static sharedClient;
    private client;
    private DBInstances;
    private CollectionStore;
    private pendingDB;
    private pendingCollection;
    constructor(endpoint: string, key: string);
    private validateName;
    connectDatabase(dbName: string): Promise<Database>;
    connectCollection(dbName: string, collectionName: string, partitionKey?: string): Promise<Container>;
    close(): void;
}
//# sourceMappingURL=db.connection.d.ts.map