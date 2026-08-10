const format = require('pg-format');
const db = require('./db');

// UUID detection regex (matches any 8-4-4-4-12 hex UUID, including nil and v7)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ISO timestamp detection regex
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Infers SQL data type from JavaScript values for CockroachDB compatibility.
 * Maps all numbers to FLOAT8 to avoid column type conflicts (integers vs decimals).
 */
function inferSqlType(value) {
  if (value === null || value === undefined) {
    return 'TEXT'; // Default fallback
  }

  const type = typeof value;

  if (type === 'boolean') {
    return 'BOOL';
  }

  // Protect against type mismatch (e.g. initial integer vs later decimal) by mapping all numbers to FLOAT8
  if (type === 'number') {
    return 'FLOAT8';
  }

  if (type === 'string') {
    if (UUID_REGEX.test(value)) {
      return 'UUID';
    }
    if (ISO_DATE_REGEX.test(value)) {
      return 'TIMESTAMPTZ';
    }
    return 'TEXT';
  }

  if (type === 'object') {
    return 'JSONB';
  }

  return 'TEXT';
}

/**
 * Scans the database schema and ensures that the table exists and contains all required columns.
 * Uses pg-format (%I) to guarantee SQL injection protection on table and column identifiers.
 */
async function ensureTableAndColumns(tableName, dataObject) {
  // 1. Check if the table exists safely using parameters
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  const tableCheckResult = await db.query(tableCheckQuery, [tableName]);
  const tableExists = tableCheckResult.rows[0].exists;

  if (!tableExists) {
    console.log(`[Cockroach Converter] Table "${tableName}" does not exist. Creating it...`);
    
    // Determine primary key. If data has 'id' and it's a UUID, use it. Otherwise, default to gen_random_uuid().
    let idColumnDefinition = 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()';
    const columnDefinitions = [];

    for (const [key, value] of Object.entries(dataObject)) {
      if (key.toLowerCase() === 'id') {
        const type = inferSqlType(value);
        idColumnDefinition = format('id %s PRIMARY KEY', type);
        continue;
      }
      const type = inferSqlType(value);
      columnDefinitions.push(format('%I %s', key, type));
    }

    const createTableQuery = format(
      'CREATE TABLE IF NOT EXISTS public.%I (%s%s);',
      tableName,
      idColumnDefinition,
      columnDefinitions.length ? ', ' + columnDefinitions.join(', ') : ''
    );
    
    await db.query(createTableQuery);
    console.log(`[Cockroach Converter] Table "${tableName}" created successfully.`);
  } else {
    // 2. Table exists, inspect column definitions safely
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1;
    `;
    const columnCheckResult = await db.query(columnCheckQuery, [tableName]);
    const existingColumns = new Set(columnCheckResult.rows.map(row => row.column_name.toLowerCase()));

    // 3. Find missing columns and alter the table dynamically
    for (const [key, value] of Object.entries(dataObject)) {
      const lowerKey = key.toLowerCase();
      if (!existingColumns.has(lowerKey)) {
        const type = inferSqlType(value);
        console.log(`[Cockroach Converter] Column "${key}" is missing in table "${tableName}". Altering table...`);
        
        const alterTableQuery = format(
          'ALTER TABLE public.%I ADD COLUMN %I %s;',
          tableName,
          key,
          type
        );
        await db.query(alterTableQuery);
      }
    }
  }
}

/**
 * Saves a JSON record dynamically to CockroachDB.
 */
async function saveRecord(tableName, dataObject) {
  if (!dataObject || typeof dataObject !== 'object' || Array.isArray(dataObject)) {
    throw new Error('Data payload must be a key-value object');
  }

  // Ensure database schema matches the payload structure
  await ensureTableAndColumns(tableName, dataObject);

  const keys = Object.keys(dataObject);
  const columnsList = keys.map(k => format('%I', k)).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map(key => {
    const val = dataObject[key];
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  });

  // Prepare safe UPSERT query
  const updateClauses = keys.map(k => format('%I = EXCLUDED.%I', k, k)).join(', ');
  const upsertSql = format(
    'INSERT INTO public.%I (%s) VALUES (%s) ON CONFLICT (id) DO UPDATE SET %s RETURNING *;',
    tableName,
    columnsList,
    placeholders,
    updateClauses
  );

  // Fallback: If table doesn't have an 'id' or unique key constraint, ON CONFLICT will fail.
  // We first attempt UPSERT, if it fails due to constraint issues, we perform a standard INSERT.
  try {
    const res = await db.query(upsertSql, values);
    return res.rows[0];
  } catch (err) {
    if (err.message.includes('there is no unique or exclusion constraint matching the ON CONFLICT specification')) {
      const insertSql = format(
        'INSERT INTO public.%I (%s) VALUES (%s) RETURNING *;',
        tableName,
        columnsList,
        placeholders
      );
      const res = await db.query(insertSql, values);
      return res.rows[0];
    }
    throw err;
  }
}

/**
 * Dynamic query executor for CockroachDB with default limit guardrails.
 */
async function findRecords(tableName, filters = {}, options = {}) {
  // Verify table exists first
  const tableCheckQuery = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  const tableCheckResult = await db.query(tableCheckQuery, [tableName]);
  if (!tableCheckResult.rows[0].exists) {
    return []; // Return empty array if table doesn't exist yet
  }

  const whereClauses = [];
  const values = [];
  let index = 1;

  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null) {
      whereClauses.push(format('%I = $%s', key, index));
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
      index++;
    }
  }

  let sql = format('SELECT * FROM public.%I', tableName);
  if (whereClauses.length) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Handle options (Sorting)
  if (options.orderBy) {
    const direction = options.direction === 'DESC' ? 'DESC' : 'ASC';
    sql += format(' ORDER BY %I %s', options.orderBy, direction);
  } else {
    sql += ` ORDER BY id ASC`; // fallback stable sort
  }

  // Enforce Limit Guardrail (default max 100 rows to prevent memory exhaustion)
  const limit = options.limit ? Math.min(parseInt(options.limit, 10), 1000) : 100;
  sql += format(' LIMIT %s', limit);

  if (options.offset) {
    sql += format(' OFFSET %s', parseInt(options.offset, 10));
  }

  const res = await db.query(sql, values);
  return res.rows;
}

/**
 * Dynamic row deletion.
 */
async function deleteRecords(tableName, filters = {}) {
  const whereClauses = [];
  const values = [];
  let index = 1;

  for (const [key, val] of Object.entries(filters)) {
    whereClauses.push(format('%I = $%s', key, index));
    values.push(val);
    index++;
  }

  if (!whereClauses.length) {
    throw new Error('Deletes must contain at least one filter criterion to prevent full table wipes.');
  }

  const sql = format(
    'DELETE FROM public.%I WHERE %s RETURNING *;',
    tableName,
    whereClauses.join(' AND ')
  );

  const res = await db.query(sql, values);
  return res.rows;
}

module.exports = {
  saveRecord,
  findRecords,
  deleteRecords,
  inferSqlType
};
