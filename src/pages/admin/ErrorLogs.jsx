import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  AlertOctagon,
  Search,
  Trash2,
  Calendar,
  Smartphone,
  Globe,
  User,
  RefreshCw,
  SlidersHorizontal,
  Terminal,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  LayoutGrid,
  Filter,
  Monitor
} from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabase'
import toast from 'react-hot-toast'

const getUrlPathname = (urlStr) => {
  if (!urlStr) return ''
  try {
    return new URL(urlStr).pathname
  } catch (e) {
    return urlStr
  }
}

const ErrorLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [componentFilter, setComponentFilter] = useState('all')
  const [selectedLog, setSelectedLog] = useState(null)
  const [expandedLogId, setExpandedLogId] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
    fatals: 0
  })

  // Fetch error logs
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseAdmin
        .from('error_logs')
        .select(`
          id,
          created_at,
          user_id,
          url,
          error_message,
          error_stack,
          component_name,
          device_info,
          city_slug,
          severity,
          user:users (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setLogs(data || [])
      calculateStats(data || [])
    } catch (err) {
      console.error('[ErrorLogs] Failed to fetch logs:', err)
      toast.error('Failed to load error logs')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const statsObj = {
      total: data.length,
      errors: data.filter(l => l.severity === 'error').length,
      warnings: data.filter(l => l.severity === 'warning').length,
      fatals: data.filter(l => l.severity === 'fatal').length
    }
    setStats(statsObj)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // Delete a single log
  const handleDeleteLog = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this log?')) return

    try {
      const { error } = await supabaseAdmin
        .from('error_logs')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Log deleted successfully')
      const updatedLogs = logs.filter(l => l.id !== id)
      setLogs(updatedLogs)
      calculateStats(updatedLogs)
      if (selectedLog?.id === id) setSelectedLog(null)
    } catch (err) {
      console.error('[ErrorLogs] Delete failed:', err)
      toast.error('Failed to delete log')
    }
  }

  // Clear all logs
  const handleClearAll = async () => {
    if (!window.confirm('CRITICAL: Are you sure you want to delete ALL error logs? This cannot be undone.')) return

    try {
      setLoading(true)
      const { error } = await supabaseAdmin
        .from('error_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Deletes all records safely

      if (error) throw error

      toast.success('All logs cleared')
      setLogs([])
      calculateStats([])
      setSelectedLog(null)
    } catch (err) {
      console.error('[ErrorLogs] Clear failed:', err)
      toast.error('Failed to clear logs')
    } finally {
      setLoading(false)
    }
  }

  // Get distinct components list
  const componentsList = ['all', ...new Set(logs.map(l => l.component_name).filter(Boolean))]

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.component_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.error_stack?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.city_slug?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter
    const matchesComponent = componentFilter === 'all' || log.component_name === componentFilter

    return matchesSearch && matchesSeverity && matchesComponent
  })

  // Format Date beautifully
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  // Get severity badge color
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'fatal':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'warning':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'info':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-500 text-white rounded-lg flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </span>
            <span className="text-xs font-black text-red-500 uppercase tracking-wider">Ozo Diagnostics</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mt-1.5">System Error Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time user exceptions, slow connections, or failed queries.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white px-5 py-3 rounded-2xl font-bold border border-gray-200/50 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading || logs.length === 0}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-650 text-white px-5 py-3 rounded-2xl font-bold active:scale-95 transition-all shadow-md shadow-red-500/10 w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Logs
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Logs', value: stats.total, color: 'text-gray-700 dark:text-gray-300', icon: Terminal, bg: 'bg-gray-50 dark:bg-white/5' },
          { title: 'Fatal Crashes', value: stats.fatals, color: 'text-red-500', icon: AlertOctagon, bg: 'bg-red-500/10 border border-red-500/20' },
          { title: 'Errors', value: stats.errors, color: 'text-rose-500', icon: AlertTriangle, bg: 'bg-rose-500/10 border border-rose-500/20' },
          { title: 'Warnings / Timeouts', value: stats.warnings, color: 'text-amber-500', icon: Clock, bg: 'bg-amber-500/10 border border-amber-500/20' }
        ].map((item, idx) => (
          <div key={idx} className={`p-5 rounded-3xl ${item.bg} flex items-center justify-between shadow-premium`}>
            <div>
              <p className="text-[10px] font-black text-gray-450 uppercase tracking-wider">{item.title}</p>
              <h3 className={`text-2xl font-black mt-1 ${item.color}`}>{item.value}</h3>
            </div>
            <div className={`p-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-sm`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by message, stack trace, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-gray-900 dark:text-white"
            />
          </div>

          {/* Selector Dropdowns */}
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            {/* Severity Filter */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-2xl border border-gray-200/50 dark:border-white/10 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 outline-none py-1 cursor-pointer w-full"
              >
                <option value="all">All Severities</option>
                <option value="fatal">Fatal</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Component Filter */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-2xl border border-gray-200/50 dark:border-white/10 w-full sm:w-auto">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-700 dark:text-gray-300 outline-none py-1 cursor-pointer w-full"
              >
                <option value="all">All Components</option>
                {componentsList.filter(c => c !== 'all').map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm font-semibold">Loading diagnostic logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <AlertTriangle className="w-10 h-10 text-gray-300" />
            <p className="text-sm font-semibold">No diagnostic logs found matching criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full text-left border-collapse hidden md:table">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#151515] text-[10px] font-black text-gray-450 uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Severity</th>
                  <th className="py-4 px-6">Component</th>
                  <th className="py-4 px-6">Message</th>
                  <th className="py-4 px-6">Context</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id
                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`border-b border-gray-100 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-red-500/2 dark:bg-red-500/5' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-xs text-gray-500 font-medium whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 text-[9px] font-black rounded-full border uppercase tracking-wider ${getSeverityStyle(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs font-black text-gray-800 dark:text-gray-200">
                          {log.component_name || 'Generic'}
                        </td>
                        <td className="py-4 px-6 max-w-xs lg:max-w-md">
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {log.error_message}
                          </div>
                          {log.url && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate font-mono">
                              {getUrlPathname(log.url)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1.5 items-start">
                            {log.user ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                  <User className="w-3.5 h-3.5 text-blue-500" />
                                  {log.user.full_name}
                                </span>
                                <span className="text-[9px] font-mono text-gray-400 block max-w-[150px] truncate" title={log.user_id}>
                                  ID: {log.user_id}
                                </span>
                              </div>
                            ) : log.user_id ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                  Unknown User
                                </span>
                                <span className="text-[9px] font-mono text-gray-400 block max-w-[150px] truncate" title={log.user_id}>
                                  ID: {log.user_id}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/2 px-2 py-0.5 rounded-md italic">
                                Guest Session
                              </span>
                            )}
                            {log.city_slug && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-gray-550 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-red-500" />
                                {log.city_slug}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                              title="View details"
                            >
                              <LayoutGrid className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteLog(log.id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-450 hover:text-red-500 transition-colors"
                              title="Delete log"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Section for quick Stack Trace review */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="bg-gray-50/50 dark:bg-[#121212] px-6 py-4 border-b border-gray-100 dark:border-white/5">
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                                <span className="text-[11px] font-black text-gray-450 uppercase tracking-wider flex items-center gap-1.5">
                                  <Terminal className="w-3.5 h-3.5" /> Stack Trace & Details
                                </span>
                                <button
                                  onClick={() => setSelectedLog(log)}
                                  className="text-xs text-red-500 hover:underline font-bold"
                                >
                                  Open Detailed View &rarr;
                                </button>
                              </div>
                              {log.error_stack ? (
                                <pre className="p-4 bg-gray-900 dark:bg-[#070707] text-red-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-48 border border-white/5 leading-relaxed">
                                  {log.error_stack}
                                </pre>
                              ) : (
                                <p className="text-[11px] text-gray-450 italic">No stack trace available for this event.</p>
                              )}
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-150 dark:divide-white/5">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-5 flex flex-col gap-3 hover:bg-gray-50/50 dark:hover:bg-white/2 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full border uppercase tracking-wider ${getSeverityStyle(log.severity)}`}>
                      {log.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(log.created_at)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">
                      {log.component_name || 'Generic'}
                    </h4>
                    <p className="text-xs font-bold text-gray-900 dark:text-white mt-1 leading-relaxed">
                      {log.error_message}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap gap-2 items-center">
                      {log.city_slug && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-red-500" />
                          {log.city_slug}
                        </span>
                      )}
                      {log.user ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          <User className="w-3 h-3 text-blue-500" />
                          {log.user.full_name}
                        </span>
                      ) : log.user_id ? (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          <User className="w-3 h-3 text-gray-400" />
                          Unknown User
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-white/2 px-2 py-0.5 rounded-md italic">
                          Guest Session
                        </span>
                      )}
                    </div>
                    {log.user_id && (
                      <span className="text-[9px] font-mono text-gray-400" title={log.user_id}>
                        User ID: {log.user_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/5">
                    <button
                      onClick={(e) => handleDeleteLog(log.id, e)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors py-1 px-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log Details Modal (Premium Glassmorphic Slide Over / Center Dialog) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-gray-150 dark:border-white/5 shadow-2xl overflow-hidden max-w-3xl w-full relative z-10 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-150 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#151515]">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-[9px] font-black rounded-full border uppercase tracking-wider ${getSeverityStyle(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Diagnostic Details</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-xl bg-gray-150 dark:bg-white/5 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Timestamp</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/3 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                      <Calendar className="w-4 h-4 text-red-500" />
                      {formatDate(selectedLog.created_at)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider">Component</p>
                    <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-white/3 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                      <Terminal className="w-4 h-4 text-emerald-500" />
                      {selectedLog.component_name || 'Generic Error'}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider">Error Message</p>
                  <div className="text-sm font-bold text-red-500 bg-red-500/5 p-4 rounded-2.5xl border border-red-500/10 leading-relaxed break-words">
                    {selectedLog.error_message}
                  </div>
                </div>

                {/* Environment & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider">Context Details</p>
                    <div className="space-y-2 bg-gray-50 dark:bg-white/3 p-4 rounded-2.5xl border border-gray-100 dark:border-white/5 text-xs font-medium text-gray-650 dark:text-gray-300">
                      {selectedLog.url && (
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-gray-400 font-bold">Request URL:</span>
                          <span className="text-right truncate max-w-[200px] font-mono" title={selectedLog.url}>
                            {getUrlPathname(selectedLog.url)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Active City:</span>
                        <span>{selectedLog.city_slug || 'Not Selected'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">User:</span>
                        <span>{selectedLog.user ? `${selectedLog.user.full_name} (${selectedLog.user.email})` : selectedLog.user_id ? 'Unknown Registered User' : 'Anonymous / Guest'}</span>
                      </div>
                      {selectedLog.user_id && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-gray-400 font-bold">User ID:</span>
                          <span className="font-mono text-[10px] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded border border-gray-200/50 dark:border-white/5 select-all">{selectedLog.user_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider">Device & Network Specs</p>
                    <div className="space-y-2 bg-gray-50 dark:bg-white/3 p-4 rounded-2.5xl border border-gray-100 dark:border-white/5 text-xs font-medium text-gray-650 dark:text-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Platform / OS:</span>
                        <span>{selectedLog.device_info?.platform || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Viewport Size:</span>
                        <span>{selectedLog.device_info?.viewport || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-bold">Language:</span>
                        <span>{selectedLog.device_info?.language || 'en'}</span>
                      </div>
                      {selectedLog.device_info?.connection && (
                        <>
                          <div className="flex justify-between items-center border-t border-gray-200/30 dark:border-white/5 pt-2 mt-1">
                            <span className="text-gray-400 font-bold">Network Type:</span>
                            <span className="uppercase font-bold text-amber-500">{selectedLog.device_info.connection.effectiveType || 'Unknown'}</span>
                          </div>
                          {selectedLog.device_info.connection.downlink && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 font-bold">Downlink Speed:</span>
                              <span>{selectedLog.device_info.connection.downlink} Mbps</span>
                            </div>
                          )}
                          {selectedLog.device_info.connection.rtt && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 font-bold">Latency (RTT):</span>
                              <span>{selectedLog.device_info.connection.rtt} ms</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Metadata / Additional Context */}
                {selectedLog.device_info && Object.keys(selectedLog.device_info).some(key => !['userAgent', 'viewport', 'platform', 'language', 'connection'].includes(key)) && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider">Additional Context Metadata</p>
                    <div className="bg-gray-50 dark:bg-white/3 p-4 rounded-2.5xl border border-gray-100 dark:border-white/5 text-xs font-medium text-gray-650 dark:text-gray-300 space-y-2">
                      {Object.entries(selectedLog.device_info)
                        .filter(([key]) => !['userAgent', 'viewport', 'platform', 'language', 'connection'].includes(key))
                        .map(([key, val]) => (
                          <div key={key} className="flex justify-between items-start gap-3">
                            <span className="text-gray-400 font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="text-right max-w-[250px] break-all font-mono">
                              {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Device User Agent */}
                {selectedLog.device_info?.userAgent && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5" /> Device User Agent
                    </p>
                    <div className="p-3 bg-gray-50 dark:bg-[#121212] border border-gray-100 dark:border-white/5 text-[10px] font-mono text-gray-500 rounded-xl leading-relaxed">
                      {selectedLog.device_info.userAgent}
                    </div>
                  </div>
                )}

                {/* Stack Trace */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-gray-455 uppercase tracking-wider flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-red-500" /> Stack Trace
                  </p>
                  {selectedLog.error_stack ? (
                    <pre className="p-4 bg-gray-950 text-red-400 font-mono text-[10px] rounded-2xl overflow-x-auto leading-relaxed border border-white/5 max-h-64 shadow-inner">
                      {selectedLog.error_stack}
                    </pre>
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-white/3 border border-dashed border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-400 text-center rounded-2xl">
                      No Javascript stack trace captured for this log entry.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50/50 dark:bg-[#151515] border-t border-gray-150 dark:border-white/5 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

export default ErrorLogs
