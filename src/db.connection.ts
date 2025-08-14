import { CosmosClient, Database, Container } from "@azure/cosmos";

export class DBConnection {
  private client: CosmosClient;
  private DBInstances: Map<string, Database> = new Map();
  private CollectionStore: Map<string, Map<string, Container>> = new Map();

  constructor(endpoint: string, key: string) {
    this.client = new CosmosClient({ endpoint, key });
  }

  private validateName(name: string, type: "Database" | "Collection") {
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error(`${type} name must be a non-empty string.`);
    }
  }

  async connectDatabase(dbName: string): Promise<Database> {
    this.validateName(dbName, "Database");

    if (this.DBInstances.has(dbName)) {
      return this.DBInstances.get(dbName)!;
    }

    const { database } = await this.client.databases.createIfNotExists({
      id: dbName,
    });
    this.DBInstances.set(dbName, database);
    return database;
  }

  async connectCollection(
    dbName: string,
    collectionName: string
  ): Promise<Container> {
    this.validateName(dbName, "Database");
    this.validateName(collectionName, "Collection");

    const db = await this.connectDatabase(dbName);

    if (this.CollectionStore.has(dbName)) {
      const dbCollections = this.CollectionStore.get(dbName)!;
      if (dbCollections.has(collectionName)) {
        return dbCollections.get(collectionName)!;
      }
    }

    const { container } = await db.containers.createIfNotExists({
      id: collectionName,
    });

    if (!this.CollectionStore.has(dbName)) {
      this.CollectionStore.set(dbName, new Map());
    }
    this.CollectionStore.get(dbName)!.set(collectionName, container);

    return container;
  }
}
