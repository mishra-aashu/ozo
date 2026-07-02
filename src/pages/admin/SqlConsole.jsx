import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Database,
  Play,
  FileText,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Grid
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const SQL_TEMPLATES = [
  {
    name: 'List All Products',
    query: 'SELECT id, name, price, mrp, category_id, is_available FROM public.products ORDER BY created_at DESC LIMIT 10;',
    description: 'Get a list of the 10 most recently added products.'
  },
  {
    name: 'List Categories',
    query: 'SELECT id, name, slug, display_order, is_active FROM public.categories ORDER BY display_order ASC;',
    description: 'List all categories sorted by their display order.'
  },
  {
    name: 'Recent Orders',
    query: 'SELECT id, order_number, total, status, payment_method, created_at FROM public.orders ORDER BY created_at DESC LIMIT 10;',
    description: 'Fetch the 10 most recent customer orders.'
  },
  {
    name: 'Check Users Role',
    query: "SELECT id, full_name, email, role, phone FROM public.users WHERE role = 'admin';",
    description: 'Find all administrators registered in the system.'
  },
  {
    name: 'Active Mart Locations',
    query: 'SELECT id, name, address, is_active FROM public.marts LIMIT 10;',
    description: 'View active warehouse/mart outlets.'
  },
  {
    name: 'Update Product Price (Template)',
    query: '-- WARNING: Always check WHERE clause before running updates\nUPDATE public.products \nSET price = 99.00 \nWHERE slug = \'premium-mithila-phool-makhana\';',
    description: 'Sample template to update a specific product price.'
  }
]

