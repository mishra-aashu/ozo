# CockroachDB Bridge Engine

This is a developer-friendly converter and bridge service that sits between the **Ozo App** and **CockroachDB**. It is designed to act as a dynamic SQL adapter that handles the data mapping and automatic schema management so you don't have to write custom DDL queries (create tables, add columns, etc.).

## 🚀 Key Features

1. **Auto-Schema Management**: If a table doesn't exist in CockroachDB when you insert data, the engine automatically creates it with matching datatypes. If you add new keys to your payload later, it alters the table on-the-fly to add the new columns.
2. **Postgres Wire Protocol Compatible**: Connects to any CockroachDB instance (local or Cockroach Cloud serverless) using standard Postgres pool drivers (`pg`).
3. **No Auth/Boilerplate**: Purely handles data ingestion, querying, and deletion securely through parameterized queries.

---

## 🛠️ Setup & Run

### 1. Install Dependencies
Navigate to the `cockroach-bridge` directory and run:
```bash
cd cockroach-bridge
npm install
```

### 2. Configure Environment Variables
Edit the `.env` file with your CockroachDB connection string:
```env
PORT=5005
COCKROACH_DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>?sslmode=verify-full
```

### 3. Start the Server
For development mode (with auto-reload):
```bash
npm run dev
```

For production mode:
```bash
npm start
```

---

## 📡 API Endpoints

All payloads should be sent with the header `Content-Type: application/json`.

### 1. Save (Insert/Upsert) Record
* **URL**: `/api/v1/save`
* **Method**: `POST`
* **Body**:
```json
{
  "table": "customer_logs",
  "data": {
    "user_id": "8a09f42b-58bb-4b71-9f20-fa7d0e40db93",
    "event_name": "checkout_click",
    "device_info": { "os": "Android", "browser": "Chrome" },
    "duration_seconds": 12.5,
    "success": true
  }
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Data saved successfully to table: customer_logs",
  "record": {
    "id": "2138971a-289c-4eb8-a7c1-2cb29d291981",
    "user_id": "8a09f42b-58bb-4b71-9f20-fa7d0e40db93",
    "event_name": "checkout_click",
    "device_info": { "os": "Android", "browser": "Chrome" },
    "duration_seconds": 12.5,
    "success": true
  }
}
```

### 2. Query Records
* **URL**: `/api/v1/query`
* **Method**: `POST`
* **Body**:
```json
{
  "table": "customer_logs",
  "filters": {
    "success": true
  },
  "options": {
    "limit": 10,
    "orderBy": "id",
    "direction": "DESC"
  }
}
```
* **Response**:
```json
{
  "success": true,
  "count": 1,
  "records": [
    {
      "id": "2138971a-289c-4eb8-a7c1-2cb29d291981",
      "user_id": "8a09f42b-58bb-4b71-9f20-fa7d0e40db93",
      "event_name": "checkout_click",
      "device_info": { "os": "Android", "browser": "Chrome" },
      "duration_seconds": 12.5,
      "success": true
    }
  ]
}
```

### 3. Delete Records
* **URL**: `/api/v1/delete`
* **Method**: `POST`
* **Body**:
```json
{
  "table": "customer_logs",
  "filters": {
    "id": "2138971a-289c-4eb8-a7c1-2cb29d291981"
  }
}
```

---

## 💻 Frontend Client Integration Example

You can write a simple utility inside your frontend `src/utils/cockroach.js` to call the bridge engine easily:

```javascript
const BRIDGE_URL = 'http://localhost:5005/api/v1';

export const cockroach = {
  // Insert/Upsert a record
  save: async (table, data) => {
    const response = await fetch(`${BRIDGE_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data })
    });
    return response.json();
  },

  // Query records
  query: async (table, filters = {}, options = {}) => {
    const response = await fetch(`${BRIDGE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, filters, options })
    });
    return response.json();
  },

  // Delete records
  delete: async (table, filters) => {
    const response = await fetch(`${BRIDGE_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, filters })
    });
    return response.json();
  }
};
```

**Usage inside React components:**
```javascript
import { cockroach } from '../utils/cockroach';

// Save an error log
const logError = async (err) => {
  await cockroach.save('application_error_logs', {
    page: 'Home',
    error_message: err.message,
    severity: 'high',
    timestamp: new Date().toISOString()
  });
};
```
