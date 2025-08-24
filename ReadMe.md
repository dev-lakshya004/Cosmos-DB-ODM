# Cosmos ODM

A lightweight **Object Document Mapper (ODM)** for [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction) with:

- **Type-safe schemas** via [Zod](https://zod.dev/)
- **Schema-aware fields** (`User.name`, `User.age`) for type-safe queries
- **Fluent Query Builder** for Cosmos DB SQL API
- Easy **CRUD operations** with validation
- Automatic database & container creation

---

## 📦 Installation

```bash
npm i @lakshya004/cosmos-odm
```

---

## 🚀 Quick Start

```c
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

// ✅ Access schema-safe fields
console.log(User.name); // { name: "name" }
console.log(User.age);  // { name: "age" }

// 5️⃣ Insert a document
const newUser = await User.insert({ name: "Alice", age: 28 });

// 6️⃣ Query with Query Builder + fields
const q = qb().and(
  qb().eq(User.fields.name, "Alice"),
  qb().gt(User.fields.age, 20)
);

const { resources } = await User.find({
  filter: q,
  fields: { id: User.fields.id, name: User.fields.name, age: User.fields.age },
  limit: 10,
});

// 7️⃣ Update by ID
await User.updateById({ doc: { age: 29 }, id: newUser.id! });

// 8️⃣ Delete by ID
await User.deleteById(newUser.id!);
```

---

# ✨ Features

## Insert

```c
// Single insert
await User.insert({ name: "Lakshya", age: 20 });

// Bulk insert
await User.insertMany([
  { name: "Rakesh", age: 30 },
  { name: "Dhruv", age: 20 },
]);
```

---

## Find

```c
// By ID
await User.findById("doc-id", "partition-key");

// With filter
const q = qb().ilike(User.fields.name, "lak");
const users = await User.find({ filter: q, limit: 5 });
```

---

## Update

```c
// By ID
await User.updateById({
  doc: { age: 25 },
  id: "doc-id",
  partitionKey: "partition-key"
});

// By filter
await User.update({
  doc: { age: 37 },
  filter: qb().eq(User.fields.name, "Makshya"),
});

```

---

## Delete

```c
// Partition key optional id same as doc-id
await User.deleteById("doc-id", "partition-key");

```

---

## Count

```c
// Total count
const total = await User.count();

// Count with filter
const filtered = await User.count({
  filter: qb().ilike(User.name, "lak"),
});
```

## Order By

```c
// Getting result in descending order of ages
 const user_desc = await User.find({
  orderBy: q.order(q.desc(User.fields.age)),
});

// Getting result in ascending order of ages
 const user_asc = await User.find({
  orderBy: q.order(q.asc(User.fields.age)),
});
```

---

# 📚 API Reference

## DBConnection

| Method                                      | Description                        |
| ------------------------------------------- | ---------------------------------- |
| `connectDatabase(dbName)`                   | Creates or connects to a database  |
| `connectCollection(dbName, collectionName)` | Creates or connects to a container |

## Model

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
| `count({ filter?, field? })` | Count documents |

---

## 🔹 Query Builder (qb)

Schema-aware, type-safe query builder.
| Method | Example |
| ------------------------- | -------------------------------------------- |
| `.eq(field, value)` | `qb().eq(User.name, "John")` |
| `.ne(field, value)` | `qb().ne(User.status, "inactive")` |
| `.gt(field, value)` | `qb().gt(User.age, 30)` |
| `.lt(field, value)` | `qb().lt(User.score, 100)` |
| `.gte(field, value)` | `qb().gte(User.age, 18)` |
| `.lte(field, value)` | `qb().lte(User.age, 65)` |
| `.inArray(field, values)` | `qb().inArray(User.role, ["admin", "user"])` |
| `.ieq(field, value)` | Case-insensitive equality |
| `.ilike(field, value)` | Case-insensitive contains |
| `.and(...conditions)` | Combine with AND |
| `.or(...conditions)` | Combine with OR |
| `.desc(field)` | Helper to add descending order |
| `.asc(field)` | Helper to add ascending order |
| `.order(...fields)` | To combine asc and desc functions values together |
| `.build()` | Returns `{ query, params }` |

---

## 📄 License

MIT