const SqlConsole = () => {
  const [sqlQuery, setSqlQuery] = useState(SQL_TEMPLATES[0].query)
  const [isRunning, setIsRunning] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [result, setResult] = useState(null)
  const [execTime, setExecTime] = useState(null)

  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a query to run.')
      return
    }

    setIsRunning(true)
    setResult(null)
    const startTime = performance.now()

    try {
      let queryToRun = sqlQuery.trim()
      if (/^(SELECT|WITH)\b/i.test(queryToRun)) {
        queryToRun = queryToRun.replace(/;\s*$/, '').trim()
      }
      const { data, error } = await supabase.rpc('exec_sql', {
        query_text: queryToRun
      })

      const endTime = performance.now()
      setExecTime((endTime - startTime).toFixed(1))

      if (error) {
        setResult({
          success: false,
          error: error.message || 'Supabase RPC error occurred.',
          details: error.details
        })
        toast.error('Query execution failed')
        return
      }

      if (data && data.success === false) {
        setResult({
          success: false,
          error: data.error || 'Execution returned false.',
          details: data.detail
        })
        toast.error('Query execution failed')
      } else {
        setResult({
          success: true,
          rows: data?.rows || [],
          message: data?.message || 'Query executed successfully.',
          rowsAffected: data?.rows_affected
        })
        toast.success('Query executed successfully')
      }
    } catch (err) {
      const endTime = performance.now()
      setExecTime((endTime - startTime).toFixed(1))
      setResult({
        success: false,
        error: err.message || 'An unexpected error occurred.'
      })
      toast.error('System error')
    } finally {
      setIsRunning(false)
    }
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    toast.success('Query copied to editor')
    setSqlQuery(text)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const renderResultTable = (rows) => {
    if (!rows || rows.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500 italic bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
          Empty set returned (0 rows).
        </div>
      )
    }

    const columns = Object.keys(rows[0])

    return (
      <div className="overflow-x-auto border border-gray-150 dark:border-white/5 rounded-2xl shadow-inner max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-150 dark:border-white/5 text-gray-400 font-bold uppercase tracking-wider sticky top-0 z-10">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-black whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#111] text-gray-800 dark:text-gray-200">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                {columns.map((col) => {
                  const val = row[col]
                  let displayVal = ''
                  if (val === null) {
                    displayVal = <span className="text-gray-400 italic">NULL</span>
                  } else if (typeof val === 'object') {
                    displayVal = JSON.stringify(val)
                  } else if (typeof val === 'boolean') {
                    displayVal = val ? (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-full font-bold text-[10px]">TRUE</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full font-bold text-[10px]">FALSE</span>
                    )
                  } else {
                    displayVal = String(val)
                  }
                  return (
                    <td key={col} className="px-4 py-3 font-mono truncate max-w-xs" title={String(val)}>
                      {displayVal}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Terminal className="w-80 h-80 rotate-12 translate-x-12 translate-y-12" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Database className="w-3.5 h-3.5" />
            Supabase Console
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 leading-tight">
            SQL Query Terminal
          </h1>
          <p className="mt-2 text-white/85 text-sm sm:text-base font-medium">
            Run raw PostgreSQL statements directly against the OZO database. Only user profiles with the 'admin' role are permitted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SQL Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Terminal className="w-4.5 h-4.5 text-ozo-red" />
                Query Editor
              </h3>
              <button
                onClick={() => setSqlQuery('')}
                className="text-xs text-gray-400 hover:text-ozo-red font-semibold hover:underline"
              >
                Clear Editor
              </button>
            </div>

            {/* Monospace Input Area */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-inner bg-gray-950 dark:bg-black p-4">
              <div className="absolute left-4 top-4 text-xs font-mono text-gray-600 select-none flex flex-col items-end pr-3 border-r border-gray-850 h-[calc(100%-2rem)]">
                {[...Array(Math.max(sqlQuery.split('\n').length, 8))].map((_, i) => (
                  <span key={i} className="leading-relaxed">{i + 1}</span>
                ))}
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM public.products LIMIT 5;"
                className="w-full pl-10 bg-transparent text-emerald-400 font-mono text-sm leading-relaxed focus:outline-none resize-y min-h-[220px] scrollbar-hide"
                spellCheck="false"
                style={{ tabSize: 2 }}
              />
            </div>

            {/* Run Button */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Prefix table names with <code>public.</code> schema
              </span>
              <button
                onClick={handleRunQuery}
                disabled={isRunning}
                className="flex items-center gap-2 bg-gradient-ozo text-white px-6 py-3 rounded-xl font-bold hover:shadow-ozo-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4.5 h-4.5 fill-current" />
                    Run Query
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Output Section */}
          {(result || isRunning) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-gray-800 dark:text-white">
                  Execution Output
                </h3>
                {execTime && (
                  <span className="text-[10px] uppercase tracking-wider bg-gray-50 dark:bg-white/5 text-gray-400 font-black px-2.5 py-1 rounded-full">
                    Time: {execTime} ms
                  </span>
                )}
              </div>

              {isRunning ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-gray-500">Query processed by Postgres engine...</p>
                </div>
              ) : result.success ? (
                <div className="space-y-4">
                  {/* Stats bar */}
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250/20 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span>{result.message}</span>
                      {result.rowsAffected !== undefined && (
                        <span className="ml-1 text-[11px] opacity-80">({result.rowsAffected} rows affected)</span>
                      )}
                      {result.rows && (
                        <span className="ml-1 text-[11px] opacity-80">({result.rows.length} rows returned)</span>
                      )}
                    </div>
                  </div>

                  {/* Table Display */}
                  {result.rows && renderResultTable(result.rows)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-250/20 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs leading-relaxed font-semibold">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Postgres Syntax Error</p>
                      <p className="mt-1 font-mono text-[11px] bg-red-100/50 dark:bg-red-950/30 p-2 rounded-lg break-all">
                        {result.error}
                      </p>
                      {result.details && (
                        <p className="mt-1 font-semibold text-[10px] opacity-75">
                          Detail: {result.details}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Query Templates Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-4">
            <div>
              <h3 className="text-base font-black text-gray-800 dark:text-white">
                Query Snippets
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Click template query to copy to the editor workspace.
              </p>
            </div>

            <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
              {SQL_TEMPLATES.map((tmpl, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopy(tmpl.query, idx)}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-ozo-red dark:hover:border-ozo-red/50 hover:bg-white dark:hover:bg-[#111] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white group-hover:text-ozo-red transition-colors flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-ozo-red transition-colors" />
                      {tmpl.name}
                    </h4>
                    <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                    {tmpl.description}
                  </p>
                  <code className="text-[9px] font-mono text-emerald-500/80 dark:text-emerald-400/80 bg-gray-100 dark:bg-black/40 p-1.5 rounded-lg mt-2.5 line-clamp-2 select-none border border-transparent dark:border-white/5">
                    {tmpl.query}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SqlConsole
