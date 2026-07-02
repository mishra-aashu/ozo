import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Download,
  Cloud,
  Play,
  Check,
  Copy,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  Layers,
  ExternalLink,
  FileSpreadsheet,
  Info,
  Lock,
  Shield,
  FileText,
  Package,
  Tag,
  ShoppingBag,
  List,
  Users,
  Star,
  Home,
  Bike,
  MapPin,
  Globe,
  CheckSquare,
  Square,
  Upload
} from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabase'
import toast from 'react-hot-toast'

const BACKUP_TABLES = [
  { name: 'products', displayName: 'Products Catalog', description: 'All items with prices, MRP, brands, stock limits, and image URLs', icon: 'Package' },
  { name: 'categories', displayName: 'Categories', description: 'Product categories, slugs, and display configurations', icon: 'Tag' },
  { name: 'orders', displayName: 'Orders Transactions', description: 'Customer orders, payment types, order totals, and checkout timestamps', icon: 'ShoppingBag' },
  { name: 'order_items', displayName: 'Order Items Mapped', description: 'Detailed items mapped within customer orders', icon: 'List' },
  { name: 'users', displayName: 'Users Profiles', description: 'Registered user profile records, email, phone, and roles', icon: 'Users' },
  { name: 'reviews', displayName: 'Customer Reviews', description: 'Product reviews, ratings, and customer comments', icon: 'Star' },
  { name: 'marts', displayName: 'Marts & Outlets', description: 'Locations and statuses of distribution marts/warehouses', icon: 'Home' },
  { name: 'mart_inventory', displayName: 'Mart Inventory Stock', description: 'Stock levels of products mapped to specific marts', icon: 'Layers' },
  { name: 'captains', displayName: 'Captains / Riders', description: 'Registered captain/rider profiles, transport types, and statuses', icon: 'Bike' },
  { name: 'app_settings', displayName: 'App System Settings', description: 'Global app variables, checkout limits, and service rules', icon: 'Settings' },
  { name: 'addresses', displayName: 'Saved Addresses', description: 'Customer saved delivery address records', icon: 'MapPin' },
  { name: 'operating_cities', displayName: 'Operating Cities', description: 'Cities where OZO services are operational', icon: 'Globe' }
]

const getTableIcon = (iconName) => {
  switch (iconName) {
    case 'Package': return <Package className="w-5 h-5 text-blue-500" />
    case 'Tag': return <Tag className="w-5 h-5 text-green-500" />
    case 'ShoppingBag': return <ShoppingBag className="w-5 h-5 text-orange-500" />
    case 'List': return <List className="w-5 h-5 text-pink-500" />
    case 'Users': return <Users className="w-5 h-5 text-indigo-500" />
    case 'Star': return <Star className="w-5 h-5 text-yellow-500" />
    case 'Home': return <Home className="w-5 h-5 text-purple-500" />
    case 'Layers': return <Layers className="w-5 h-5 text-teal-500" />
    case 'Bike': return <Bike className="w-5 h-5 text-emerald-500" />
    case 'Settings': return <Settings className="w-5 h-5 text-rose-500" />
    case 'MapPin': return <MapPin className="w-5 h-5 text-amber-500" />
    case 'Globe': return <Globe className="w-5 h-5 text-sky-500" />
    default: return <Database className="w-5 h-5 text-gray-500" />
  }
}

