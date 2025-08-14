# Cosmos ODM

A lightweight **Object Document Mapper (ODM)** for [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction) with:

- **Type-safe schemas** via [Zod](https://zod.dev/)
- **Fluent Query Builder** for building SQL-like queries
- Easy **CRUD operations**
- Automatic database & container creation

---

## 📦 Installation

```bash
npm i @lakshya004/cosmos-odm
```

```bash
import { DBConnection, Model, qb } from "cosmos-odm";
import z from "zod";

// 1️⃣ Connect to Cosmos DB
const db = new DBConnection(
"<COSMOS_DB_ENDPOINT>",
"<COSMOS_DB_KEY>"
);

// 2️⃣ Define a schema using Zod
const schema = z.object({
    id: z.string().optional(),
    name: z.string(),
    age: z.number(),
});

// 3️⃣ Connect to a collection
const collection = await db.connectCollection("MyDatabase", "Users");

// 4️⃣ Create a Model
const User = new Model(schema, collection);

// 5️⃣ Insert a document
const newUser = await User.insert({ name: "Alice", age: 28 });

// 6️⃣ Query with the Query Builder
const q = qb().and(qb().eq("name", "Alice"), qb().gt("age", 20));
const { resources, continuationToken } = await User.find({
    filter: q,
    fields: ["id", "name", "age"],
    limit: 10
});

// 7️⃣ Update
await User.updateById({ doc: { age: 29 }, id: newUser.id! });

// 8️⃣ Delete
await User.deleteById(newUser.id!);

// Insert one
await User.insert({ name: "Lakshya", age: 20 });

// Insert many
await User.insertMany([
  { name: "Rakesh", age: 30 },
  { name: "Dhruv", age: 20 },
]);

// Find by ID
await User.findById("88efb782-5d0a-41bf-958e-fd60e4a96348", "partition-Key");

// Update with filter
await User.update({
  doc: {
    age: 37,
  },
  filter: q.eq("name", "Makshya"),
});

// Update by ID and Partitionkey Both
await User.updateById({ age: 25 }, id: "7daf1f3d-2d39-475f-b6a9-adeaa2f0a0a2", partitionKey: "partitionKey");

// Delete by ID
await User.deleteById("3741e9c3-3621-4531-b8cc-22ee910fec03");
```

---

# 📚 API Reference

| Method                                      | Description                        |
| ------------------------------------------- | ---------------------------------- |
| `connectDatabase(dbName)`                   | Creates or connects to a database  |
| `connectCollection(dbName, collectionName)` | Creates or connects to a container |

---

# Model

A generic, schema-driven data access class.
| Method | Description |
| ----------------------------------------- | ----------------------------------- |
| `insert(doc)` | Insert a single document |
| `insertMany(docs)` | Insert multiple documents |
| `findById(id, partitionKey?)` | Find a document by ID |
| `find({ filter, fields, limit, offset })` | Query documents |
| `updateById({ doc, id, partitionKey })` | Update a document by ID |
| `update({ doc, filter })` | Update multiple documents by filter |
| `deleteById(id, partitionKey?)` | Delete a document by ID |

---

# Query Builder (qb)

Fluent query builder for Cosmos DB SQL API.
| Method | Example |
| ------------------------- | ----------------------------------------- |
| `.eq(field, value)` | `qb().eq("name", "John")` |
| `.ne(field, value)` | `qb().ne("status", "inactive")` |
| `.gt(field, value)` | `qb().gt("age", 30)` |
| `.lt(field, value)` | `qb().lt("score", 100)` |
| `.inArray(field, values)` | `qb().inArray("role", ["admin", "user"])` |
| `.ieq(field, value)` | Case-insensitive equality |
| `.ilike(field, value)` | Case-insensitive contains |
| `.and(...conditions)` | Combine conditions with AND |
| `.or(...conditions)` | Combine conditions with OR |
| `.build()` | Returns `{ query, params }` |

---

# 🔹 Continuation Tokens

Cosmos DB paginates results.
Use the continuationToken returned from .find() to fetch the next set.

```bash
let results = await User.find({ limit: 10 });
if (results.continuationToken) {
    results = await User.find({
    limit: 10,
    offset: results.continuationToken
});
}
```

# 📄 License

MIT
