import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography, useTheme } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DataTableModule from 'react-data-table-component'
import { FileDown, PackageCheck, RefreshCw } from 'lucide-react'
import { BufferedTextField } from '../../components/BufferedTextField'
import { getStockPPInShowData } from '../../services/stockApi'
import { exportTableRowsToExcel } from '../../utils/exportExcel'

const DataTable = DataTableModule.default?.default ?? DataTableModule.default
const rowsPerPageOptions = [10, 25, 50, 100]
const hiddenColumnKeys = new Set(['Source', 'id'])
const stockInColumns = [
  { key: 'wo', label: 'Work Order' },
  { key: 'productId', label: 'Product Id' },
  { key: 'productName', label: 'Product Name' },
  { key: 'name', label: 'Area' },
  { key: 'qtyFull', label: 'Qty Full' },
  { key: 'qty', label: 'Qty' },
  { key: 'user', label: 'User' },
  { key: 'create_ByDate', label: 'Created Date' },
]
const columnValueAliases = {
  create_ByDate: ['create_ByDate', 'Create_ByDate', 'createdDate', 'createdAt', 'Created Date'],
  name: ['name', 'Name', 'area', 'Area'],
  productId: ['productId', 'ProductId', 'Product Id', 'product_id'],
  productName: ['productName', 'ProductName', 'Product Name', 'product_name'],
  qty: ['qty', 'Qty', 'quantity', 'Quantity'],
  qtyFull: ['qtyFull', 'QtyFull', 'Qty Full', 'qty_full'],
  user: ['user', 'User', 'create_ByUser', 'Create_ByUser', 'employeeId', 'Employee ID', 'create_By', 'createBy', 'Create_By'],
  wo: ['wo', 'WO', 'Work Order', 'workOrder'],
}
const dateColumnKeys = ['date', 'time', 'saved at', 'created at', 'updated at', 'วันที่']

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

const getColumnLabel = (key) => stockInColumns.find((column) => column.key === key)?.label ?? String(key ?? '').trim()

const isDateColumn = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  return dateColumnKeys.some((dateKey) => textKey.includes(dateKey))
}

const isColumnFilterHidden = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  return isDateColumn(key) || textKey === 'qty' || textKey === 'qtyfull'
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

const getColumnSize = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  if (['no', 'ลำดับ'].includes(textKey)) return { width: '90px' }
  if (textKey === 'product id' || textKey === 'productid') return { grow: 2, minWidth: '240px' }
  if (textKey === 'product name' || textKey === 'productname') return { grow: 1.8, minWidth: '240px' }
  if (textKey === 'area') return { width: '96px' }
  if (textKey === 'user') return { width: '120px' }
  if (isDateColumn(key)) return { minWidth: '170px' }

  return { minWidth: key.length > 14 ? '180px' : '130px' }
}

const getVisibleColumnKeys = () => stockInColumns.map((column) => column.key)

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
    {!isColumnFilterHidden(key) ? (
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

const createColumns = ({ columnFilters, onColumnFilterChange, rows }) => {
  const keys = getVisibleColumnKeys(rows)

  return keys.map((key) => ({
    id: key,
    name: createColumnName({
      filterValue: columnFilters[key] ?? '',
      key,
      onColumnFilterChange,
    }),
    selector: (row) => getColumnValue(row, key),
    sortable: true,
    ...getColumnSize(key),
    cell: (row) => (
      <Typography fontSize={14} noWrap title={getColumnValue(row, key)}>
        {getColumnValue(row, key)}
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

export function StockPPInShowData() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [columnFilters, setColumnFilters] = useState({})
  const [error, setError] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])

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
  const handleExportExcel = () => {
    exportTableRowsToExcel({
      filePrefix: 'StockPPIn',
      rows: createExportRows(filteredRows),
      sheetName: 'Stock PP In',
    })
  }
  const loadRows = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getStockPPInShowData()
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
                Stock PP In
              </Typography>
        
            </Stack>

            <Button
              onClick={() => navigate('/BarcodeStockCheckerin')}
              startIcon={<PackageCheck size={18} />}
              variant="contained"
            >
              Stock in
            </Button>
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
        </Paper>
      </Container>
    </Box>
  )
}