const Backup = () => {
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('ozo_google_webhook') || '')
  const [useNoCors, setUseNoCors] = useState(() => localStorage.getItem('ozo_webhook_nocors') === 'true')
  const [showGuide, setShowGuide] = useState(false)

  const handleToggleNoCors = async (checked) => {
    setUseNoCors(checked)
    localStorage.setItem('ozo_webhook_nocors', checked ? 'true' : 'false')
    
    // Autosave toggle state to db
    if (webhookUrl.trim()) {
      try {
        await supabaseAdmin
          .from('app_settings')
          .upsert({
            key: 'backup_config',
            value: {
              webhook_url: webhookUrl.trim(),
              use_nocors: checked
            },
            description: 'Google Sheets sync hub Webhook configuration',
            updated_at: new Date().toISOString()
          })
      } catch (err) {
        console.error('Error autosaving NoCors toggle to database:', err)
      }
    }
  }

  const [tableCounts, setTableCounts] = useState({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  
  // Selection state (default all true)
  const [selectedTables, setSelectedTables] = useState(
    BACKUP_TABLES.reduce((acc, table) => ({ ...acc, [table.name]: true }), {})
  )
  
  // Operation status for each table: { [tableName]: { status: 'idle' | 'fetching' | 'uploading' | 'success' | 'failed', message: '', progress: 0 } }
  const [syncStatus, setSyncStatus] = useState(
    BACKUP_TABLES.reduce((acc, table) => ({ 
      ...acc, 
      [table.name]: { status: 'idle', message: '', progress: 0 } 
    }), {})
  )

  const [isBulkSyncing, setIsBulkSyncing] = useState(false)
  const [isBulkDownloading, setIsBulkDownloading] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const googleScriptCode = `function doGet(e) {
  try {
    const tableName = e.parameter.table || "products";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Find sheet case-insensitively
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      const sheets = ss.getSheets();
      for (let s of sheets) {
        const sName = s.getName().toLowerCase().trim();
        const tName = tableName.toLowerCase().trim();
        if (sName === tName || sName.replace(/\\s+/g, '') === tName.replace(/\\s+/g, '')) {
          sheet = s;
          break;
        }
      }
    }
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Sheet '" + tableName + "' not found in spreadsheet." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        rows: [] 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const headers = values[0];
    const resultRows = [];
    for (let i = 1; i < values.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        const val = values[i][j];
        if (typeof val === 'string' && (val.startsWith('{') && val.endsWith('}') || val.startsWith('[') && val.endsWith(']'))) {
          try {
            row[headers[j]] = JSON.parse(val);
          } catch (err) {
            row[headers[j]] = val;
          }
        } else {
          row[headers[j]] = val;
        }
      }
      resultRows.push(row);
    }
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      rows: resultRows 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const tableName = data.tableName || "products";
    const rows = data.rows || [];
    
    // Connection test route
    if (tableName === "OZO_Test") {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "OZO has successfully established a secure link to your Google Spreadsheet!" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Action read route
    if (data.action === "read") {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      
      // Find sheet case-insensitively
      let sheet = ss.getSheetByName(tableName);
      if (!sheet) {
        const sheets = ss.getSheets();
        for (let s of sheets) {
          const sName = s.getName().toLowerCase().trim();
          const tName = tableName.toLowerCase().trim();
          if (sName === tName || sName.replace(/\\s+/g, '') === tName.replace(/\\s+/g, '')) {
            sheet = s;
            break;
          }
        }
      }
      
      // Try to find any sheet containing tableName as fallback
      if (!sheet) {
        const sheets = ss.getSheets();
        for (let s of sheets) {
          if (s.getName().toLowerCase().includes(tableName.toLowerCase())) {
            sheet = s;
            break;
          }
        }
      }
      
      // Ultimate fallback: if no sheet matched, use the first sheet
      if (!sheet && ss.getSheets().length > 0) {
        sheet = ss.getSheets()[0];
      }

      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: "No sheets found in spreadsheet." 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const values = sheet.getDataRange().getValues();
      if (values.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          rows: [] 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const headers = values[0];
      const resultRows = [];
      for (let i = 1; i < values.length; i++) {
        const row = {};
        for (let j = 0; j < headers.length; j++) {
          const val = values[i][j];
          if (typeof val === 'string' && (val.startsWith('{') && val.endsWith('}') || val.startsWith('[') && val.endsWith(']'))) {
            try {
              row[headers[j]] = JSON.parse(val);
            } catch (err) {
              row[headers[j]] = val;
            }
          } else {
            row[headers[j]] = val;
          }
        }
        resultRows.push(row);
      }
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        rows: resultRows 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (rows.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        message: "No rows to backup" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
    } else {
      sheet.clear();
    }
    
    // Get headers
    const headers = Object.keys(rows[0]);
    sheet.appendRow(headers);
    
    // Format values (objects to JSON strings, handle nulls)
    const dataRows = rows.map(row => headers.map(header => {
      const val = row[header];
      if (val === null || val === undefined) return "";
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    }));
    
    // Write in batch to prevent execution timeout
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
    
    // Auto-fit column widths
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: "Successfully synced " + dataRows.length + " rows into sheet '" + tableName + "'" 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  useEffect(() => {
    fetchTableCounts()
    loadBackupConfig()
  }, [])

  const loadBackupConfig = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('app_settings')
        .select('*')
        .eq('key', 'backup_config')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data && data.value) {
        const config = data.value
        if (config.webhook_url) {
          setWebhookUrl(config.webhook_url)
        }
        if (config.use_nocors !== undefined) {
          setUseNoCors(config.use_nocors)
        }
      }
    } catch (err) {
      console.error('Error loading backup config from database:', err)
    }
  }

  const fetchTableCounts = async () => {
    setLoadingCounts(true)
    const counts = {}
    for (const table of BACKUP_TABLES) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table.name)
          .select('*', { count: 'exact', head: true })
        
        if (error) throw error
        counts[table.name] = count || 0
      } catch (err) {
        console.error(`Error fetching count for table ${table.name}:`, err)
        counts[table.name] = 'Error'
      }
    }
    setTableCounts(counts)
    setLoadingCounts(false)
  }

  const handleWebhookUrlChange = (url) => {
    setWebhookUrl(url)
  }

  const handleSaveWebhookDirect = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a Webhook URL first.')
      return
    }

    const saveToast = toast.loading('Saving Webhook settings to database...')

    try {
      // Local backup
      localStorage.setItem('ozo_google_webhook', webhookUrl.trim())
      localStorage.setItem('ozo_webhook_nocors', useNoCors ? 'true' : 'false')

      // DB save/upsert
      const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert({
          key: 'backup_config',
          value: {
            webhook_url: webhookUrl.trim(),
            use_nocors: useNoCors
          },
          description: 'Google Sheets sync hub Webhook configuration',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Webhook settings successfully saved to Database!', { id: saveToast })
    } catch (err) {
      console.error('Error saving config to DB:', err)
      toast.error(`Saved locally, but DB upsert failed: ${err.message}`, { id: saveToast, duration: 4000 })
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(googleScriptCode)
    setCopiedCode(true)
    toast.success('Google Apps Script copied!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Bypasses default 1000-row Supabase API query limit
  const fetchAllTableRows = async (tableName, onProgressUpdate) => {
    let allRows = []
    let from = 0
    const limit = 1000
    let hasMore = true
    const estimatedTotal = tableCounts[tableName] || 1000

    onProgressUpdate('fetching', `Fetching items from DB...`, 10)

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .range(from, from + limit - 1)
      
      if (error) {
        throw new Error(error.message)
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allRows = [...allRows, ...data]
        const percent = Math.min(Math.round((allRows.length / estimatedTotal) * 80), 80)
        onProgressUpdate('fetching', `Fetched ${allRows.length} items...`, percent)
        
        if (data.length < limit) {
          hasMore = false
        } else {
          from += limit
        }
      }
    }

    onProgressUpdate('fetching', `Fetched all ${allRows.length} items.`, 80)
    return allRows
  }

  const convertToCSV = (rows) => {
    if (!rows || rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    const csvRows = [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const val = row[header]
        let cellStr = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val)
        // Escape quotes, carriage returns, commas
        cellStr = cellStr.replace(/"/g, '""')
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('\r') || cellStr.includes('"')) {
          cellStr = `"${cellStr}"`
        }
        return cellStr
      }).join(','))
    ]
    return csvRows.join('\n')
  }

  const triggerDownload = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Connects to Google App Script using CORS & text/plain to bypass OPTIONS preflight issues
  const postToGoogleSheet = async (tableName, rows, onProgressUpdate) => {
    if (!webhookUrl.trim()) {
      throw new Error('Google Webhook URL not configured')
    }

    onProgressUpdate('uploading', `Connecting to Google Drive...`, 85)

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: useNoCors ? 'no-cors' : 'cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          tableName,
          rows
        })
      })

      if (useNoCors) {
        onProgressUpdate('success', 'Backup sent! (Check your Google Sheet)', 100)
        return { success: true, message: 'Backup sent successfully via CORS Bypass mode.' }
      }

      const resText = await response.text()
      let result = { success: false, error: 'Empty response from Google Webapp' }
      
      try {
        result = JSON.parse(resText)
      } catch (parseErr) {
        throw new Error(`Google Apps Script did not return valid JSON: ${resText.substring(0, 150)}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed sync operation')
      }

      onProgressUpdate('success', result.message || 'Synced successfully!', 100)
      return result
    } catch (err) {
      let friendlyError = err.message || 'Google Sheets network request failed'
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        friendlyError = "Failed to fetch (Google CORS/Auth block). Make sure 'Who has access' is set to 'Anyone' when deploying. Also, Google blocks direct fetches if multiple Gmail accounts are logged in. Try Incognito / Private window, or turn on 'CORS Bypass Mode' below."
      }
      onProgressUpdate('failed', friendlyError, 100)
      throw new Error(friendlyError)
    }
  }

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please input a Google Sheets Webhook URL first.')
      return
    }

    setIsTestingConnection(true)
    const testToast = toast.loading('Testing connection to Google Sheets...')

    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        mode: useNoCors ? 'no-cors' : 'cors',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          tableName: 'OZO_Test',
          rows: [{ message: 'OZO Connection Successful!', timestamp: new Date().toISOString() }]
        })
      })

      if (useNoCors) {
        toast.success('Test payload sent! Verify if sheet "OZO_Test" was created or updated.', { id: testToast, duration: 6000 })
        return
      }

      const resText = await response.text()
      const result = JSON.parse(resText)

      if (result.success) {
        toast.success(result.message || 'Connected successfully!', { id: testToast })
      } else {
        throw new Error(result.error || 'Google script error')
      }
    } catch (err) {
      console.error(err)
      let friendlyError = err.message
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        friendlyError = "Google blocked the request (CORS/Authentication). Make sure 'Who has access' is set to 'Anyone' when deploying. If you have multiple Gmail accounts logged in, please use an Incognito / Private window, or turn on 'CORS Bypass Mode' below."
      }
      toast.error(`Connection failed: ${friendlyError}`, { id: testToast, duration: 6005 })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleDownloadSingleTable = async (tableName, format = 'csv') => {
    const tableInfo = BACKUP_TABLES.find(t => t.name === tableName)
    const toastId = toast.loading(`Preparing export for ${tableInfo.displayName}...`)
    
    try {
      const rows = await fetchAllTableRows(tableName, (status, msg, pct) => {
        setSyncStatus(prev => ({
          ...prev,
          [tableName]: { status, message: msg, progress: pct }
        }))
      })

      if (!rows || rows.length === 0) {
        toast.error('Table is empty. No data to download.', { id: toastId })
        setSyncStatus(prev => ({
          ...prev,
          [tableName]: { status: 'idle', message: 'Table is empty', progress: 0 }
        }))
        return
      }

      if (format === 'csv') {
        const csvContent = convertToCSV(rows)
        triggerDownload(csvContent, `ozo_backup_${tableName}_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;')
      } else {
        const jsonContent = JSON.stringify(rows, null, 2)
        triggerDownload(jsonContent, `ozo_backup_${tableName}_${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8;')
      }

      toast.success(`${tableInfo.displayName} downloaded successfully!`, { id: toastId })
      setSyncStatus(prev => ({
        ...prev,
        [tableName]: { status: 'idle', message: 'Downloaded successfully', progress: 0 }
      }))
    } catch (err) {
      console.error(err)
      toast.error(`Download failed: ${err.message}`, { id: toastId })
      setSyncStatus(prev => ({
        ...prev,
        [tableName]: { status: 'failed', message: `Download failed: ${err.message}`, progress: 100 }
      }))
    }
  }

  const handleSyncSingleTable = async (tableName) => {
    if (!webhookUrl.trim()) {
      toast.error('Please configure your Google Webhook URL first.')
      return
    }

    const tableInfo = BACKUP_TABLES.find(t => t.name === tableName)
    const toastId = toast.loading(`Syncing ${tableInfo.displayName} to Google Sheets...`)

    try {
      const rows = await fetchAllTableRows(tableName, (status, msg, pct) => {
        setSyncStatus(prev => ({
          ...prev,
          [tableName]: { status, message: msg, progress: pct }
        }))
      })

      await postToGoogleSheet(tableName, rows, (status, msg, pct) => {
        setSyncStatus(prev => ({
          ...prev,
          [tableName]: { status, message: msg, progress: pct }
        }))
      })

      toast.success(`${tableInfo.displayName} synced to Google Sheets!`, { id: toastId })
      localStorage.setItem('ozo_last_backup_time', new Date().toLocaleString())
    } catch (err) {
      console.error(err)
      toast.error(`Sync failed: ${err.message}`, { id: toastId })
    }
  }

  const handleSyncSelected = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please configure your Google Webhook URL first.')
      return
    }

    const tablesToSync = BACKUP_TABLES.filter(t => selectedTables[t.name])
    if (tablesToSync.length === 0) {
      toast.error('No tables selected for syncing.')
      return
    }

    setIsBulkSyncing(true)
    const bulkToast = toast.loading(`Starting bulk sync of ${tablesToSync.length} tables...`)
    let successCount = 0
    let failedCount = 0

    // Reset sync status for selected tables
    setSyncStatus(prev => {
      const updated = { ...prev }
      tablesToSync.forEach(t => {
        updated[t.name] = { status: 'idle', message: 'Queued for sync...', progress: 0 }
      })
      return updated
    })

    // Sync in sequence to avoid network overload
    for (const table of tablesToSync) {
      try {
        const rows = await fetchAllTableRows(table.name, (status, msg, pct) => {
          setSyncStatus(prev => ({
            ...prev,
            [table.name]: { status, message: msg, progress: pct }
          }))
        })

        await postToGoogleSheet(table.name, rows, (status, msg, pct) => {
          setSyncStatus(prev => ({
            ...prev,
            [table.name]: { status, message: msg, progress: pct }
          }))
        })

        successCount++
      } catch (err) {
        console.error(`Sync failed for ${table.name}:`, err)
        failedCount++
      }
    }

    setIsBulkSyncing(false)
    if (failedCount === 0) {
      toast.success(`Success! All ${successCount} tables synced to Google Sheets.`, { id: bulkToast })
      localStorage.setItem('ozo_last_backup_time', new Date().toLocaleString())
    } else {
      toast.error(`Sync completed with errors: ${successCount} Succeeded, ${failedCount} Failed.`, { id: bulkToast, duration: 5000 })
    }
  }

  const handleDownloadAllJSON = async () => {
    const tablesToDownload = BACKUP_TABLES.filter(t => selectedTables[t.name])
    if (tablesToDownload.length === 0) {
      toast.error('No tables selected for download.')
      return
    }

    setIsBulkDownloading(true)
    const downloadToast = toast.loading(`Compiling database backup...`)
    const fullBackup = {}

    // Reset status for selected tables
    setSyncStatus(prev => {
      const updated = { ...prev }
      tablesToDownload.forEach(t => {
        updated[t.name] = { status: 'idle', message: 'Fetching...', progress: 0 }
      })
      return updated
    })

    try {
      for (const table of tablesToDownload) {
        const rows = await fetchAllTableRows(table.name, (status, msg, pct) => {
          setSyncStatus(prev => ({
            ...prev,
            [table.name]: { status, message: msg, progress: pct }
          }))
        })
        fullBackup[table.name] = rows
        
        setSyncStatus(prev => ({
          ...prev,
          [table.name]: { status: 'idle', message: 'Ready in ZIP/JSON payload', progress: 100 }
        }))
      }

      const backupString = JSON.stringify(fullBackup, null, 2)
      triggerDownload(
        backupString, 
        `ozo_full_db_backup_${new Date().toISOString().slice(0, 10)}.json`, 
        'application/json;charset=utf-8;'
      )

      toast.success(`Complete backup JSON generated successfully!`, { id: downloadToast })
    } catch (err) {
      console.error(err)
      toast.error(`Bulk compilation failed: ${err.message}`, { id: downloadToast })
    } finally {
      setIsBulkDownloading(false)
    }
  }

  const toggleSelectTable = (tableName) => {
    setSelectedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }))
  }

  const selectAll = () => {
    setSelectedTables(BACKUP_TABLES.reduce((acc, t) => ({ ...acc, [t.name]: true }), {}))
  }

  const selectNone = () => {
    setSelectedTables(BACKUP_TABLES.reduce((acc, t) => ({ ...acc, [t.name]: false }), {}))
  }

  const lastBackupTime = localStorage.getItem('ozo_last_backup_time') || 'Never'

  // --- DATABASE RESTORE / IMPORT STATE ---
  const [restoreMethod, setRestoreMethod] = useState('sheets') // 'sheets' | 'file' | 'paste'
  const [restoreData, setRestoreData] = useState(null)
  const [restoreFileName, setRestoreFileName] = useState('')
  const [restorePasteText, setRestorePasteText] = useState('')
  const [isFetchingFromSheets, setIsFetchingFromSheets] = useState(false)
  const [isApplyingRestore, setIsApplyingRestore] = useState(false)
  const [syncMode, setSyncMode] = useState('oos_only') // Default to 'oos_only' (user wants to recover manual out-of-stock data)
  const [restoreError, setRestoreError] = useState('')
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('')
  const [restoreSummary, setRestoreSummary] = useState(null)
  const [sheetRestoreName, setSheetRestoreName] = useState('products')

  // CSV parsing helper
  const parseCSV = (text) => {
    const lines = []
    let row = [""]
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      const next = text[i + 1]

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (c === ',' && !inQuotes) {
        row.push('')
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++
        }
        lines.push(row)
        row = [""]
      } else {
        row[row.length - 1] += c
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row)
    }

    if (lines.length <= 1) return []

    const headers = lines[0].map(h => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
      if (values.length !== headers.length) continue
      const item = {}
      for (let j = 0; j < headers.length; j++) {
        let val = values[j]
        if (val.startsWith('{') && val.endsWith('}') || val.startsWith('[') && val.endsWith(']')) {
          try {
            val = JSON.parse(val)
          } catch (e) {
            // Keep string
          }
        } else if (val === 'true' || val === 'TRUE') {
          val = true
        } else if (val === 'false' || val === 'FALSE') {
          val = false
        } else if (!isNaN(val) && val.trim() !== '') {
          val = Number(val)
        }
        item[headers[j]] = val
      }
      data.push(item)
    }
    return data
  }

  const processImportedData = (data) => {
    setRestoreSuccessMsg('')
    setRestoreError('')
    const normalizedData = data.map(row => {
      const normalized = {}
      Object.keys(row).forEach(k => {
        const normKey = k.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim()
        normalized[normKey] = row[k]
      })
      return normalized
    })
    
    setRestoreData(normalizedData)
    const sample = normalizedData.slice(0, 3)
    setRestoreSummary({
      parsedCount: normalizedData.length,
      sampleRows: sample
    })
  }

  const handleFetchFromSheets = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Configure your Google Sheets Webhook URL first.')
      return
    }
    
    setIsFetchingFromSheets(true)
    setRestoreError('')
    const fetchToast = toast.loading(`Connecting to Google Sheets and fetching records from sheet "${sheetRestoreName}"...`)
    
    try {
      const response = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: JSON.stringify({
          action: 'read',
          tableName: sheetRestoreName.trim()
        })
      })
      
      const resText = await response.text()
      let result;
      try {
        result = JSON.parse(resText)
      } catch (e) {
        throw new Error(`Google Sheet returned invalid response format: ${resText.substring(0, 150)}`)
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to pull from Google Sheets.')
      }
      
      const rows = result.rows || []
      if (rows.length === 0) {
        throw new Error(`The sheet "${sheetRestoreName}" is empty, could not be found, or your Google Apps Script is outdated. Make sure you copied the latest Apps Script code from the setup guide, saved, deployed it as "Anyone", and specified the correct sheet name.`)
      }
      
      processImportedData(rows)
      toast.success(`Successfully pulled ${rows.length} product records from Google Sheets!`, { id: fetchToast })
    } catch (err) {
      console.error(err)
      const msg = err.name === 'TypeError' && err.message === 'Failed to fetch' 
        ? 'Network/CORS error fetching from Google Sheets. Make sure the Google script deployment access is set to "Anyone" and you are in an Incognito tab if using multiple Gmail accounts.'
        : err.message;
      setRestoreError(msg)
      toast.error(`Fetch failed: ${msg}`, { id: fetchToast, duration: 8000 })
    } finally {
      setIsFetchingFromSheets(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setRestoreFileName(file.name)
    setRestoreError('')
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        let parsedData = []
        
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text)
          if (json && !Array.isArray(json) && json.products) {
            parsedData = json.products
          } else if (Array.isArray(json)) {
            parsedData = json
          } else {
            throw new Error('JSON file must be an array of products or a full backup containing a "products" list.')
          }
        } else if (file.name.endsWith('.csv')) {
          parsedData = parseCSV(text)
        } else {
          throw new Error('Unsupported file format. Please upload a .json or .csv file.')
        }
        
        if (parsedData.length === 0) {
          throw new Error('No product records found in the uploaded file.')
        }
        
        processImportedData(parsedData)
        toast.success(`Loaded ${parsedData.length} records from ${file.name}`)
      } catch (err) {
        console.error(err)
        setRestoreError(err.message)
        toast.error(`Failed to parse file: ${err.message}`, { duration: 5000 })
      }
    }
    
    reader.readAsText(file)
  }

  const handlePasteSync = () => {
    if (!restorePasteText.trim()) {
      toast.error('Please paste JSON or CSV data first.')
      return
    }
    
    setRestoreError('')
    try {
      let parsedData = []
      const trimmedText = restorePasteText.trim()
      
      if (trimmedText.startsWith('[') || trimmedText.startsWith('{')) {
        const json = JSON.parse(trimmedText)
        if (json && !Array.isArray(json) && json.products) {
          parsedData = json.products
        } else if (Array.isArray(json)) {
          parsedData = json
        } else {
          throw new Error('Pasted JSON must be an array of products or a full backup containing a "products" list.')
        }
      } else {
        parsedData = parseCSV(trimmedText)
      }
      
      if (parsedData.length === 0) {
        throw new Error('No product records detected. Ensure you paste valid JSON or CSV columns.')
      }
      
      processImportedData(parsedData)
      toast.success(`Successfully parsed ${parsedData.length} products from pasted text!`)
    } catch (err) {
      console.error(err)
      setRestoreError(err.message)
      toast.error(`Parse failed: ${err.message}`)
    }
  }

  const handleApplyRestore = async () => {
    if (!restoreData || restoreData.length === 0) {
      toast.error('No data to restore.')
      return
    }
    
    setIsApplyingRestore(true)
    const restoreToast = toast.loading('Applying updates to Supabase products...')
    
    try {
      const batchSize = 80
      let totalUpdated = 0
      
      for (let i = 0; i < restoreData.length; i += batchSize) {
        const batch = restoreData.slice(i, i + batchSize)
        let sql = ''
        
        const escapeSqlValue = (val) => {
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'boolean') return val ? 'true' : 'false'
          if (typeof val === 'number') return String(val)
          return `'${String(val).replace(/'/g, "''")}'`
        }
        
        const validBatch = batch.filter(row => {
          const identifier = row.slug || row.id || row.blinkit_product_id
          return !!identifier
        })
        
        if (validBatch.length === 0) continue
        
        if (syncMode === 'availability_only') {
          const caseStatements = validBatch
            .filter(p => p.slug)
            .map(p => {
              const avail = p.is_available === true || p.is_available === 'true' || p.is_available === 1 || String(p.is_available).toLowerCase() === 'true'
              return `WHEN ${escapeSqlValue(p.slug)} THEN ${avail}`
            })
            .join(' ')
            
          const slugs = validBatch.filter(p => p.slug).map(p => escapeSqlValue(p.slug)).join(',')
          
          if (caseStatements) {
            sql = `UPDATE public.products SET is_available = CASE slug ${caseStatements} END, updated_at = NOW() WHERE slug IN (${slugs});`
          }
        } 
        else if (syncMode === 'oos_only') {
          const oosSlugs = validBatch
            .filter(p => {
              const isAvail = p.is_available === true || p.is_available === 'true' || p.is_available === 1 || String(p.is_available).toLowerCase() === 'true'
              const isStockZero = p.stock_quantity !== undefined && (parseInt(p.stock_quantity) === 0)
              const isQtyZero = p.quantity_available !== undefined && (parseInt(p.quantity_available) === 0)
              return !isAvail || isStockZero || isQtyZero
            })
            .map(p => escapeSqlValue(p.slug))
            .filter(s => !!s)
            
          if (oosSlugs.length > 0) {
            sql = `UPDATE public.products SET is_available = false, updated_at = NOW() WHERE slug IN (${oosSlugs.join(',')});`
          }
        } 
        else if (syncMode === 'availability_stock') {
          const caseAvail = validBatch
            .filter(p => p.slug)
            .map(p => {
              const avail = p.is_available === true || p.is_available === 'true' || p.is_available === 1 || String(p.is_available).toLowerCase() === 'true'
              return `WHEN ${escapeSqlValue(p.slug)} THEN ${avail}`
            })
            .join(' ')
            
          const caseStock = validBatch
            .filter(p => p.slug)
            .map(p => {
              const qty = parseInt(p.quantity_available || p.stock_quantity || 0)
              return `WHEN ${escapeSqlValue(p.slug)} THEN ${qty}`
            })
            .join(' ')
            
          const slugs = validBatch.filter(p => p.slug).map(p => escapeSqlValue(p.slug)).join(',')
          
          if (caseAvail && caseStock) {
            sql = `UPDATE public.products SET is_available = CASE slug ${caseAvail} END, quantity_available = CASE slug ${caseStock} END, updated_at = NOW() WHERE slug IN (${slugs});`
          }
        } 
        else if (syncMode === 'full_overwrite') {
          const statements = validBatch.map(p => {
            const matchCol = p.slug ? 'slug' : 'id'
            const matchVal = p.slug || p.id
            
            const updates = []
            if (p.price !== undefined) updates.push(`price = ${Number(p.price) || 0}`)
            if (p.mrp !== undefined) updates.push(`mrp = ${Number(p.mrp) || 0}`)
            if (p.is_available !== undefined) {
              const avail = p.is_available === true || p.is_available === 'true' || p.is_available === 1 || String(p.is_available).toLowerCase() === 'true'
              updates.push(`is_available = ${avail}`)
            }
            if (p.quantity_available !== undefined || p.stock_quantity !== undefined) {
              updates.push(`quantity_available = ${parseInt(p.quantity_available || p.stock_quantity || 0)}`)
            }
            if (p.image_url !== undefined) updates.push(`image_url = ${escapeSqlValue(p.image_url)}`)
            if (p.brand !== undefined) updates.push(`brand = ${escapeSqlValue(p.brand)}`)
            if (p.description !== undefined) updates.push(`description = ${escapeSqlValue(p.description)}`)
            
            if (updates.length === 0) return ''
            
            return `UPDATE public.products SET ${updates.join(', ')}, updated_at = NOW() WHERE ${matchCol} = ${escapeSqlValue(matchVal)};`
          }).filter(s => !!s)
          
          if (statements.length > 0) {
            sql = `DO $$\nBEGIN\n${statements.join('\n')}\nEND $$;`
          }
        }
        
        if (sql) {
          const { data, error } = await supabaseAdmin.rpc('exec_sql', { query_text: sql })
          if (error) throw new Error(error.message)
          if (data && data.success === false) throw new Error(data.error)
          
          totalUpdated += validBatch.length
        }
      }
      
      toast.success(`Success! Successfully synchronized ${totalUpdated} product settings.`, { id: restoreToast, duration: 5000 })
      setRestoreSuccessMsg(`Database synced successfully! Updated ${totalUpdated} products according to the selected mode.`)
      setRestoreData(null)
      setRestoreSummary(null)
      fetchTableCounts()
    } catch (err) {
      console.error(err)
      toast.error(`Restore failed: ${err.message}`, { id: restoreToast, duration: 6000 })
    } finally {
      setIsApplyingRestore(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Database className="w-80 h-80 rotate-12 translate-x-12 translate-y-12" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Cloud className="w-3.5 h-3.5" />
            Cloud Storage Integration
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 leading-tight">
            Database Backup & Google Sheets Sync Hub
          </h1>
          <p className="mt-2 text-white/85 text-sm sm:text-base font-medium">
            Keep your business data safe. Directly download table backups as spreadsheets or execute a secure one-click synchronisation of product records, image URLs, prices, and orders into your personal Google Sheets storage.
          </p>
        </div>
      </div>

      {/* Grid: Overview Stats and Webhook Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sync Controls & Overview Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Stats Panel */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-5">
            <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-ozo-green" />
              Backup Overview
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between border border-transparent dark:border-white/5">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">Database Tables</p>
                  <p className="text-2xl font-black mt-1 text-gray-850 dark:text-white">{BACKUP_TABLES.length}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-950/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between border border-transparent dark:border-white/5">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">Last Cloud Sync</p>
                  <p className="text-sm font-black mt-1 text-gray-800 dark:text-white">{lastBackupTime}</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleSyncSelected}
                disabled={isBulkSyncing || isBulkDownloading || !webhookUrl}
                className="w-full flex items-center justify-center gap-2 bg-gradient-ozo text-white py-3.5 rounded-xl font-bold hover:shadow-ozo-lg active:scale-98 transition-all disabled:opacity-50"
              >
                {isBulkSyncing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Syncing Tables...
                  </>
                ) : (
                  <>
                    <Cloud className="w-5 h-5" />
                    Sync Selected to Sheets
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadAllJSON}
                disabled={isBulkSyncing || isBulkDownloading}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white py-3.5 rounded-xl font-bold active:scale-98 transition-all disabled:opacity-50 border border-transparent dark:border-white/5"
              >
                {isBulkDownloading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Compiling Backup JSON...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download JSON Backup
                  </>
                )}
              </button>

              {!webhookUrl && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-[11px] font-semibold leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>Sync to Google Sheets requires configuring the Webhook URL in the panel below.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Webhook Configuration & Apps Script Guide */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-ozo-red" />
                Google Drive Sheets Settings
              </h3>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-ozo-red hover:underline font-bold flex items-center gap-1"
              >
                {showGuide ? 'Hide Setup Guide' : 'Show Setup Guide'}
                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Webhook Input Field */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
                Google Apps Script Web App Webhook URL
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webhookUrl}
                  onChange={(e) => handleWebhookUrlChange(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent transition-all font-mono"
                />
                <div className="flex gap-2.5">
                  <button
                    onClick={handleSaveWebhookDirect}
                    className="flex-1 sm:flex-initial bg-gradient-ozo text-white px-5 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Link
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !webhookUrl}
                    className="flex-1 sm:flex-initial bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white px-5 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all border border-transparent dark:border-white/5 whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTestingConnection ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Test Link
                  </button>
                </div>
              </div>
            </div>

            {/* CORS Bypass Mode Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/5">
              <div className="flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-ozo-red mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                    CORS Bypass Mode (For Multi-Account Users)
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                    Google Web Apps block fetches when multiple Gmail accounts are logged in. Turn this ON to bypass CORS blocks by sending background "opaque" requests (Sync will work, but response messages won't be readable).
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleNoCors(!useNoCors)}
                className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex-shrink-0 relative ${
                  useNoCors ? 'bg-ozo-red' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 absolute top-1 left-1 ${
                    useNoCors ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Setup Guide instructions */}
            <AnimatePresence>
              {showGuide && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-black/30 p-5 rounded-2xl border border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-center gap-2 text-gray-850 dark:text-white font-bold">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    How to Setup your Google Sheets Sync:
                  </div>
                  
                  <ol className="list-decimal pl-5 space-y-2.5 text-xs sm:text-sm">
                    <li>Create a new spreadsheet inside your <strong>Google Drive</strong>.</li>
                    <li>Inside the Sheet, go to the top menu and click <strong>Extensions &gt; Apps Script</strong>.</li>
                    <li>Delete any existing code in the editor and paste the Apps Script template shown below.</li>
                    <li>Click the <strong>Save</strong> disk icon, then click the <strong>Deploy</strong> button (top-right) &gt; <strong>New deployment</strong>.</li>
                    <li>Select type as <strong>Web app</strong> (gear icon). Set Description. Set Execute as: <strong>Me (your email)</strong>. Set Who has access: <strong>Anyone</strong>.</li>
                    <li>Click <strong>Deploy</strong>, grant permissions (Google will ask to authorize access to write to your spreadsheet), and copy the <strong>Web App URL</strong>.</li>
                    <li>Paste the copied URL in the field above and click <strong>Test Link</strong>!</li>
                  </ol>

                  {/* Copyable code block */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-bold">Apps Script Code Template</span>
                      <button
                        onClick={handleCopyCode}
                        className="text-xs text-ozo-red hover:underline font-bold flex items-center gap-1.5"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Code
                      </button>
                    </div>
                    <pre className="p-4 bg-gray-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[200px] border border-gray-800">
                      {googleScriptCode}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Restore & Sync-Back Console */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-ozo flex items-center justify-center text-white shadow-premium">
            <RefreshCw className="w-5 h-5 animate-none text-white" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-white">
              Database Restore & Sync-Back Console
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Sync product stock configurations back from Google Sheets, JSON files, or raw text blocks.
            </p>
          </div>
        </div>

        {/* Tabs for choosing Restore Method */}
        <div className="flex border-b border-gray-150 dark:border-white/5 pb-0.5 gap-4">
          <button
            type="button"
            onClick={() => {
              setRestoreMethod('sheets')
              setRestoreData(null)
              setRestoreSummary(null)
            }}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              restoreMethod === 'sheets'
                ? 'border-ozo-red text-ozo-red'
                : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
            }`}
          >
            Google Sheets Pull
          </button>
          <button
            type="button"
            onClick={() => {
              setRestoreMethod('file')
              setRestoreData(null)
              setRestoreSummary(null)
            }}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              restoreMethod === 'file'
                ? 'border-ozo-red text-ozo-red'
                : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
            }`}
          >
            JSON / CSV File Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setRestoreMethod('paste')
              setRestoreData(null)
              setRestoreSummary(null)
            }}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              restoreMethod === 'paste'
                ? 'border-ozo-red text-ozo-red'
                : 'border-transparent text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
            }`}
          >
            Raw Data Paste
          </button>
        </div>

        {/* Tab contents */}
        <div className="space-y-4">
          {restoreMethod === 'sheets' && (
            <div className="p-5 bg-gray-50 dark:bg-black/35 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-800 dark:text-white">
                    Google Sheets Restoration
                  </p>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    This will send a query request to your Apps Script Web App URL to retrieve the specified sheet contents. 
                    Ensure that CORS Bypass Mode is <strong>disabled</strong> on this page if you want script responses to be readable in the browser, and verify your deployment has authorized permissions.
                  </p>
                </div>
              </div>

              {/* Sheet Name Input field */}
              <div className="space-y-1.5 max-w-xs">
                <label className="text-[10px] text-gray-450 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Sheet Name in Google Spreadsheet
                </label>
                <input
                  type="text"
                  placeholder="products"
                  value={sheetRestoreName}
                  onChange={(e) => setSheetRestoreName(e.target.value)}
                  className="w-full bg-white dark:bg-[#121212]/80 border border-gray-200 dark:border-white/10 text-gray-950 dark:text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ozo-red"
                />
                <p className="text-[9.5px] text-gray-400 leading-normal">
                  Case-insensitive. e.g. "products", "Products Catalog", or "Sheet1". If not found, the script will automatically fallback to similar names or your active sheet.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleFetchFromSheets}
                  disabled={isFetchingFromSheets || !webhookUrl}
                  className="bg-gradient-ozo text-white px-5 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isFetchingFromSheets ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  {isFetchingFromSheets ? 'Fetching Records...' : 'Fetch Product Data from Sheet'}
                </button>
                {!webhookUrl && (
                  <span className="text-[10px] text-amber-500 font-bold">
                    ⚠️ Configure Webhook URL in panel above to pull sheets data.
                  </span>
                )}
              </div>
            </div>
          )}

          {restoreMethod === 'file' && (
            <div className="p-5 bg-gray-50 dark:bg-black/35 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-250 dark:border-white/10 rounded-2xl py-8 px-4 hover:border-ozo-red dark:hover:border-ozo-red/60 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-gray-400 group-hover:text-ozo-red transition-all duration-350" />
                <p className="text-xs font-bold text-gray-750 dark:text-gray-300 mt-3">
                  {restoreFileName || 'Drag and drop your JSON or CSV backup here'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Supports full database backup JSON or individual products CSV tables
                </p>
              </div>
            </div>
          )}

          {restoreMethod === 'paste' && (
            <div className="p-5 bg-gray-50 dark:bg-black/35 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-450 dark:text-gray-400 font-bold uppercase tracking-wider block">
                  Paste JSON Array or CSV text block
                </label>
                <textarea
                  placeholder='[{"slug": "sample-product", "is_available": false}, ...]'
                  value={restorePasteText}
                  onChange={(e) => setRestorePasteText(e.target.value)}
                  rows={6}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent transition-all font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handlePasteSync}
                className="bg-gradient-ozo text-white px-5 py-3 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Parse & Preview Data
              </button>
            </div>
          )}
        </div>

        {/* Error / Success Feedback */}
        {restoreError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-250/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 rounded-2xl text-xs font-semibold leading-relaxed flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{restoreError}</p>
          </div>
        )}

        {restoreSuccessMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/20 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-semibold leading-relaxed flex gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{restoreSuccessMsg}</p>
          </div>
        )}

        {/* Restore Action Console (Render when data is ready) */}
        {restoreData && restoreSummary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-250/20 dark:border-amber-900/20 rounded-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-amber-250/20 dark:border-amber-900/20 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-black text-gray-800 dark:text-white">
                  Synchronization Preview & Control
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {restoreSummary.parsedCount} records parsed
              </span>
            </div>

            {/* Sync Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Select Synchronization Mode
                </label>
                <select
                  value={syncMode}
                  onChange={(e) => setSyncMode(e.target.value)}
                  className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-250 dark:border-white/10 text-gray-800 dark:text-white rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-ozo-red"
                >
                  <option value="oos_only">
                    OOS Only: Mark matching products Out-of-Stock if OOS in backup (Safest)
                  </option>
                  <option value="availability_only">
                    Availability Only: Sync In-Stock/Out-of-Stock flags directly (No stock levels)
                  </option>
                  <option value="availability_stock">
                    Availability & Stock: Sync stock availability and count levels
                  </option>
                  <option value="full_overwrite">
                    Full Overwrite: Overwrite prices, image URLs, details & stock status
                  </option>
                </select>
              </div>

              {/* Mode Description */}
              <div className="p-3 bg-white dark:bg-black/30 rounded-xl border border-gray-150 dark:border-white/5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-755 dark:text-gray-300">
                    {syncMode === 'oos_only' && '⚠️ OOS Only Mode (Recommended)'}
                    {syncMode === 'availability_only' && '⚠️ Availability Only Mode'}
                    {syncMode === 'availability_stock' && '⚠️ Availability & Stock Mode'}
                    {syncMode === 'full_overwrite' && '🚨 Full Overwrite Mode (Critical)'}
                  </p>
                  <p className="text-[9.5px] text-gray-400 leading-normal mt-0.5">
                    {syncMode === 'oos_only' && 'Updates is_available = false ONLY for items marked as out-of-stock. Leaves currently active products unaffected. Ideal for restoring manual out-of-stock tags.'}
                    {syncMode === 'availability_only' && 'Updates the is_available flag for all matching products (marks them true or false matching backup). Does not touch prices or image columns.'}
                    {syncMode === 'availability_stock' && 'Updates both is_available and quantity_available. Ensures stock counters are matched exactly with spreadsheet.'}
                    {syncMode === 'full_overwrite' && 'Overwrites prices, MRP, discounts, images, and descriptions. Make sure your backup file columns match your current database schema.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sample Row Columns */}
            {restoreSummary.sampleRows.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Data Sample (First Row Detected Columns)
                </span>
                <div className="flex flex-wrap gap-1.5 p-3 bg-white dark:bg-black/30 rounded-xl border border-gray-150 dark:border-white/5">
                  {Object.keys(restoreSummary.sampleRows[0]).map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 text-gray-600 dark:text-gray-400 font-mono text-[9px] rounded-md font-bold"
                    >
                      {col}: {String(restoreSummary.sampleRows[0][col]).substring(0, 18)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Apply Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleApplyRestore}
                disabled={isApplyingRestore}
                className="flex-1 bg-gradient-ozo text-white py-3.5 rounded-xl font-bold text-xs active:scale-98 hover:shadow-ozo-lg transition-all flex items-center justify-center gap-2"
              >
                {isApplyingRestore ? (
                  <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                ) : (
                  <Check className="w-4.5 h-4.5 text-white" />
                )}
                {isApplyingRestore ? 'Applying Database Restoration...' : 'Apply Synchronization to Database'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestoreData(null)
                  setRestoreSummary(null)
                  setRestoreFileName('')
                }}
                disabled={isApplyingRestore}
                className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-white px-5 rounded-xl font-bold text-xs border border-transparent dark:border-white/5"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tables Selection & Individual Export Control */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-ozo-red" />
              Manage Tables & Backup Actions
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Select specific tables to bulk sync or download individual backups.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all border border-transparent dark:border-white/5"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all border border-transparent dark:border-white/5"
            >
              Deselect All
            </button>
            <button
              onClick={fetchTableCounts}
              className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 font-bold transition-all border border-transparent dark:border-white/5 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingCounts ? 'animate-spin' : ''}`} />
              Refresh Counts
            </button>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BACKUP_TABLES.map((table) => {
            const count = tableCounts[table.name]
            const isSelected = selectedTables[table.name]
            const statusInfo = syncStatus[table.name]
            const isSyncActive = statusInfo?.status === 'fetching' || statusInfo?.status === 'uploading'

            return (
              <div
                key={table.name}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-white/[0.01] border-gray-200 dark:border-white/10 shadow-sm'
                    : 'bg-gray-50/50 dark:bg-transparent border-gray-100 dark:border-white/5 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox selector */}
                  <button
                    onClick={() => toggleSelectTable(table.name)}
                    className="mt-1 text-gray-400 hover:text-ozo-red transition-all flex-shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-ozo-red" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/5">
                        {getTableIcon(table.icon)}
                      </div>
                      <h4 className="text-sm font-black text-gray-800 dark:text-white truncate">
                        {table.displayName}
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-300 px-2 py-0.5 rounded-full whitespace-nowrap ml-auto">
                        {loadingCounts ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                        ) : count === 'Error' ? (
                          <span className="text-rose-500 font-bold">Error</span>
                        ) : (
                          `${count} rows`
                        )}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                      {table.description}
                    </p>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 block mt-1">
                      Table ID: <code>public.{table.name}</code>
                    </span>
                  </div>
                </div>

                {/* Progress Bar (Visible when syncing) */}
                {isSyncActive && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                      <span className="animate-pulse">{statusInfo.message}</span>
                      <span>{statusInfo.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-150 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-ozo h-full transition-all duration-300"
                        style={{ width: `${statusInfo.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Indicator Messages */}
                {!isSyncActive && statusInfo && statusInfo.status !== 'idle' && (
                  <div className="mt-4">
                    {statusInfo.status === 'success' ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/25 dark:border-emerald-900/35 px-2.5 py-1.5 rounded-lg w-fit">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {statusInfo.message}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-250/25 dark:border-rose-900/35 px-2.5 py-1.5 rounded-lg w-fit">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {statusInfo.message}
                      </span>
                    )}
                  </div>
                )}

                {/* Table Actions */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => handleDownloadSingleTable(table.name, 'csv')}
                    disabled={isSyncActive || count === 0 || count === 'Error'}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-transparent dark:border-white/5 disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>

                  <button
                    onClick={() => handleDownloadSingleTable(table.name, 'json')}
                    disabled={isSyncActive || count === 0 || count === 'Error'}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-transparent dark:border-white/5 disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    JSON
                  </button>

                  <button
                    onClick={() => handleSyncSingleTable(table.name)}
                    disabled={isSyncActive || !webhookUrl || count === 0 || count === 'Error'}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-ozo text-white rounded-xl text-xs font-bold hover:shadow-ozo active:scale-95 transition-all disabled:opacity-45 disabled:shadow-none"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Sync Sheet
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Backup
