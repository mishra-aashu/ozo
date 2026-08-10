const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.COCKROACH_DATABASE_URL;

if (!connectionString) {
  console.error('[Cockroach Bridge] ERROR: COCKROACH_DATABASE_URL environment variable is missing.');
  process.exit(1);
}

console.log('[Cockroach Bridge] Initializing database connection pool...');

const pool = new Pool({
  connectionString: connectionString,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Helper to execute query with exponential backoff retries for CockroachDB retryable transactions (40001)
async function queryWithRetry(text, params, maxRetries = 3, initialDelayMs = 100) {
  let attempt = 0;
  while (true) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempt++;
      // CockroachDB retryable transaction error code is '40001' (retry_transaction)
      if (err.code === '40001' && attempt <= maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Cockroach DB] Retryable transaction error (code 40001). Retrying query in ${delay}ms (Attempt ${attempt}/${maxRetries}). Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// Test connection on startup using retry query helper
queryWithRetry('SELECT version();')
  .then(res => {
    console.log('[Cockroach Bridge] Database connection test successful!');
    console.log('[Cockroach Bridge] CockroachDB Version:', res.rows[0].version);
  })
  .catch(err => {
    console.error('[Cockroach Bridge] Database connection test failed:', err.message);
  });

module.exports = {
  query: queryWithRetry,
  pool,
};

