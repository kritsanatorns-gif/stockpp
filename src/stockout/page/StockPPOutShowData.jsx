import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import * as DataTableModule from 'react-data-table-component'
import { FileDown, PackageCheck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { BufferedTextField } from '../../components/BufferedTextField'
import { checkStockPPOutWO, getStockLocations, getStockPPOutShowData, postStockPPOutAddData } from '../../services/stockApi'
import { useAuthStore } from '../../store/authStore'
import { exportTableRowsToExcel } from '../../utils/exportExcel'

const DataTable = DataTableModule.default?.default ?? DataTableModule.default
const rowsPerPageOptions = [10, 25, 50, 100]
const hiddenColumnKeys = new Set(['Source', 'id'])
const columnsWithoutHeaderSearch = new Set(['qty', 'qtyFull'])
const stockOutColumns = [
  { key: 'wo', label: 'Work Order' },
  { key: 'productId', label: 'Product Id' },
  { key: 'productName', label: 'Product Name' },
  { key: 'area', label: 'Area' },
  { key: 'qtyFull', label: 'Qty Full' },
  { key: 'qty', label: 'Qty' },
  { key: 'user', label: 'User' },
  { key: 'create_ByDate', label: 'Created Date' },
]
const columnValueAliases = {
  area: ['Area', 'area', 'name', 'Name'],
  create_ByDate: ['create_ByDate', 'Create_ByDate', 'createdDate', 'createdAt', 'Saved At'],
  outQty: ['ยอดออก', 'Out Qty', 'outQty', 'qtyOut', 'QtyOut', 'out_qty'],
  productId: ['Product Id', 'Product ID', 'productId', 'ProductId', 'product_id'],
  productName: ['Product Name', 'productName', 'ProductName', 'product_name', 'ItemName', 'itemName'],
  qty: ['ยอดเบิกได้', 'Qty', 'qty', 'quantity', 'Quantity'],
  qtyFull: ['ยอดสุดทั้งหมด', 'ยอดสูงสุด', 'Qty สูงสุด', 'QtyFull', 'qtyFull', 'qty_full'],
  user: ['user', 'User', 'create_ByUser', 'Create_ByUser', 'employeeId', 'Employee ID', 'create_By', 'createBy', 'Create_By'],
  wo: ['Work Order', 'workOrder', 'workId', 'barcode', 'wo', 'WO'],
}
const dateColumnKeys = ['date', 'time', 'saved at', 'created at', 'updated at', 'วันที่']
const workOrderKeys = ['Work Order', 'workOrder', 'workId', 'barcode', 'wo', 'WO']
const areaKeys = ['Area', 'area', 'name', 'Name', 'locationId', 'LocationId', 'stock_PP_Location_Id']
const locationIdKeys = ['locationId', 'LocationId', 'stock_PP_Location_Id', 'stockPPLocationId']
const productIdKeys = ['Product Id', 'Product ID', 'productId', 'ProductId', 'product_id']
const productNameKeys = ['Product Name', 'productName', 'ProductName', 'product_name', 'ItemName', 'itemName']
const qtyKeys = ['ยอดเบิกได้', 'Qty', 'qty', 'quantity', 'Quantity', 'qtyRemain', 'QtyRemain']
const qtyFullKeys = ['ยอดสุดทั้งหมด', 'ยอดสูงสุด', 'Qty สูงสุด', 'QtyFull', 'qtyFull', 'qty_full']
const isHiddenColumnKey = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  return hiddenColumnKeys.has(key) || textKey === 'id' || textKey.startsWith('stock_')
}

const hasVisibleData = (row) => {
  const keys = Object.keys(row ?? {}).filter((key) => !isHiddenColumnKey(key))

  return keys.some((key) => formatCellValue(row[key]).trim() !== '')
}

const normalizeRows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  const rows = Array.isArray(data) ? data : data ? [data] : []

  return rows.filter(hasVisibleData)
}

const formatCellValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const isDateColumn = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  return dateColumnKeys.some((dateKey) => textKey.includes(dateKey))
}

const parseDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const text = String(value).trim()
  const thaiDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/)

  if (thaiDateMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = thaiDateMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))

    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (value) => {
  if (!value) return ''

  const date = parseDateValue(value)
  if (!date) return formatCellValue(value)

  const pad = (number) => String(number).padStart(2, '0')

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getRawColumnValue = (row, key) => {
  const keys = columnValueAliases[key] ?? [key]

  for (const valueKey of keys) {
    if (row?.[valueKey] !== null && row?.[valueKey] !== undefined && row?.[valueKey] !== '') {
      return row[valueKey]
    }
  }

  return row?.[key]
}

const getColumnValue = (row, key) => {
  const value = getRawColumnValue(row, key)

  return isDateColumn(key) ? formatDateTime(value) : formatCellValue(value)
}

const getColumnLabel = (key) => stockOutColumns.find((column) => column.key === key)?.label ?? String(key ?? '').trim()

const getColumnSize = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  if (['no', 'ลำดับ'].includes(textKey)) return { width: '90px' }
  if (textKey === 'rownumber') return { width: '90px' }
  if (textKey === 'product id' || textKey === 'productid') return { grow: 2, minWidth: '240px' }
  if (textKey === 'product name' || textKey === 'productname') return { grow: 1.8, minWidth: '240px' }
  if (textKey === 'area') return { grow: 1.1, minWidth: '150px' }
  if (isDateColumn(key)) return { minWidth: '170px' }

  return { minWidth: key.length > 14 ? '180px' : '130px' }
}

const getVisibleColumnKeys = () => stockOutColumns.map((column) => column.key)

const filterRows = (rows, columnFilters, globalSearch) => {
  const globalKeyword = globalSearch.trim().toLowerCase()
  const visibleKeys = getVisibleColumnKeys(rows)

  return rows.filter((row) => {
    const matchesGlobal =
      !globalKeyword || visibleKeys.some((key) => getColumnValue(row, key).toLowerCase().includes(globalKeyword))
    const matchesColumns = Object.entries(columnFilters).every(([key, filter]) => {
      const keyword = filter.trim().toLowerCase()

      return !keyword || getColumnValue(row, key).toLowerCase().includes(keyword)
    })

    return matchesGlobal && matchesColumns
  })
}

const createExportRows = (rows) => {
  const keys = getVisibleColumnKeys(rows)
  return rows.map((row) =>
    keys.reduce((item, key) => {
      item[getColumnLabel(key)] = getColumnValue(row, key)
      return item
    }, {})
  )
}

const createColumnName = ({ filterValue, key, onColumnFilterChange }) => (
  <Stack
    gap={0.75}
    onClick={(event) => event.stopPropagation()}
    onMouseDown={(event) => event.stopPropagation()}
    sx={{ alignItems: 'stretch', py: 0.75, width: '100%' }}
  >
    <Typography component="span" fontSize={13} fontWeight={700} lineHeight={1.2} textAlign="center">
      {getColumnLabel(key)}
    </Typography>
    {!isDateColumn(key) && !columnsWithoutHeaderSearch.has(key) ? (
      <BufferedTextField
        onChange={(event) => onColumnFilterChange(key, event.target.value)}
        placeholder="Search"
        preventEnterSubmit
        size="small"
        slotProps={{
          htmlInput: {
            'aria-label': `Search ${getColumnLabel(key)}`,
            style: { padding: '4px 6px' },
          },
        }}
        sx={{
          '& .MuiInputBase-root': {
            bgcolor: 'background.paper',
            fontSize: 13,
            height: 30,
          },
          mx: 'auto',
          width: 'min(100%, 140px)',
        }}
        value={filterValue}
      />
    ) : null}
  </Stack>
)

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') {
      return row[key]
    }
  }

  return undefined
}

const getTextValue = (row, keys) => String(getFirstValue(row, keys) ?? '').trim()

