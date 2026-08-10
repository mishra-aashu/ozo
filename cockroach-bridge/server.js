const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const converter = require('./converter');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5005;

// Trust first proxy (required if deployed behind Nginx, Vercel, etc.)
app.set('trust proxy', 1);

// 1. Rate Limiting Middleware (Guardrail against DoS and scraping)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Max 150 requests per IP per window
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting globally
app.use(limiter);

app.use(cors());
app.use(express.json());

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[Cockroach Bridge] [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 2. API Key Authentication Middleware (x-bridge-api-key)
const apiKeyMiddleware = (req, res, next) => {
  // Public endpoint
  if (req.path === '/health') {
    return next();
  }

  const clientApiKey = req.headers['x-bridge-api-key'] || req.query.token;
  const serverApiKey = process.env.BRIDGE_API_KEY;

  if (!serverApiKey) {
    console.error('[Cockroach Bridge] CRITICAL ERROR: BRIDGE_API_KEY is not defined in .env.');
    return res.status(500).json({
      success: false,
      error: 'Internal configuration error. Contact administrator.'
    });
  }

  if (!clientApiKey || clientApiKey !== serverApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid API Key.'
    });
  }

  next();
};

// Apply Authentication to all endpoints (except /health, which is handled inside the middleware)
app.use(apiKeyMiddleware);

// Health check endpoint (Public)
app.get('/health', async (req, res) => {
  try {
    const dbTest = await db.query('SELECT 1;');
    if (dbTest.rows.length > 0) {
      return res.status(200).json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 3. Realtime SSE Channel Implementation
let sseClients = [];

/**
 * SSE Endpoint to subscribe to database changes
 * Query parameter format: /api/v1/realtime?token=YOUR_API_KEY
 */
app.get('/api/v1/realtime', (req, res) => {
  // Set headers for EventStream protocol
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Heartbeat interval to keep connection alive (prevent intermediate router timeouts)
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  // Client entry
  const clientId = Date.now();
  const clientObj = {
    id: clientId,
    res
  };
  sseClients.push(clientObj);
  console.log(`[SSE Realtime] Connection opened: ${clientId}. Total active subscribers: ${sseClients.length}`);

  // Connection close cleanup
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[SSE Realtime] Connection closed: ${clientId}. Total active subscribers: ${sseClients.length}`);
  });
});

/**
 * Broadcast mutations to all connected SSE streams
 */
function broadcastMutation(action, table, record) {
  const eventPayload = JSON.stringify({
    action,
    table,
    record,
    timestamp: new Date().toISOString()
  });

  console.log(`[SSE Realtime] Broadcasting [${action}] on table [${table}] to ${sseClients.length} subscribers.`);
  sseClients.forEach(client => {
    client.res.write(`data: ${eventPayload}\n\n`);
  });
}

/**
 * Endpoint to save (insert/upsert) data dynamically.
 */
app.post('/api/v1/save', async (req, res) => {
  const { table, data } = req.body;

  if (!table || !data) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters. Make sure to provide "table" and "data".'
    });
  }

  try {
    const savedRecord = await converter.saveRecord(table, data);
    
    // Broadcast mutation to active listeners
    broadcastMutation('save', table, savedRecord);

    return res.status(200).json({
      success: true,
      message: `Data saved successfully to table: ${table}`,
      record: savedRecord
    });
  } catch (err) {
    console.error(`[Cockroach Bridge] Save error in table "${table}":`, err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Endpoint to query data from a table with filters.
 */
app.post('/api/v1/query', async (req, res) => {
  const { table, filters, options } = req.body;

  if (!table) {
    return res.status(400).json({
      success: false,
      error: 'Missing "table" parameter in query request.'
    });
  }

  try {
    const records = await converter.findRecords(table, filters || {}, options || {});
    return res.status(200).json({
      success: true,
      count: records.length,
      records: records
    });
  } catch (err) {
    console.error(`[Cockroach Bridge] Query error in table "${table}":`, err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Endpoint to delete records.
 */
app.post('/api/v1/delete', async (req, res) => {
  const { table, filters } = req.body;

  if (!table || !filters || Object.keys(filters).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing "table" or "filters" parameter. Filters cannot be empty to prevent accidental full table wipe.'
    });
  }

  try {
    const deletedRecords = await converter.deleteRecords(table, filters);
    
    // Broadcast deletion events
    deletedRecords.forEach(record => {
      broadcastMutation('delete', table, record);
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted matching records from table: ${table}`,
      deleted: deletedRecords
    });
  } catch (err) {
    console.error(`[Cockroach Bridge] Delete error in table "${table}":`, err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Cockroach Bridge] Express Global Error Handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`  🚀 COCKROACHDB BRIDGE ENGINE IS RUNNING ON PORT ${PORT}  `);
  console.log(`  👉 Base Endpoint: http://localhost:${PORT}/api/v1         `);
  console.log(`  👉 Realtime Channel: /api/v1/realtime                     `);
  console.log(`============================================================`);
});
