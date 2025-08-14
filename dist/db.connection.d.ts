import { Database, Container } from "@azure/cosmos";
export declare class DBConnection {
    private client;
    private DBInstances;
    private CollectionStore;
    constructor(endpoint: string, key: string);
    private validateName;
    connectDatabase(dbName: string): Promise<Database>;
    connectCollection(dbName: string, collectionName: string): Promise<Container>;
}
//# sourceMappingURL=db.connection.d.ts.map