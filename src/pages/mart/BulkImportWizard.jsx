import React, { useState } from 'react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useMartStore } from '../../stores/martStore'
import {
  Upload,
  ArrowLeft,
  Download,
  Info,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react'
import BarcodeEnrichmentModal from '../../components/mart/BarcodeEnrichmentModal'

const CustomSelect = ({ value, onChange, placeholder, isRequired, csvHeaders = [], getColumnSamples = () => [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const getLabel = () => {
    if (!value) return placeholder
    const samples = getColumnSamples(value)
    return value + (samples.length > 0 ? ` (e.g. ${samples.join(', ')})` : '')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-3 text-sm focus:outline-none cursor-pointer text-left font-semibold ${
          value
            ? 'bg-emerald-500/[0.04] dark:bg-[#00FF66]/[0.02] border-emerald-500/30 dark:border-[#00FF66]/20 text-emerald-700 dark:text-[#00FF66]'
            : isRequired
              ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.015] border-amber-500/30 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-gray-50 dark:bg-[#12121e] border-gray-250 dark:border-[#1e1e2f] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {value && <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-500 dark:text-[#00FF66]" />}
          {!value && isRequired && <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
          {getLabel()}
        </span>
        <ChevronDown className={`w-4 h-4 ${isOpen ? 'rotate-180' : ''} ${value ? 'text-emerald-555 dark:text-[#00FF66]' : 'text-gray-400'}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-hide py-1.5">
            {!isRequired && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a2c] hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                Clear mapping
              </button>
            )}
            {csvHeaders.map((h) => {
              const samples = getColumnSamples(h)
              const isSelected = value === h
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    onChange(h)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer flex flex-col gap-0.5 border-b border-gray-100/50 dark:border-white/5 last:border-b-0 ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] font-bold'
                      : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1b1b2d]'
                  }`}
                >
                  <span className="font-semibold text-sm">{h}</span>
                  {samples.length > 0 && (
                    <span className="text-[10px] text-gray-450 dark:text-gray-500 font-normal">
                      Sample values: {samples.join(', ')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function BulkImportWizard({
  categories,
  localToolState,
  startLocalPipeline,
  fetchInventory,
  onClose
}) {
  const { importInventoryRows, currentMart } = useMartStore()

  // State local to BulkImportWizard
  const [importStep, setImportStep] = useState('upload') // 'upload', 'mapping', 'preview'
  const [importMethod, setImportMethod] = useState('csv') // 'csv' or 'paste'
  const [pasteText, setPasteText] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRawRows, setCsvRawRows] = useState([])
  const [columnMapping, setColumnMapping] = useState({
    product_identifier: '',
    stock_quantity: '',
    mart_price: '',
    mart_mrp: '',
    product_name: '',
    brand_name: '',
    product_unit: ''
  })
  const [previewRows, setPreviewRows] = useState([])
  const [isMatching, setIsMatching] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [photoModalData, setPhotoModalData] = useState(null)

  const parseCSV = (text) => {
    const results = Papa.parse(text, {
      skipEmptyLines: true
    })
    return results.data || []
  }

  const parseTSV = (text) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '')
    return lines.map(line => line.split('\t'))
  }

  const handlePastedData = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste some Excel or Google Sheets data')
      return
    }

    const parsed = parseTSV(pasteText)
    if (parsed.length === 0) {
      toast.error('Could not parse any pasted data')
      return
    }

    const headers = parsed[0].map(h => h.trim())
    const dataRows = parsed.slice(1).filter(r => r.some(cell => cell.trim() !== ''))

    if (headers.length === 0) {
      toast.error('Could not find any headers in pasted data')
      return
    }

    setCsvFileName('Pasted Data')
    setCsvHeaders(headers)
    setCsvRawRows(dataRows)

    const detected = autoDetectColumns(headers, dataRows)
    setColumnMapping(detected)

    setImportStep('mapping')
  }

  const autoDetectColumns = (headers, rows = []) => {
    const mapping = {
      product_identifier: '',
      stock_quantity: '',
      mart_price: '',
      mart_mrp: '',
      product_name: '',
      brand_name: '',
      product_unit: ''
    }

    const serialHeaders = ['sr', 'srno', 'sno', 'slno', 'index', 'id', 'serial', 'sn']

    headers.forEach(h => {
      const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')

      if (serialHeaders.includes(clean)) return

      if (
        clean === 'barcode' || clean === 'upc' || clean === 'ean' || clean === 'sku' || clean === 'productid' ||
        clean === 'blinkitproductid' || clean === 'blinkitid' || clean === 'itemcode' || clean === 'code' ||
        clean === 'slug'
      ) {
        if (!mapping.product_identifier) mapping.product_identifier = h
      }

      if (
        clean === 'quantity' || clean === 'qty' || clean === 'stock' || clean === 'stockqty' || clean === 'count' ||
        clean === 'inventory' || clean === 'availablestock' || clean === 'units' || clean === 'pieces' ||
        clean === 'packsqty'
      ) {
        if (!mapping.stock_quantity) mapping.stock_quantity = h
      }

      if (
        (clean === 'price' || clean === 'sellingprice' || clean === 'martprice' || clean === 'rate' ||
        clean.includes('price')) && !clean.includes('mrp') && !clean.includes('purchase')
      ) {
        if (!mapping.mart_price) mapping.mart_price = h
      }

      if (clean === 'mrp' || clean === 'retailprice' || clean === 'maxprice' || clean.includes('mrp')) {
        if (!mapping.mart_mrp) mapping.mart_mrp = h
      }

      if (
        clean === 'name' || clean === 'productname' || clean === 'itemname' || clean === 'title' ||
        clean === 'item' || clean === 'product' || clean.includes('name')
      ) {
        if (!mapping.product_name) mapping.product_name = h
      }

      if (clean === 'brand' || clean === 'brandname' || clean === 'manufacturer' || clean === 'make') {
        if (!mapping.brand_name) mapping.brand_name = h
      }

      if (
        (clean === 'unit' || clean === 'weight' || clean === 'size' || clean === 'pack' || clean === 'measure' ||
        clean.includes('unit') || clean.includes('weight') || clean.includes('pack')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.product_unit) mapping.product_unit = h
      }
    })

    if (rows && rows.length > 0) {
      const colSamples = {}
      headers.forEach((h, colIdx) => {
        colSamples[h] = rows.slice(0, 10).map(r => r[colIdx]).filter(Boolean)
      })

      headers.forEach(h => {
        const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
        if (serialHeaders.includes(clean)) return

        const samples = colSamples[h] || []
        if (samples.length === 0) return

        const allNumeric = samples.every(s => /^\d+(\.\d+)?$/.test(s.toString().trim().replace(/[₹$,\s]/g, '')))
        const hasDecimals = samples.some(s => s.toString().includes('.'))
        const averageLength = samples.reduce((acc, s) => acc + s.toString().trim().length, 0) / samples.length

        if (!mapping.product_identifier && allNumeric && averageLength >= 6) {
          mapping.product_identifier = h
        }

        if (!mapping.mart_price && allNumeric && hasDecimals && !clean.includes('mrp')) {
          mapping.mart_price = h
        }

        if (!mapping.stock_quantity && allNumeric && !hasDecimals) {
          const maxVal = Math.max(...samples.map(s => parseInt(s.toString().trim().replace(/[,\s]/g, ''), 10) || 0))
          if (maxVal > 0 && maxVal < 10000) {
            mapping.stock_quantity = h
          }
        }
      })
    }

    const nonSerialHeaders = headers.filter(h => {
      const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
      return !serialHeaders.includes(clean)
    })

    if (!mapping.product_identifier) {
      mapping.product_identifier = nonSerialHeaders[0] || headers[0] || ''
    }
    if (!mapping.stock_quantity) {
      const unmatched = nonSerialHeaders.find(h => 
        h !== mapping.product_identifier && 
        !h.toLowerCase().includes('price') && 
        !h.toLowerCase().includes('mrp') &&
        !h.toLowerCase().includes('name')
      )
      mapping.stock_quantity = unmatched || nonSerialHeaders[1] || headers[1] || ''
    }
    
    if (mapping.stock_quantity === mapping.product_identifier && headers.length > 1) {
      mapping.stock_quantity = headers.find(h => h !== mapping.product_identifier) || ''
    }

    return mapping
  }

  const handleCSVFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file (.csv)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        toast.error('The uploaded CSV file is empty')
        return
      }

      const headers = parsed[0].map(h => h.trim())
      const dataRows = parsed.slice(1).filter(r => r.some(cell => cell.trim() !== ''))

      if (headers.length === 0) {
        toast.error('Could not find any headers in the CSV')
        return
      }

      setCsvFileName(file.name)
      setCsvHeaders(headers)
      setCsvRawRows(dataRows)
      
      const detected = autoDetectColumns(headers, dataRows)
      setColumnMapping(detected)
      
      setImportStep('mapping')
    }
    reader.readAsText(file)
  }

  const runProductMatching = async () => {
    setIsMatching(true)
    try {
      const identifierIndex = csvHeaders.indexOf(columnMapping.product_identifier)
      const qtyIndex = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIndex = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIndex = csvHeaders.indexOf(columnMapping.mart_mrp)
      const nameIndex = csvHeaders.indexOf(columnMapping.product_name)
      const brandIndex = csvHeaders.indexOf(columnMapping.brand_name)
      const unitIndex = csvHeaders.indexOf(columnMapping.product_unit)

      if (identifierIndex === -1) {
        toast.error('Please select a column for Product Identifier')
        setIsMatching(false)
        return
      }

      if (qtyIndex === -1) {
        toast.error('Please select a column for Stock Quantity')
        setIsMatching(false)
        return
      }

      const cleanNumber = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return null
        const cleaned = val.toString().trim()
          .replace(/[₹$,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      const cleanInteger = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return 0
        const cleaned = val.toString().trim()
          .replace(/[,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? 0 : num
      }

      const mappedRows = csvRawRows.map(r => {
        const rowName = nameIndex !== -1 ? r[nameIndex]?.trim() : ''
        const rowBrand = brandIndex !== -1 ? r[brandIndex]?.trim() : ''
        const rowUnit = unitIndex !== -1 ? r[unitIndex]?.trim() : ''

        const fallbackName = r.find((val, idx) => 
          idx !== identifierIndex && 
          idx !== qtyIndex && 
          idx !== priceIndex && 
          idx !== mrpIndex && 
          idx !== nameIndex && 
          idx !== brandIndex && 
          idx !== unitIndex
        ) || ''

        return {
          identifier: r[identifierIndex]?.trim() || '',
          stock_quantity: cleanInteger(r[qtyIndex]),
          mart_price: cleanNumber(r[priceIndex]),
          mart_mrp: cleanNumber(r[mrpIndex]),
          name: rowName || fallbackName,
          brand: rowBrand,
          unit: rowUnit
        }
      }).filter(r => r.identifier !== '')

      if (mappedRows.length === 0) {
        toast.error('No rows with valid identifiers found')
        setIsMatching(false)
        return
      }

      let allCatalogProducts = []
      let from = 0
      const limit = 1000
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, brand, unit, image_url, price, mrp, blinkit_product_id, barcode')
          .range(from, from + limit - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allCatalogProducts.push(...data)
        if (data.length < limit) break
        from += limit
      }

      const barcodeMap = new Map()
      const blinkitIdMap = new Map()
      const slugMap = new Map()
      const uuidMap = new Map()
      const nameMap = new Map()

      allCatalogProducts.forEach(p => {
        if (p.barcode) barcodeMap.set(p.barcode.toString().trim().toLowerCase(), p)
        if (p.blinkit_product_id) blinkitIdMap.set(p.blinkit_product_id.toString().trim().toLowerCase(), p)
        if (p.slug) slugMap.set(p.slug.toString().trim().toLowerCase(), p)
        if (p.name) nameMap.set(p.name.toString().trim().toLowerCase(), p)
        if (p.id) uuidMap.set(p.id.toLowerCase(), p)
      })

      const resolved = mappedRows.map((r, idx) => {
        const iden = r.identifier.toString().trim()
        const key = iden.toLowerCase()

        let matched = null
        let matchType = null

        if (barcodeMap.has(key)) {
          matched = barcodeMap.get(key)
          matchType = 'Barcode'
        } else if (blinkitIdMap.has(key)) {
          matched = blinkitIdMap.get(key)
          matchType = 'Blinkit ID'
        } else if (slugMap.has(key)) {
          matched = slugMap.get(key)
          matchType = 'Slug'
        } else if (uuidMap.has(key)) {
          matched = uuidMap.get(key)
          matchType = 'Database ID'
        } else if (nameMap.has(key)) {
          matched = nameMap.get(key)
          matchType = 'Exact Name'
        }

        if (!matched && iden.length >= 4) {
          const isNumeric = /^\d+$/.test(iden)
          
          matched = allCatalogProducts.find(p => {
            const barcode = p.barcode?.toString() || ''
            const blinkitId = p.blinkit_product_id?.toString() || ''
            
            if (isNumeric) {
              if (barcode.endsWith(iden) || blinkitId.endsWith(iden)) return true
            }
            if (barcode.includes(iden) || blinkitId.includes(iden)) return true
            return false
          }) || null

          if (matched) {
            matchType = 'Partial Code Match'
          }
        }

        if (!matched && r.name && r.name.length >= 3) {
          const cleanName = r.name.toLowerCase().trim()
          matched = allCatalogProducts.find(p => {
            const catalogName = p.name?.toLowerCase() || ''
            return catalogName.includes(cleanName) || cleanName.includes(catalogName)
          }) || null

          if (matched) {
            matchType = 'Similar Name Match'
          }
        }

        return {
          index: idx + 1,
          identifier: r.identifier,
          stock_quantity: r.stock_quantity,
          mart_price: r.mart_price,
          mart_mrp: r.mart_mrp,
          name: r.name,
          brand: r.brand,
          unit: r.unit,
          product: matched,
          matchType: matchType,
          status: matched ? 'matched' : 'not_found'
        }
      })

      setPreviewRows(resolved)
      setImportStep('preview')
    } catch (err) {
      console.error('Matching products failed', err)
      toast.error('Catalog matching failed: ' + err.message)
    } finally {
      setIsMatching(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0])
    }
  }

  const downloadSampleTemplate = () => {
    const headers = "barcode,name,stock_quantity,mart_price,mart_mrp\n"
    const mock = "689103,Tea Powder 80g,50,664.00,699.00\n543646,Masala Puffs 90g,120,31.00,50.00\n569173,Cheese Spread 150g,80,53.00,99.00\n"
    const blob = new Blob([headers + mock], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "ozo_inventory_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Sample template downloaded!')
  }

  const executeBulkImport = async () => {
    try {
      const unenrichedRows = previewRows.filter(
        r => r.status === 'not_found' && r.name && r.name.trim() !== ''
      )

      if (unenrichedRows.length > 0) {
        // Automatically open the enrichment modal for the first product that needs photos/metadata!
        setPhotoModalData(unenrichedRows[0])
        toast(`Please add details and photos for "${unenrichedRows[0].name}"`, {
          icon: 'ℹ️'
        })
        return
      }

      const matchedRows = previewRows.filter(r => r.status === 'matched').map(r => ({
        product_id: r.product.id,
        stock_quantity: r.stock_quantity,
        mart_price: r.mart_price !== null ? r.mart_price : r.product.price,
        mart_mrp: r.mart_mrp !== null ? r.mart_mrp : r.product.mrp || r.product.price,
        is_available: r.stock_quantity > 0
      }))

      if (matchedRows.length === 0) {
        toast.error('No products to import')
        return
      }

      toast.loading(`Importing ${allRowsToImport.length} products to inventory...`, { id: 'import-loading' })
      const res = await importInventoryRows(allRowsToImport)
      toast.dismiss('import-loading')

      if (res.success) {
        if (onClose) onClose()
        setCsvFileName('')
        setCsvHeaders([])
        setCsvRawRows([])
        setPreviewRows([])
        setImportStep('upload')
        
        if (fetchInventory) {
          fetchInventory(1, 20)
        }
        
        if (localToolState.online && startLocalPipeline) {
          setTimeout(() => {
            startLocalPipeline()
          }, 800)
        }
      }
    } catch (err) {
      console.error('Bulk import failed:', err)
      toast.error('Bulk import failed: ' + err.message)
    }
  }

  const renderUploaderStep = () => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-8 overflow-y-auto scrollbar-hide">
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-3 animate-bounce">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white font-sans">Import Your Inventory</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Select how you would like to import or update your catalog inventory.
          </p>
        </div>

        <div className="flex border-b border-gray-150 dark:border-[#1e1e2d] mb-6 w-full shrink-0">
          <button
            onClick={() => setImportMethod('csv')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
              importMethod === 'csv'
                ? 'border-emerald-500 dark:border-[#00FF66] text-emerald-600 dark:text-[#00FF66]'
                : 'border-transparent text-gray-500 hover:text-gray-750 dark:hover:text-gray-300'
            }`}
          >
            Option 1: Upload CSV File
          </button>
          <button
            onClick={() => setImportMethod('paste')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
              importMethod === 'paste'
                ? 'border-emerald-500 dark:border-[#00FF66] text-emerald-600 dark:text-[#00FF66]'
                : 'border-transparent text-gray-500 hover:text-gray-750 dark:hover:text-gray-300'
            }`}
          >
            Option 2: Copy-Paste Excel / Sheets
          </button>
        </div>

        {importMethod === 'csv' ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-file-input').click()}
            className={`w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-emerald-500 dark:border-[#00FF66] bg-emerald-50 dark:bg-[#00FF66]/5 shadow-[0_0_20px_rgba(16,185,129,0.1)] dark:shadow-[0_0_20px_rgba(0,255,102,0.1)]' 
                : 'border-gray-200 dark:border-[#1e1e2f] hover:border-gray-400 dark:hover:border-[#00FF66]/50 bg-white dark:bg-[#0c0c14]'
            }`}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleCSVFile(e.target.files[0])}
            />
            <FileSpreadsheet className={`w-12 h-12 mb-4 transition-colors duration-300 ${dragActive ? 'text-emerald-500 dark:text-[#00FF66]' : 'text-gray-400 dark:text-gray-600'}`} />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">
              Drag and drop your CSV file here, or <span className="text-emerald-600 dark:text-[#00FF66] hover:underline font-bold">browse files</span>
            </p>
            <p className="text-[10px] text-gray-550 mt-2">Only CSV files (.csv) are supported</p>
          </div>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <div className="bg-emerald-50 dark:bg-[#00FF66]/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-350">
              <Info className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-1">How to copy-paste:</span>
                Open your spreadsheet in Excel or Google Sheets, select the columns you want (e.g. barcode, quantity, price), copy them (Ctrl+C), and paste them below (Ctrl+V). We will read your headers and auto-align!
              </div>
            </div>
            <textarea
              placeholder="Paste cells here...&#10;Example:&#10;barcode	stock_quantity	mart_price	mart_mrp&#10;890103001	50	45	50&#10;890103002	10	90	100"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full h-44 bg-white dark:bg-[#0c0c14] border-2 border-dashed border-gray-200 dark:border-[#1e1e2f] hover:border-gray-400 dark:hover:border-[#00FF66]/50 rounded-3xl p-4 text-xs font-semibold font-mono text-gray-900 dark:text-white outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors resize-none placeholder-gray-400 dark:placeholder-gray-600"
            />
            <button
              onClick={handlePastedData}
              className="w-full py-3 bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black font-extrabold rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] font-sans text-xs uppercase tracking-wider"
            >
              Process Pasted Data & Map Columns
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 mt-8 w-full justify-between px-4 shrink-0">
          <button
            onClick={downloadSampleTemplate}
            className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-[#00FF66] hover:text-emerald-700 dark:hover:text-[#00e65c] transition-colors bg-emerald-50 dark:bg-[#00FF66]/10 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-[#00FF66]/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV Template
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-[11px] font-bold text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[#151522] cursor-pointer"
            >
              Cancel & Return
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderMappingStep = () => {
    const getColumnSamples = (headerName) => {
      const idx = csvHeaders.indexOf(headerName)
      if (idx === -1) return []
      return csvRawRows.slice(0, 3)
        .map(row => row[idx])
        .filter(val => val !== undefined && val !== null && val.trim() !== '')
        .slice(0, 3)
    }

    const renderMappingPreview = () => {
      const identifierIdx = csvHeaders.indexOf(columnMapping.product_identifier)
      const qtyIdx = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIdx = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIdx = csvHeaders.indexOf(columnMapping.mart_mrp)

      if (identifierIdx === -1) return null

      const cleanNumber = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return null
        const cleaned = val.toString().trim()
          .replace(/[₹$,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      const cleanInteger = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return 0
        const cleaned = val.toString().trim()
          .replace(/[,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? 0 : num
      }

      const previewItems = csvRawRows.slice(0, 3).map((row) => {
        const idVal = row[identifierIdx]?.trim() || 'N/A'
        const qtyVal = cleanInteger(row[qtyIdx])
        const priceVal = priceIdx !== -1 && row[priceIdx] ? `₹${cleanNumber(row[priceIdx])?.toFixed(2) || '0.00'}` : 'Inherit Catalog'
        const mrpVal = mrpIdx !== -1 && row[mrpIdx] ? `₹${cleanNumber(row[mrpIdx])?.toFixed(2) || '0.00'}` : 'Inherit Catalog'
        return { idVal, qtyVal, priceVal, mrpVal }
      })

      return (
        <div className="mt-5 border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-2.5">Live Mapping Preview (First 3 Rows)</h4>
          <div className="space-y-2">
            {previewItems.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-white/5 last:border-b-0">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Identifier</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-250">{item.idVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Qty</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-250">{item.qtyVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Price</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-[#00FF66]">{item.priceVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">MRP</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-250">{item.mrpVal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    const getValidationWarnings = () => {
      const warnings = []
      const qtyIdx = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIdx = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIdx = csvHeaders.indexOf(columnMapping.mart_mrp)
      const idenIdx = csvHeaders.indexOf(columnMapping.product_identifier)

      let invalidQtyCount = 0
      let invalidPriceCount = 0
      let invalidMrpCount = 0

      csvRawRows.forEach(row => {
        if (qtyIdx !== -1 && row[qtyIdx]) {
          const raw = row[qtyIdx].toString().trim().replace(/[,\s]/g, '')
          if (raw && isNaN(parseInt(raw, 10))) invalidQtyCount++
        }
        if (priceIdx !== -1 && row[priceIdx]) {
          const raw = row[priceIdx].toString().trim().replace(/[₹$,\s]/g, '')
          if (raw && isNaN(parseFloat(raw))) invalidPriceCount++
        }
        if (mrpIdx !== -1 && row[mrpIdx]) {
          const raw = row[mrpIdx].toString().trim().replace(/[₹$,\s]/g, '')
          if (raw && isNaN(parseFloat(raw))) invalidMrpCount++
        }
      })

      if (invalidQtyCount > 0) {
        warnings.push(`Found ${invalidQtyCount} rows with non-numeric stock values (will default to 0).`)
      }
      if (invalidPriceCount > 0) {
        warnings.push(`Found ${invalidPriceCount} rows with non-numeric price values (will inherit catalog price).`)
      }
      if (invalidMrpCount > 0) {
        warnings.push(`Found ${invalidMrpCount} rows with non-numeric MRP values (will inherit catalog MRP).`)
      }

      if (qtyIdx !== -1 && csvRawRows.length > 5) {
        let isSequential = true
        for (let i = 0; i < Math.min(csvRawRows.length, 10); i++) {
          const val = parseInt(csvRawRows[i][qtyIdx]?.toString().trim().replace(/[,\s]/g, ''), 10)
          if (isNaN(val) || (i > 0 && val !== parseInt(csvRawRows[i-1][qtyIdx]?.toString().trim().replace(/[,\s]/g, ''), 10) + 1)) {
            isSequential = false
            break
          }
        }
        if (isSequential) {
          warnings.push(`⚠️ Stock Quantity column contains sequential numbers (1, 2, 3...). You might have mapped the Serial Number/Row Index column instead of actual stock.`)
        }
      }

      if (idenIdx !== -1 && csvRawRows.length > 0) {
        const sampleIds = csvRawRows.slice(0, 10).map(r => r[idenIdx]?.toString().trim()).filter(Boolean)
        const allVeryShort = sampleIds.length > 0 && sampleIds.every(id => id.length <= 3)
        if (allVeryShort) {
          warnings.push(`⚠️ Product Identifier column has very short codes (under 4 characters). Barcodes are usually longer. Check if you mapped the wrong column.`)
        }
      }
      return warnings
    }

    const warnings = getValidationWarnings()

    return (
      <div className="flex-1 w-full flex flex-col overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto w-full py-4">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setImportStep('upload')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a2c] rounded-xl text-gray-550 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Map CSV Columns</h3>
              <p className="text-xs text-gray-500">Match file headers to inventory fields</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans items-start">
            {/* Left side: CSV file columns metadata */}
            <div className="lg:col-span-4 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-500" />
                <span className="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-wider">CSV Columns Detected</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed mb-4">
                Drag a column badge from here and drop it into any of the target fields on the right, or select it directly from the dropdown menus.
              </p>
              
              <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto scrollbar-hide pr-1">
                {csvHeaders.map((h) => {
                  const isMapped = Object.values(columnMapping).includes(h)
                  const samples = getColumnSamples(h)
                  return (
                    <div
                      key={h}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", h)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-grab active:cursor-grabbing flex flex-col gap-1 ${
                        isMapped
                          ? 'border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-700 dark:text-[#00FF66]'
                          : 'border-gray-200 dark:border-[#1e1e2d] bg-gray-50 dark:bg-[#12121a]/50 text-gray-800 dark:text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{h}</span>
                        {isMapped && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-[#00FF66]">
                            Mapped
                          </span>
                        )}
                      </div>
                      {samples.length > 0 && (
                        <span className="text-[10px] text-gray-550 dark:text-gray-400 font-normal truncate">
                          e.g. {samples.join(', ')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right side: Mapping target slots */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'product_identifier',
                    label: 'Product Identifier',
                    isRequired: true,
                    desc: 'Used for matching products (Barcode / SKU / Slug)'
                  },
                  {
                    key: 'product_name',
                    label: 'Product Name',
                    isRequired: false,
                    desc: 'Name of the product (for fallback lookup)'
                  },
                  {
                    key: 'brand_name',
                    label: 'Brand Name',
                    isRequired: false,
                    desc: 'Brand name if custom products created'
                  },
                  {
                    key: 'product_unit',
                    label: 'Unit Measure',
                    isRequired: false,
                    desc: 'Measurement (e.g. 100g, 1L, Pack of 2)'
                  },
                  {
                    key: 'stock_quantity',
                    label: 'Stock Quantity',
                    isRequired: true,
                    desc: 'Available stock to set'
                  },
                  {
                    key: 'mart_price',
                    label: 'Mart Price (₹)',
                    isRequired: false,
                    desc: 'Your selling price at the mart'
                  },
                  {
                    key: 'mart_mrp',
                    label: 'Maximum Retail Price (₹)',
                    isRequired: false,
                    desc: 'Printed price (MRP)'
                  }
                ].map((slot) => {
                  const val = columnMapping[slot.key]
                  const isMapped = !!val
                  
                  return (
                    <div 
                      key={slot.key}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const h = e.dataTransfer.getData("text/plain")
                        if (h) setColumnMapping(prev => ({ ...prev, [slot.key]: h }))
                      }}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all duration-300 relative ${
                        isMapped 
                          ? 'bg-emerald-500/[0.02] dark:bg-[#00FF66]/[0.01] border border-emerald-550/30 dark:border-[#00FF66]/20 shadow-sm'
                          : slot.isRequired
                            ? 'bg-amber-500/[0.01] dark:bg-amber-500/[0.005] border border-dashed border-amber-500/40 dark:border-amber-500/25 shadow-sm shadow-amber-500/[0.01]'
                            : 'bg-white dark:bg-[#0e0e18]/40 border border-dashed border-gray-255 dark:border-[#1e1e2f] hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      {/* Top indicator line for mapped fields */}
                      {isMapped && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-[#00FF66]" />
                      )}
                      
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                              {slot.label}
                            </label>
                            {slot.isRequired && <span className="text-[#FF3366] font-bold text-xs">*</span>}
                          </div>
                          <p className="text-[10px] text-gray-550 mt-0.5 leading-relaxed">{slot.desc}</p>
                        </div>

                        {/* Status badges */}
                        {isMapped ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-[#00FF66] border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00FF66]" />
                            Mapped
                          </span>
                        ) : slot.isRequired ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Required
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#1a1a2b] text-[9px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/5">
                            Optional
                          </span>
                        )}
                      </div>

                      <CustomSelect
                        value={val}
                        onChange={(newVal) => setColumnMapping(prev => ({ ...prev, [slot.key]: newVal }))}
                        placeholder={
                          slot.isRequired 
                            ? "⚠️ Select or Drop required column..."
                            : "Drop column here or select (Optional)..."
                        }
                        isRequired={slot.isRequired}
                        csvHeaders={csvHeaders}
                        getColumnSamples={getColumnSamples}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Live Mapping Preview */}
              {renderMappingPreview()}

              {/* Warnings & Process Button */}
              <div className="space-y-4">
                {warnings.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-1">Data Mismatch Warnings:</span>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium">
                        {warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={runProductMatching}
                  disabled={isMatching || !columnMapping.product_identifier}
                  className="w-full py-3 bg-emerald-500 dark:bg-[#00FF66] disabled:bg-gray-700 text-white dark:text-black font-extrabold rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] disabled:shadow-none font-sans text-xs uppercase tracking-wider"
                >
                  {isMatching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      Matching Products with Catalog...
                    </>
                  ) : (
                    'Process Match & Preview'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPreviewStep = () => {
    const matchedCount = previewRows.filter(r => r.status === 'matched').length
    const unmatchedCount = previewRows.filter(r => r.status === 'not_found').length
    const createdCount = previewRows.filter(r => r.status === 'not_found' && r.name && r.name.trim() !== '').length
    const totalImportCount = matchedCount + createdCount
    const matchRate = previewRows.length > 0 ? (matchedCount / previewRows.length) * 100 : 0
    const hasUnmappedName = previewRows.some(r => r.status !== 'matched' && (!r.name || r.name.trim() === ''))

    return (
      <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden py-2 w-full">
        {/* Header Summary Stats */}
        <div className="flex items-center justify-between mb-4 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImportStep('mapping')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a2c] rounded-xl text-gray-550 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Review & Match Preview</h3>
              <p className="text-xs text-gray-500">Cross-referencing global catalog</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans">
            <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-bold">
              Total Rows: {previewRows.length}
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 font-bold border border-emerald-500/20">
              Matched: {matchedCount}
            </div>
            <div className="px-3 py-1.5 bg-amber-500/10 rounded-lg text-amber-500 font-bold border border-amber-500/20">
              Not Found: {unmatchedCount}
            </div>
          </div>
        </div>

        {((matchRate < 10 && hasUnmappedName) || !columnMapping.product_name || !columnMapping.product_identifier) && previewRows.length > 0 && (
          <div className="mb-6 bg-red-500/5 dark:bg-[#FF3366]/5 border border-red-500/15 dark:border-[#FF3366]/20 rounded-2xl p-5 font-sans relative overflow-hidden shadow-lg shadow-red-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 dark:bg-[#FF3366]" />
            <div className="flex gap-4">
              <div className="p-2 bg-red-500/10 dark:bg-[#FF3366]/10 rounded-xl text-red-500 dark:text-[#FF3366] shrink-0 self-start">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-red-800 dark:text-red-300 tracking-wide uppercase flex items-center gap-2 mb-1.5">
                  Mapping Check: Low Catalog Match Rate ({matchRate.toFixed(1)}%)
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed font-medium">
                  We couldn't automatically find these products in Ozo's global catalog. Here is how you can quickly fix this:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  {/* Left Column: Diagnostics */}
                  <div className="space-y-3 bg-gray-50/50 dark:bg-black/25 rounded-xl p-3.5 border border-gray-150 dark:border-white/5">
                    <span className="font-extrabold text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Possible Causes
                    </span>
                    <div className="space-y-2">
                      <div className="flex gap-2 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        <span className="text-red-500 font-bold">•</span>
                        <span>
                          <strong>Wrong Column Mapped:</strong> The column selected for "Product Identifier" might not contain actual barcodes or slugs.
                        </span>
                      </div>
                      <div className="flex gap-2 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        <span className="text-red-500 font-bold">•</span>
                        <span>
                          <strong>Missing Product Names:</strong> Without mapping a "Product Name", unmatched items cannot be automatically created and will be skipped.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="space-y-3 bg-gray-50/50 dark:bg-black/25 rounded-xl p-3.5 border border-gray-150 dark:border-white/5">
                    <span className="font-extrabold text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Recommended Solutions
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-black text-emerald-600 dark:text-[#00FF66] border border-emerald-500/20 shrink-0 mt-0.5">STEP 1</span>
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                          Click <strong className="text-emerald-600 dark:text-[#00FF66] cursor-pointer hover:underline" onClick={() => setImportStep('mapping')}>Back to Mapping</strong>.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-black text-emerald-600 dark:text-[#00FF66] border border-emerald-500/20 shrink-0 mt-0.5">STEP 2</span>
                        <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                          Ensure "Product Identifier" is mapped to the barcode column and "Product Name" is mapped.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasUnmappedName && previewRows.some(r => r.status !== 'matched') && (
          <div className="mb-6 bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5 font-sans relative overflow-hidden shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 dark:bg-blue-400" />
            <div className="flex gap-4">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl text-blue-550 dark:text-blue-400 shrink-0 self-start">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-extrabold text-blue-850 dark:text-blue-300 tracking-wide uppercase flex items-center gap-2 mb-1.5">
                  New Catalog Products Detected ({previewRows.filter(r => r.status !== 'matched').length} Products)
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-semibold">
                  These products were not found in the global catalog. Since you mapped the <strong>Product Name</strong> column, they will be automatically created as new custom products in your store.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Preview Scrollable Table */}
        <div className="flex-1 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl overflow-hidden flex flex-col mb-4 min-h-[250px] lg:min-h-0">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse font-sans min-w-[800px] lg:min-w-0">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#181827] bg-gray-50 dark:bg-[#0e0e1a]">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">#</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">CSV Identifier</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Matched Catalog Product</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Import Stock</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Import Price</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#181827]">
                {previewRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#121222] transition-colors">
                    <td className="p-4 text-sm font-semibold text-gray-500">{r.index}</td>
                    <td className="p-4 text-sm font-bold text-gray-800 dark:text-gray-300 font-mono">{r.identifier}</td>
                    <td className="p-4">
                      {r.status === 'matched' ? (
                        <div className="flex items-center gap-3">
                          {r.product.image_url ? (
                            <div className="relative group w-8 h-8 shrink-0">
                              <img src={r.product.image_url} alt={r.product.name} className="w-8 h-8 object-contain rounded p-0.5 bg-gray-100 dark:bg-[#1c1c28] border border-gray-200 dark:border-white/5" />
                              <button
                                onClick={() => setPhotoModalData(r)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity cursor-pointer"
                                title="Change photo via Phone"
                              >
                                <Camera className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPhotoModalData(r)}
                              className="w-8 h-8 bg-gray-105 dark:bg-[#1c1c28] hover:bg-emerald-500/10 hover:text-emerald-500 rounded flex items-center justify-center text-xs transition-colors cursor-pointer border border-dashed border-gray-300 dark:border-[#2d2d3f] group shrink-0"
                              title="Capture photo via Phone"
                            >
                              <Camera className="w-4 h-4 text-gray-400 group-hover:text-emerald-500" />
                            </button>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{r.product.name}</p>
                              {r.matchType && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] border border-emerald-500/20 text-[9px] font-extrabold uppercase rounded tracking-wider">
                                  Matched by {r.matchType}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unit: {r.product.unit} | Brand: {r.product.brand || 'Ozo Choice'}</p>
                          </div>
                        </div>
                      ) : r.name && r.name.trim() !== '' ? (
                        <div className="flex items-center gap-3">
                          {r.image_url ? (
                            <div className="relative group w-8 h-8 shrink-0">
                              <img src={r.image_url} alt={r.name} className="w-8 h-8 object-contain rounded p-0.5 bg-gray-100 dark:bg-[#1c1c28] border border-gray-200 dark:border-white/5" />
                              <button
                                onClick={() => setPhotoModalData(r)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity cursor-pointer"
                                title="Change photo via Phone"
                              >
                                <Camera className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPhotoModalData(r)}
                              className="w-8 h-8 bg-blue-500/5 hover:bg-blue-500/15 rounded flex items-center justify-center text-xs transition-colors cursor-pointer border border-dashed border-blue-500/25 group shrink-0"
                              title="Capture photo via Phone"
                            >
                              <Camera className="w-4 h-4 text-blue-400 group-hover:text-blue-500" />
                            </button>
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{r.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5 flex-wrap">
                              <span>Unit: {r.unit || '1 unit'} | Brand: {r.brand || 'Ozo Choice'}</span>
                              {r.image_url && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                                  ✓ Photo Attached
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                            <Info className="w-4 h-4" />
                            <span>No catalog match found</span>
                          </div>
                          <span className="text-[10px] text-gray-550 dark:text-gray-500 leading-normal">
                            Map the <strong className="text-emerald-500">Product Name</strong> column to auto-create this product.
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-sm font-extrabold font-mono text-gray-800 dark:text-gray-300">{r.stock_quantity}</td>
                    <td className="p-4 text-sm">
                      {r.mart_price !== null ? (
                        <div className="flex flex-col">
                          <span className="font-extrabold font-mono text-emerald-600 dark:text-[#00FF66]">₹{parseFloat(r.mart_price).toFixed(2)}</span>
                          {r.product && (
                            <span className="text-[10px] text-gray-500 line-through">Catalog: ₹{parseFloat(r.product.price).toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Inherit Catalog (₹{r.product ? parseFloat(r.product.price).toFixed(2) : '0.00'})</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'matched' ? (
                        <span className="px-3 py-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          Ready to Import
                        </span>
                      ) : r.name && r.name.trim() !== '' ? (
                        <span className="px-3 py-1 text-xs font-bold text-blue-500 bg-blue-500/10 rounded-full border border-blue-500/20">
                          Will Create Product
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="px-3 py-1 text-xs font-bold text-amber-500 bg-amber-500/10 rounded-full border border-amber-500/20 text-center w-max">
                            Skipped
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-500 italic">No Name Column Mapped</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import Footer Actions */}
          <div className="border-t border-gray-200 dark:border-[#181827] bg-gray-50 dark:bg-[#0c0c14] px-6 py-4 flex items-center justify-between font-sans">
            <button
              onClick={() => setImportStep('mapping')}
              className="px-5 py-2.5 border border-gray-200 dark:border-[#1e1e2d] bg-white dark:bg-[#12121a] hover:bg-gray-50 dark:hover:bg-[#1a1a28] text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer"
            >
              Back to Mapping
            </button>

            <button
              onClick={executeBulkImport}
              disabled={totalImportCount === 0}
              className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00FF66] disabled:bg-gray-700 text-white dark:text-black font-extrabold text-xs rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] disabled:shadow-none"
            >
              <Check className="w-4 h-4" />
              Confirm Import ({totalImportCount} products)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f9fafb] dark:bg-[#07070a] rounded-3xl p-6 border border-gray-200 dark:border-[#13131f] relative overflow-hidden font-sans">
      {importStep === 'upload' && onClose && (
        <button
          onClick={onClose}
          className="absolute left-6 top-6 p-2.5 bg-white hover:bg-gray-100 dark:bg-[#12121a] dark:hover:bg-[#1e1e2f] border border-gray-200 dark:border-[#1e1e2f] rounded-xl text-gray-550 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm group z-50 text-[10px] font-bold uppercase tracking-wider"
          title="Back to Inventory"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-gray-450 dark:text-gray-450 group-hover:text-gray-900 dark:group-hover:text-white" />
          <span>Back</span>
        </button>
      )}
      {importStep === 'upload' && renderUploaderStep()}
      {importStep === 'mapping' && renderMappingStep()}
      {importStep === 'preview' && renderPreviewStep()}

      {photoModalData && (
        <BarcodeEnrichmentModal
          barcode={photoModalData.identifier}
          product={
            photoModalData.product || {
              name: photoModalData.name,
              barcode: photoModalData.identifier,
              brand: photoModalData.brand || '',
              unit: photoModalData.unit || '1 unit',
              price: photoModalData.mart_price || '',
              mrp: photoModalData.mart_mrp || '',
              stock_quantity: photoModalData.stock_quantity !== undefined ? photoModalData.stock_quantity : ''
            }
          }
          onClose={() => setPhotoModalData(null)}
          onComplete={(enrichedProd) => {
            setPreviewRows(prev => prev.map(row => {
              if (row.identifier === photoModalData.identifier) {
                return {
                  ...row,
                  name: enrichedProd.name,
                  brand: enrichedProd.brand,
                  unit: enrichedProd.unit,
                  mart_price: enrichedProd.price,
                  mart_mrp: enrichedProd.mrp,
                  stock_quantity: enrichedProd.stock_quantity !== undefined ? enrichedProd.stock_quantity : row.stock_quantity,
                  image_url: enrichedProd.image_url,
                  images: enrichedProd.images,
                  product: enrichedProd,
                  status: 'matched'
                }
              }
              return row
            }))
            setPhotoModalData(null)
          }}
        />
      )}


    </div>
  )


}
