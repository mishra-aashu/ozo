/**
 * CockroachDB Bridge Client Utility
 * Handles secure communication with the cockroach-bridge server.
 */

const BRIDGE_URL = import.meta.env.VITE_COCKROACH_BRIDGE_URL || 'http://localhost:5005/api/v1';
const BRIDGE_API_KEY = import.meta.env.VITE_COCKROACH_BRIDGE_API_KEY || '';

// Common headers helper
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (BRIDGE_API_KEY) {
    headers['x-bridge-api-key'] = BRIDGE_API_KEY;
  }
  
  return headers;
};

export const cockroach = {
  /**
   * Saves (inserts or updates) a record in CockroachDB securely.
   * Table and columns are automatically created if they don't exist.
   * @param {string} table - The target database table name.
   * @param {Object} data - The row payload (key-value).
   * @returns {Promise<Object>} { success: boolean, record: Object, error?: string }
   */
  save: async (table, data) => {
    try {
      const response = await fetch(`${BRIDGE_URL}/save`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ table, data }),
      });
      return await response.json();
    } catch (err) {
      console.error(`[Cockroach Client] Save failed for table ${table}:`, err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Queries records from a CockroachDB table.
   * Enforces security headers and pagination options.
   * @param {string} table - The target database table name.
   * @param {Object} filters - Simple equality filters { column: value }.
   * @param {Object} options - Pagination/sort options { limit, offset, orderBy, direction }.
   * @returns {Promise<Object>} { success: boolean, records: Array, count: number, error?: string }
   */
  query: async (table, filters = {}, options = {}) => {
    try {
      const response = await fetch(`${BRIDGE_URL}/query`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ table, filters, options }),
      });
      return await response.json();
    } catch (err) {
      console.error(`[Cockroach Client] Query failed for table ${table}:`, err);
      return { success: false, records: [], count: 0, error: err.message };
    }
  },

  /**
   * Deletes records matching the filters securely.
   * @param {string} table - The target database table name.
   * @param {Object} filters - Filter criteria (e.g. { id: 'some-uuid' }).
   * @returns {Promise<Object>} { success: boolean, deleted: Array, error?: string }
   */
  delete: async (table, filters) => {
    try {
      const response = await fetch(`${BRIDGE_URL}/delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ table, filters }),
      });
      return await response.json();
    } catch (err) {
      console.error(`[Cockroach Client] Delete failed for table ${table}:`, err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Subscribes to realtime updates (SSE) for a specific table or all tables.
   * Matches Supabase-like realtime subscriptions.
   * @param {Function} callback - Callback function (payload) => void. Receives payload: { action, table, record, timestamp }.
   * @param {string} [filterTable] - Optional table name to filter events.
   * @returns {Function} Unsubscribe function to close the connection.
   */
  subscribe: (callback, filterTable = null) => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // Build connection URL with API Key parameter for browser EventSource
    const sseUrl = `${BRIDGE_URL}/realtime?token=${encodeURIComponent(BRIDGE_API_KEY)}`;
    const eventSource = new EventSource(sseUrl);

    console.log(`[Cockroach Client] Subscribing to database changefeed. Filtering: ${filterTable || 'All Tables'}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!filterTable || payload.table === filterTable) {
          callback(payload);
        }
      } catch (err) {
        console.error('[Cockroach Client] SSE payload parsing failed:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[Cockroach Client] SSE connection error:', err);
    };

    // Return the unsubscribe method
    return () => {
      console.log('[Cockroach Client] Unsubscribing from database changefeed.');
      eventSource.close();
    };
  }
};