const getLocationText = (option) =>
  option?.name ??
  option?.Name ??
  option?.location ??
  option?.Location ??
  option?.locationName ??
  option?.LocationName ??
  option?.area ??
  option?.Area ??
  ''

const getLocationId = (option) =>
  option?.id ??
  option?.Id ??
  option?.locationId ??
  option?.LocationId ??
  option?.location_id ??
  option?.Location_ID ??
  ''

const getNumberValue = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())

  return Number.isFinite(number) ? number : null
}

const normalizeOutQtyInput = (value) => {
  const text = String(value ?? '')

  if (text.includes('-')) {
    return {
      message: 'ยอดออกห้ามติดลบ',
      value: text.replace(/\D/g, '').replace(/^0+/, ''),
    }
  }

  if (/[^\d]/.test(text)) {
    return {
      message: 'ยอดออกต้องเป็นตัวเลขเท่านั้น',
      value: text.replace(/\D/g, '').replace(/^0+/, ''),
    }
  }

  if (/^0+$/.test(text)) {
    return {
      message: 'ยอดออกต้องมากกว่า 0',
      value: '',
    }
  }

  return {
    message: '',
    value: text.replace(/^0+/, ''),
  }
}

const getOutRowKey = (row) =>
  [
    getTextValue(row, workOrderKeys),
    getTextValue(row, areaKeys),
    getTextValue(row, productIdKeys),
    getTextValue(row, productNameKeys),
  ].join('|')

const getRowAvailableQty = (row) =>
  getNumberValue(getTextValue(row, qtyKeys)) ?? getNumberValue(getTextValue(row, qtyFullKeys))

const hasAvailableStockOutQty = (row) =>
  Boolean(getTextValue(row, locationIdKeys)) &&
  Boolean(getTextValue(row, areaKeys)) &&
  (getRowAvailableQty(row) ?? 0) > 0

const normalizeStockOutCheckRows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (!data) return []

  const listData = data.listData ?? data.ListData ?? []
  const locations = Array.isArray(listData) ? listData : listData ? [listData] : []
  const baseRow = {
    id: data.id,
    productId: data.productId ?? data.ProductId ?? '',
    productName: data.productName ?? data.ProductName ?? '',
    qtyFull: data.qtyFull ?? data.QtyFull ?? '',
    wo: data.wo ?? data.WO ?? data.workOrder ?? '',
  }

  if (locations.length === 0) {
    return baseRow.wo ? [baseRow] : []
  }

  return locations.map((location) => ({
    ...baseRow,
    Area: location.name ?? location.Name ?? location.area ?? location.Area ?? location.locationName ?? location.LocationName ?? '',
    locationId: location.locationId ?? location.LocationId ?? location.stock_PP_Location_Id ?? '',
    qty: location.qtyRemain ?? location.QtyRemain ?? location.qty ?? location.Qty ?? '',
    qtyRemain: location.qtyRemain ?? location.QtyRemain ?? '',
  }))
}

const getOutQtyError = ({ maxQty, qtyText }) => {
  const qty = getNumberValue(qtyText)

  if (qtyText === '') return ''
  if (qty === null || qty <= 0) return 'กรุณาใส่จำนวนมากกว่า 0'
  if (maxQty !== null && qty > maxQty) return `จำนวนต้องไม่เกิน ${maxQty}`

  return ''
}

const getApiErrorMessage = (error) => {
  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.message || data?.Message) return data.message ?? data.Message
  if (data?.error || data?.Error) return data.error ?? data.Error
  if (data?.title || data?.Title) return data.title ?? data.Title
  if (Array.isArray(data?.errors)) return data.errors.join(', ')
  if (data?.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(', ')

  return error?.message ?? 'API Error'
}

const isWorkOrderNotFoundMessage = (message) => {
  const text = String(message ?? '').trim().toLowerCase()

  return text.includes('ไม่พบ') && (text.includes('wo') || text.includes('work order'))
}

