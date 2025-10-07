import {
  CosmosClient,
  Database,
  Container,
  PartitionKeyKind,
} from "@azure/cosmos";

export class DBConnection {
  private static sharedClient: CosmosClient;
  private client: CosmosClient;
  private DBInstances = new Map<string, Database>();
  private CollectionStore = new Map<string, Map<string, Container>>();
  private pendingDB = new Map<string, Promise<Database>>();
  private pendingCollection = new Map<string, Promise<Container>>();

  constructor(endpoint: string, key: string) {
    if (!endpoint || !key) {
      throw new Error("Cosmos DB endpoint and key are required.");
    }

    if (!DBConnection.sharedClient) {
      DBConnection.sharedClient = new CosmosClient({ endpoint, key });
    }

    this.client = DBConnection.sharedClient;
  }

  private validateName(name: string, type: "Database" | "Collection") {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error(`${type} name must be a non-empty string.`);
    }
    if (/[/\\?#]/.test(name)) {
      throw new Error(`${type} name contains invalid characters.`);
    }
  }

  async connectDatabase(dbName: string): Promise<Database> {
    this.validateName(dbName, "Database");

    if (this.DBInstances.has(dbName)) return this.DBInstances.get(dbName)!;
    if (this.pendingDB.has(dbName)) return this.pendingDB.get(dbName)!;

    const promise = (async () => {
      try {
        const { database } = await this.client.databases.createIfNotExists({
          id: dbName,
        });
        this.DBInstances.set(dbName, database);
        return database;
      } finally {
        this.pendingDB.delete(dbName);
      }
    })();

    this.pendingDB.set(dbName, promise);
    return promise;
  }

  async connectCollection(
    dbName: string,
    collectionName: string,
    partitionKey: string = "/id"
  ): Promise<Container> {
    this.validateName(dbName, "Database");
    this.validateName(collectionName, "Collection");

    const db = await this.connectDatabase(dbName);

    if (this.CollectionStore.has(dbName)) {
      const dbCollections = this.CollectionStore.get(dbName)!;
      if (dbCollections.has(collectionName))
        return dbCollections.get(collectionName)!;
    }

    const key = `${dbName}:${collectionName}`;
    if (this.pendingCollection.has(key))
      return this.pendingCollection.get(key)!;

    const promise = (async () => {
      try {
        const { container } = await db.containers.createIfNotExists({
          id: collectionName,
          partitionKey: { paths: [partitionKey], kind: PartitionKeyKind.Hash },
        });

        if (!this.CollectionStore.has(dbName)) {
          this.CollectionStore.set(dbName, new Map());
        }
        this.CollectionStore.get(dbName)!.set(collectionName, container);
        return container;
      } finally {
        this.pendingCollection.delete(key);
      }
    })();

    this.pendingCollection.set(key, promise);
    return promise;
  }

  close() {
    this.DBInstances.clear();
    this.CollectionStore.clear();
    this.pendingDB.clear();
    this.pendingCollection.clear();
  }
}