const createColumns = ({ columnFilters, onColumnFilterChange, rows }) => {
  const keys = getVisibleColumnKeys(rows)

  return keys.map((key) => ({
    id: key,
    name: createColumnName({
      filterValue: columnFilters[key] ?? '',
      key,
      onColumnFilterChange,
    }),
    selector: (row, index) => key === 'rowNumber' ? index + 1 : getColumnValue(row, key),
    sortable: true,
    ...getColumnSize(key),
    cell: (row, index) => (
      <Typography fontSize={14} noWrap title={key === 'rowNumber' ? String(index + 1) : getColumnValue(row, key)}>
        {key === 'rowNumber' ? index + 1 : getColumnValue(row, key)}
      </Typography>
    ),
  }))
}

const createTableStyles = (theme) => ({
  table: {
    style: {
      backgroundColor: theme.palette.background.paper,
    },
  },
  headRow: {
    style: {
      backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
      borderBottomColor: theme.palette.divider,
      color: theme.palette.text.secondary,
      fontSize: '13px',
      fontWeight: 700,
    },
  },
  headCells: {
    style: {
      borderRight: `1px solid ${theme.palette.divider}`,
      justifyContent: 'center',
      '&:last-of-type': {
        borderRight: 0,
      },
    },
  },
  rows: {
    style: {
      backgroundColor: theme.palette.background.paper,
      borderBottomColor: theme.palette.divider,
      color: theme.palette.text.primary,
      minHeight: '54px',
    },
    highlightOnHoverStyle: {
      backgroundColor: theme.palette.action.hover,
      color: theme.palette.text.primary,
    },
  },
  cells: {
    style: {
      borderRight: `1px solid ${theme.palette.divider}`,
      justifyContent: 'center',
      '&:last-of-type': {
        borderRight: 0,
      },
    },
  },
  pagination: {
    style: {
      backgroundColor: theme.palette.background.paper,
      borderTopColor: theme.palette.divider,
      color: theme.palette.text.secondary,
    },
  },
})

export function StockPPOutShowData() {
  const theme = useTheme()
  const { employeeId } = useAuthStore()
  const [candidateRows, setCandidateRows] = useState([])
  const [checkingWorkOrder, setCheckingWorkOrder] = useState(false)
  const [columnFilters, setColumnFilters] = useState({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState([])
  const [noAvailableWorkOrder, setNoAvailableWorkOrder] = useState('')
  const [notFoundWorkOrder, setNotFoundWorkOrder] = useState('')
  const [outQtyByRow, setOutQtyByRow] = useState({})
  const [outQtyInputErrors, setOutQtyInputErrors] = useState({})
  const [rows, setRows] = useState([])
  const [savingOut, setSavingOut] = useState(false)
  const [scanWorkOrder, setScanWorkOrder] = useState('')

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }
  const columns = useMemo(
    () =>
      createColumns({
        columnFilters,
        onColumnFilterChange: handleColumnFilterChange,
        rows,
      }),
    [columnFilters, rows]
  )
  const filteredRows = useMemo(
    () => filterRows(rows, columnFilters, globalSearch),
    [columnFilters, globalSearch, rows]
  )
  const customStyles = useMemo(() => createTableStyles(theme), [theme])
  const areaNameByLocationId = useMemo(
    () =>
      locations.reduce((items, location) => {
        const locationId = String(getLocationId(location)).trim()
        const locationName = getLocationText(location)

        if (locationId && locationName) {
          items[locationId] = locationName
        }

        return items
      }, {}),
    [locations]
  )
  const handleExportExcel = () => {
    exportTableRowsToExcel({
      filePrefix: 'StockPPOut',
      rows: createExportRows(filteredRows),
      sheetName: 'Stock PP Out',
    })
  }
  const outEntries = useMemo(
    () =>
      candidateRows.map((row) => {
        const rowKey = getOutRowKey(row)
        const qtyText = outQtyByRow[rowKey] ?? ''
        const errorMessage = getOutQtyError({
          maxQty: getRowAvailableQty(row),
          qtyText,
        })

        return {
          errorMessage,
          qtyText,
          row,
          rowKey,
        }
      }),
    [candidateRows, outQtyByRow]
  )
  const filledOutEntries = useMemo(
    () => outEntries.filter((entry) => entry.qtyText !== ''),
    [outEntries]
  )
  const hasQtyError = useMemo(
    () => filledOutEntries.some((entry) => Boolean(entry.errorMessage)),
    [filledOutEntries]
  )

  const dialogColumns = useMemo(
    () => [
 
      {
        id: 'Product Id',
        name: 'Product Id',
        selector: (row) => getTextValue(row, productIdKeys),
        sortable: true,
        minWidth: '170px',
        grow: 1.4,
        cell: (row) => (
          <Typography component="code" fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace" fontSize={14} noWrap>
            {getTextValue(row, productIdKeys)}
          </Typography>
        ),
      },
      {
        id: 'Product Name',
        name: 'Product Name',
        selector: (row) => getTextValue(row, productNameKeys),
        sortable: true,
        grow: 2,
        cell: (row) => (
          <Typography fontSize={14} noWrap title={getTextValue(row, productNameKeys)}>
            {getTextValue(row, productNameKeys)}
          </Typography>
        ),
      },
           {
        id: 'Area',
        name: 'Area',
        selector: (row) => areaNameByLocationId[getTextValue(row, locationIdKeys)] || getTextValue(row, areaKeys),
        sortable: true,
        minWidth: '150px',
        cell: (row) => (
          <Typography fontSize={14} noWrap title={areaNameByLocationId[getTextValue(row, locationIdKeys)] || getTextValue(row, areaKeys)}>
            {areaNameByLocationId[getTextValue(row, locationIdKeys)] || getTextValue(row, areaKeys)}
          </Typography>
        ),
      },
      {
        id: 'QtyFull',
        name: 'ยอดสุดทั้งหมด',
        selector: (row) => getTextValue(row, qtyFullKeys),
        sortable: true,
        width: '150px',
        cell: (row) => <Typography fontSize={14}>{getTextValue(row, qtyFullKeys)}</Typography>,
      },
      {
        id: 'Qty',
        name: 'ยอดเบิกได้',
        selector: (row) => getTextValue(row, qtyKeys),
        sortable: true,
        width: '120px',
        cell: (row) => <Typography fontSize={14}>{getTextValue(row, qtyKeys)}</Typography>,
      },
      {
        id: 'outQty',
        name: 'ยอดออก',
        sortable: false,
        minWidth: '180px',
        cell: (row) => {
          const rowKey = getOutRowKey(row)
          const qtyText = outQtyByRow[rowKey] ?? ''
          const inputError = outQtyInputErrors[rowKey] ?? ''
          const errorMessage = getOutQtyError({
            maxQty: getRowAvailableQty(row),
            qtyText,
          })

          return (
            <TextField
              disabled={savingOut}
              error={Boolean(inputError || errorMessage)}
              helperText={inputError || errorMessage}
              onChange={(event) => {
                const { message, value: nextQty } = normalizeOutQtyInput(event.target.value)

                setOutQtyInputErrors((current) => ({
                  ...current,
                  [rowKey]: message,
                }))

                setOutQtyByRow((current) => ({
                  ...current,
                  [rowKey]: nextQty,
                }))
              }}
              placeholder="ยอดออก"
              size="small"
              slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }}
              value={qtyText}
            />
          )
        },
      },
    ],
    [areaNameByLocationId, outQtyByRow, outQtyInputErrors, savingOut]
  )

  const openOutDialog = (nextRows) => {
    const defaultOutQtyByRow = nextRows.reduce((items, row) => {
      const availableQty = getRowAvailableQty(row)

      items[getOutRowKey(row)] = availableQty !== null ? String(availableQty) : ''
      return items
    }, {})

    setCandidateRows(nextRows)
    setOutQtyByRow(defaultOutQtyByRow)
    setOutQtyInputErrors({})
    setDialogOpen(true)
  }

  const closeOutDialog = () => {
    if (savingOut) return

    setDialogOpen(false)
    setOutQtyInputErrors({})
  }

  const handleScanSubmit = async (event) => {
    event.preventDefault()

    const formValue = new FormData(event.currentTarget).get('scanWorkOrder')
    const workOrder = String(formValue ?? scanWorkOrder).trim()
    if (!workOrder) return

    setCheckingWorkOrder(true)

    try {
      const data = await checkStockPPOutWO(workOrder)
      const candidateMatches = normalizeStockOutCheckRows(data)
      const availableMatches = candidateMatches.filter(hasAvailableStockOutQty)

      if (candidateMatches.length === 0) {
        setNotFoundWorkOrder(workOrder)
        return
      }

      if (availableMatches.length === 0) {
        setNoAvailableWorkOrder(workOrder)
        return
      }

      openOutDialog(availableMatches)
    } catch (apiError) {
      console.error(apiError)
      const errorMessage = getApiErrorMessage(apiError)

      if (isWorkOrderNotFoundMessage(errorMessage)) {
        setNotFoundWorkOrder(workOrder)
        return
      }

      toast.error(errorMessage || `ตรวจสอบ Work Order ไม่สำเร็จ: ${workOrder}`)
    } finally {
      setCheckingWorkOrder(false)
    }
  }

  const handleConfirmOut = async () => {
    if (savingOut) return

    if (filledOutEntries.length === 0) {
      toast.error('กรุณาใส่ยอดออกอย่างน้อย 1 Area')
      return
    }

    if (hasQtyError) {
      toast.error('กรุณาตรวจสอบยอดออกให้ถูกต้อง')
      return
    }

    const payload = filledOutEntries.map(({ qtyText, row }) => ({
      id: getNumberValue(row.id),
      locationId: getNumberValue(getTextValue(row, locationIdKeys)),
      qty: getNumberValue(qtyText),
      user: employeeId,
      wo: getTextValue(row, workOrderKeys),
    }))

    if (payload.some((item) => item.id === null || item.locationId === null || item.qty === null || !item.user || !item.wo)) {
      toast.error('Stock out data is incomplete')
      return
    }

    setSavingOut(true)

    try {
      await postStockPPOutAddData(payload)
      toast.success('Saved stock out')
      setDialogOpen(false)
      setCandidateRows([])
      setOutQtyByRow({})
      setOutQtyInputErrors({})
      setScanWorkOrder('')
      await loadRows()
    } catch (apiError) {
      console.error(apiError)
      toast.error(apiError.message || 'Save stock out failed')
    } finally {
      setSavingOut(false)
    }
  }

  const loadRows = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getStockPPOutShowData()
      setRows(normalizeRows(data))
    } catch (apiError) {
      console.error(apiError)
      setRows([])
      setError(apiError.message || 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRows()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await getStockLocations()
        setLocations(Array.isArray(data) ? data : data ? [data] : [])
      } catch (apiError) {
        console.error(apiError)
        toast.error('โหลดชื่อ Area ไม่สำเร็จ')
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Box className="stock-page" component="main">
      <Container className="stock-page__container" maxWidth={false}>
        <Paper className="stock-section" component="section" variant="outlined">
          <Stack
            className="stock-section__header"
            direction={{ xs: 'column', sm: 'row' }}
          >
            <Stack className="stock-section__title-wrap">
              <Typography className="stock-section__title" component="h2">
                Stock PP Out
              </Typography>
              
            </Stack>

            <Stack className="stock-actions" direction={{ xs: 'column', sm: 'row' }}>
              <Button
                disabled={loading || filteredRows.length === 0}
                onClick={handleExportExcel}
                startIcon={<FileDown size={18} />}
                variant="outlined"
              >
                Export Excel
              </Button>
              <Button disabled={loading} onClick={loadRows} startIcon={<RefreshCw size={18} />} variant="outlined">
                Refresh
              </Button>
            </Stack>
          </Stack>

          <Box className="stock-form-row">
            <Paper component="form" onSubmit={handleScanSubmit} variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} sx={{ alignItems: { md: 'center' } }}>
                <TextField
                  autoComplete="off"
                  disabled={!employeeId || loading || checkingWorkOrder}
                  fullWidth
                  label="สแกนหรือพิมพ์ Work Order สำหรับยิงออก"
                  name="scanWorkOrder"
                  onChange={(event) => setScanWorkOrder(event.target.value)}
                  size="small"
                  value={scanWorkOrder}
                />
                <Button
                  disabled={!employeeId || loading || checkingWorkOrder || !scanWorkOrder.trim()}
                  startIcon={<PackageCheck size={18} />}
                  type="submit"
                  variant="contained"
                >
                  สแกน
                </Button>
              </Stack>
            </Paper>
          </Box>

          <Box className="stock-search-row">
            <BufferedTextField
              className="stock-search-field"
              fullWidth
              label="Search / Filter"
              onChange={(event) => setGlobalSearch(event.target.value)}
              size="small"
              value={globalSearch}
            />
          </Box>

          {error ? (
            <Box sx={{ px: 2, pb: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          ) : null}

          <DataTable
            columns={columns}
            customStyles={customStyles}
            data={filteredRows}
            dense
            highlightOnHover
            noDataComponent={
              loading ? (
                <Stack alignItems="center" direction="row" gap={1} sx={{ py: 3 }}>
                  <CircularProgress size={18} />
                  <Typography fontSize={14}>กำลังโหลดข้อมูล...</Typography>
                </Stack>
              ) : (
                'ยังไม่มีข้อมูล'
              )
            }
            pagination
            paginationComponentOptions={{ rowsPerPageText: 'แสดงต่อหน้า', rangeSeparatorText: 'จาก' }}
            paginationPerPage={25}
            paginationRowsPerPageOptions={rowsPerPageOptions}
            persistTableHead
            progressPending={loading && rows.length > 0}
            responsive
          />

          <Dialog open={dialogOpen} onClose={closeOutDialog} fullWidth maxWidth="lg">
            <DialogTitle>ยิงออก Work Order</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField disabled label="Work Order" value={getTextValue(candidateRows[0], workOrderKeys)} />
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  <DataTable
                    columns={dialogColumns}
                    customStyles={customStyles}
                    data={candidateRows}
                    dense
                    highlightOnHover
                    noDataComponent="ไม่พบข้อมูล"
                    pagination={candidateRows.length > 5}
                    paginationComponentOptions={{ rowsPerPageText: 'แสดงต่อหน้า', rangeSeparatorText: 'จาก' }}
                    paginationPerPage={25}
                  />
                </Paper>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button disabled={savingOut} onClick={closeOutDialog}>Cancel</Button>
              <Button disabled={savingOut} onClick={handleConfirmOut} variant="contained">
                บันทึก
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            fullWidth
            maxWidth="xs"
            onClose={() => setNotFoundWorkOrder('')}
            open={Boolean(notFoundWorkOrder)}
          >
            <DialogTitle>แจ้งเตือน</DialogTitle>
            <DialogContent>
              <Typography color="error" fontSize={15} sx={{ mt: 1 }}>
                ไม่พบ Work Order: {notFoundWorkOrder}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNotFoundWorkOrder('')} variant="contained">
                ตกลง
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            fullWidth
            maxWidth="xs"
            onClose={() => setNoAvailableWorkOrder('')}
            open={Boolean(noAvailableWorkOrder)}
          >
            <DialogTitle>แจ้งเตือน</DialogTitle>
            <DialogContent>
              <Typography color="error" fontSize={15} sx={{ mt: 1 }}>
                Work Order นี้ไม่มียอดให้เบิก: {noAvailableWorkOrder}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNoAvailableWorkOrder('')} variant="contained">
                ตกลง
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Container>
    </Box>
  )
}
