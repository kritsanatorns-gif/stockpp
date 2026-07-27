import { Alert, Box, Button, CircularProgress, Container, FormControlLabel, Paper, Radio, Stack, TextField, Typography, useTheme } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DataTableModule from 'react-data-table-component'
import { ClipboardList, FileDown, MinusCircle, PlusCircle } from 'lucide-react'
import { BufferedTextField } from '../../components/BufferedTextField'
import { getStockSummaryShowData, getStockSummaryShowDataWo } from '../../services/stockApi'
import { exportWorkbookToExcel } from '../../utils/exportExcel'

const DataTable = DataTableModule.default?.default ?? DataTableModule.default
const rowsPerPageOptions = [10, 25, 50, 100]
const columnsWithHeaderSearch = new Set(['Work Order', 'Product Id', 'Product Name', 'Area'])
const stockReportColumns = [
  { key: 'Work Order', label: 'Work Order' },
  { key: 'Product Id', label: 'Product Id' },
  { key: 'Product Name', label: 'Product Name' },
  { key: 'Area', label: 'Area' },
  { key: 'Qty Full', label: 'Qty Full' },
  { key: 'Total In', label: 'Total In' },
  { key: 'Total Out', label: 'Total Out' },
  { key: 'Qty Remain', label: 'Qty Remain' },
  { key: 'In Count', label: 'In Count' },
  { key: 'Out Count', label: 'Out Count' },
]

const workOrderKeys = ['Work Order', 'workOrder', 'workId', 'barcode', 'wo', 'WO']
const areaKeys = ['Area', 'area', 'name', 'Name']
const productIdKeys = ['Product Id', 'Product ID', 'productId', 'ProductId', 'product_id']
const productNameKeys = ['Product Name', 'productName', 'ProductName', 'product_name', 'ItemName', 'itemName']
const qtyFullKeys = ['Qty Full', 'QtyFull', 'qtyFull', 'qty_full']
const qtyInKeys = ['Total In', 'qtyIn', 'QtyIn', 'inQty', 'InQty']
const qtyOutKeys = ['Total Out', 'qtyOut', 'QtyOut', 'outQty', 'OutQty', 'out_qty']
const qtyRemainKeys = ['Qty Remain', 'QtyRemain', 'qtyRemain', 'qty_remain', 'remainQty', 'RemainQty']
const dateKeys = ['create_ByDate', 'Create_ByDate', 'createdDate', 'createdAt']
const userKeys = ['create_ByUser', 'Create_ByUser', 'user', 'User', 'employeeId', 'Employee ID']
const hiddenDetailColumnKeys = new Set(['Product Id', 'Product Name'])

const getDefaultReportPeriod = () => {
  const now = new Date()

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  }
}

const normalizeRows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (Array.isArray(data)) return data
  return data ? [data] : []
}

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') {
      return row[key]
    }
  }

  return undefined
}

const getTextValue = (row, keys) => String(getFirstValue(row, keys) ?? '').trim()

const getNumberValue = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())

  return Number.isFinite(number) ? number : 0
}

const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const formatDateTime = (value) => {
  const date = parseDateValue(value)
  if (!date) return formatCellValue(value)

  const pad = (number) => String(number).padStart(2, '0')

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const getListCount = (row, key) => {
  const list = row?.[key] ?? row?.[`${key[0].toUpperCase()}${key.slice(1)}`]

  return Array.isArray(list) ? list.length : 0
}

const createReportRows = (stockRows) =>
  stockRows.map((row) => ({
    'Work Order': getTextValue(row, workOrderKeys),
    'Product Id': getTextValue(row, productIdKeys),
    'Product Name': getTextValue(row, productNameKeys),
    Area: getTextValue(row, areaKeys),
    'Qty Full': getNumberValue(getTextValue(row, qtyFullKeys)),
    'Total In': getNumberValue(getTextValue(row, qtyInKeys)),
    'Total Out': getNumberValue(getTextValue(row, qtyOutKeys)),
    'Qty Remain': getNumberValue(getTextValue(row, qtyRemainKeys)),
    'In Count': getListCount(row, 'inList'),
    'Out Count': getListCount(row, 'outList'),
    __inList: Array.isArray(row.inList ?? row.InList) ? row.inList ?? row.InList : [],
    __outList: Array.isArray(row.outList ?? row.OutList) ? row.outList ?? row.OutList : [],
  }))

const formatCellValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getReportColumnValue = (row, key) => formatCellValue(row[key])

const getApiErrorMessage = (error, searchMode) => {
  if (error?.response?.status === 404) {
    return searchMode === 'work'
      ? 'ไม่พบ API ค้นหาตาม Work Order'
      : 'ไม่พบ API ค้นหาตามปี/เดือน'
  }

  const data = error?.response?.data

  if (typeof data === 'string') return data
  if (data?.message || data?.Message) return data.message ?? data.Message
  if (data?.error || data?.Error) return data.error ?? data.Error
  if (data?.title || data?.Title) return data.title ?? data.Title

  return error?.message || 'โหลดข้อมูลไม่สำเร็จ'
}

const createDetailRows = ({ items, parentRow, type }) =>
  items.map((item) => ({
    Area: parentRow.Area,
    Date: formatDateTime(getTextValue(item, dateKeys)),
    'Product Id': parentRow['Product Id'],
    'Product Name': parentRow['Product Name'],
    [`Qty ${type}`]: getNumberValue(getTextValue(item, ['qty', 'Qty', 'quantity', 'Quantity'])),
    Status: `Tag ${type}`,
    User: getTextValue(item, userKeys),
  }))

const createDetailColumns = (qtyKey) => [
  {
    id: 'Product Id',
    name: 'Product Id',
    selector: (row) => row['Product Id'],
    sortable: true,
    minWidth: '210px',
    cell: (row) => <Typography fontSize={13} noWrap title={row['Product Id']}>{row['Product Id']}</Typography>,
  },
  {
    id: 'Product Name',
    name: 'Product Name',
    selector: (row) => row['Product Name'],
    sortable: true,
    minWidth: '180px',
    cell: (row) => <Typography fontSize={13} noWrap title={row['Product Name']}>{row['Product Name']}</Typography>,
  },
  {
    id: 'Area',
    name: 'Area',
    selector: (row) => row.Area,
    sortable: true,
    minWidth: '150px',
    cell: (row) => <Typography fontSize={13} noWrap title={row.Area}>{row.Area}</Typography>,
  },
  {
    id: qtyKey,
    name: qtyKey,
    selector: (row) => row[qtyKey],
    sortable: true,
    width: '96px',
    cell: (row) => <Typography fontSize={13}>{formatCellValue(row[qtyKey])}</Typography>,
  },
  {
    id: 'Status',
    name: 'Status',
    selector: (row) => row.Status,
    sortable: true,
    width: '120px',
    cell: (row) => <Typography fontSize={13}>{row.Status}</Typography>,
  },
  {
    id: 'User',
    name: 'User',
    selector: (row) => row.User,
    sortable: true,
    width: '92px',
    cell: (row) => <Typography fontSize={13}>{row.User}</Typography>,
  },
  {
    id: 'Date',
    name: 'Date',
    selector: (row) => row.Date,
    sortable: true,
    minWidth: '170px',
    cell: (row) => <Typography fontSize={13} noWrap title={row.Date}>{row.Date}</Typography>,
  },
].filter((column) => !hiddenDetailColumnKeys.has(column.id))

const filterRows = (rows, search, columnFilters, workOrderSearch = '') => {
  const keyword = search.trim().toLowerCase()
  const workOrderKeyword = workOrderSearch.trim().toLowerCase()

  return rows.filter((row) =>
    (!workOrderKeyword || getReportColumnValue(row, 'Work Order').toLowerCase().includes(workOrderKeyword)) &&
    (!keyword || stockReportColumns.some((column) => getReportColumnValue(row, column.key).toLowerCase().includes(keyword))) &&
    Object.entries(columnFilters).every(([key, filter]) => {
      const columnKeyword = filter.trim().toLowerCase()

      return !columnKeyword || getReportColumnValue(row, key).toLowerCase().includes(columnKeyword)
    })
  )
}

const createExportRows = (rows) =>
  rows.map((row) =>
    stockReportColumns.reduce((item, column) => {
      item[column.label] = row[column.key]
      return item
    }, {})
  )

const createDetailExportRows = ({ rows, type }) =>
  rows.flatMap((row) => {
    const items = type === 'In' ? row.__inList ?? [] : row.__outList ?? []

    return items.map((item) => ({
      'Work Order': row['Work Order'],
      'Product Id': row['Product Id'],
      'Product Name': row['Product Name'],
      Area: row.Area,
      Date: formatDateTime(getTextValue(item, dateKeys)),
      Qty: getNumberValue(getTextValue(item, ['qty', 'Qty', 'quantity', 'Quantity'])),
      Status: `Tag ${type}`,
      User: getTextValue(item, userKeys),
    }))
  })

const getColumnSize = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  if (textKey === 'work order') return { grow: 1.3, minWidth: '160px' }
  if (textKey === 'product id') return { grow: 2, minWidth: '220px' }
  if (textKey === 'product name') return { grow: 1.8, minWidth: '220px' }
  if (textKey === 'area') return { grow: 1.1, minWidth: '150px' }

  return { minWidth: key.length > 12 ? '150px' : '120px' }
}

const createColumnName = ({ filterValue, key, label, onColumnFilterChange }) => (
  <Stack
    gap={0.75}
    onClick={(event) => event.stopPropagation()}
    onMouseDown={(event) => event.stopPropagation()}
    sx={{ alignItems: 'stretch', py: 0.75, width: '100%' }}
  >
    <Typography component="span" fontSize={13} fontWeight={700} lineHeight={1.2} textAlign="center">
      {label}
    </Typography>
    {columnsWithHeaderSearch.has(key) ? (
      <BufferedTextField
        onChange={(event) => onColumnFilterChange(key, event.target.value)}
        placeholder="Search"
        preventEnterSubmit
        size="small"
        slotProps={{
          htmlInput: {
            'aria-label': `Search ${label}`,
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

const createColumns = ({ columnFilters, onColumnFilterChange }) =>
  stockReportColumns.map(({ key, label }) => ({
    id: key,
    name: createColumnName({
      filterValue: columnFilters[key] ?? '',
      key,
      label,
      onColumnFilterChange,
    }),
    selector: (row) => getReportColumnValue(row, key),
    sortable: true,
    ...getColumnSize(key),
    cell: (row) => (
      <Typography fontSize={14} noWrap title={getReportColumnValue(row, key)}>
        {getReportColumnValue(row, key)}
      </Typography>
    ),
  }))

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

function StockReportExpandedRow({ data, tableStyles }) {
  const inRows = useMemo(
    () => createDetailRows({ items: data.__inList ?? [], parentRow: data, type: 'In' }),
    [data]
  )
  const outRows = useMemo(
    () => createDetailRows({ items: data.__outList ?? [], parentRow: data, type: 'Out' }),
    [data]
  )
  const inColumns = useMemo(() => createDetailColumns('Qty In'), [])
  const outColumns = useMemo(() => createDetailColumns('Qty Out'), [])

  return (
    <Box sx={{ bgcolor: 'action.hover', borderTop: 1, borderColor: 'divider', p: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
        }}
      >
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <DataTable
            columns={inColumns}
            customStyles={tableStyles}
            data={inRows}
            dense
            noDataComponent="No Stock In"
            pagination
            paginationComponentOptions={{ rowsPerPageText: 'แสดงต่อหน้า', rangeSeparatorText: 'จาก' }}
            paginationPerPage={25}
            paginationRowsPerPageOptions={rowsPerPageOptions}
          />
        </Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <DataTable
            columns={outColumns}
            customStyles={tableStyles}
            data={outRows}
            dense
            noDataComponent="No Stock Out"
            pagination
            paginationComponentOptions={{ rowsPerPageText: 'แสดงต่อหน้า', rangeSeparatorText: 'จาก' }}
            paginationPerPage={25}
            paginationRowsPerPageOptions={rowsPerPageOptions}
          />
        </Paper>
      </Box>
    </Box>
  )
}

export function StockReport() {
  const theme = useTheme()
  const defaultPeriod = useMemo(() => getDefaultReportPeriod(), [])
  const [columnFilters, setColumnFilters] = useState({})
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState(defaultPeriod.month)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState('')
  const [workOrderSearch, setWorkOrderSearch] = useState('')
  const [year, setYear] = useState(defaultPeriod.year)

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }
  const filteredRows = useMemo(
    () => filterRows(rows, search, columnFilters),
    [columnFilters, rows, search]
  )
  const columns = useMemo(
    () => createColumns({ columnFilters, onColumnFilterChange: handleColumnFilterChange }),
    [columnFilters]
  )
  const customStyles = useMemo(() => createTableStyles(theme), [theme])
  const summary = useMemo(
    () => ({
      products: rows.length,
    }),
    [rows]
  )
  const summaryCards = useMemo(
    () => [
      {
        color: 'text.primary',
        icon: ClipboardList,
        label: 'ทั้งหมด',
        tone: 'blue',
        value: summary.products,
      },
    ],
    [summary]
  )
  const isSearchReady = useMemo(() => {
    if (searchMode === 'work') return Boolean(workOrderSearch.trim())
    if (searchMode !== 'period') return false

    const nextYear = getNumberValue(year)
    const nextMonth = getNumberValue(month)

    return Boolean(nextYear) && nextMonth >= 1 && nextMonth <= 12
  }, [month, searchMode, workOrderSearch, year])

  const loadRows = useCallback(async () => {
    const workOrder = workOrderSearch.trim()

    if (searchMode === 'period') {
      const nextYear = getNumberValue(year)
      const nextMonth = getNumberValue(month)

      if (!nextYear || nextMonth < 1 || nextMonth > 12) {
        setError('กรุณาใส่ปีและเดือนให้ถูกต้อง')
        return
      }
    }

    if (searchMode === 'work' && !workOrder) {
      setError('กรุณาใส่ Work Order')
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)

    try {
      const data =
        searchMode === 'work'
          ? await getStockSummaryShowDataWo(workOrder)
          : await getStockSummaryShowData({
              month: getNumberValue(month),
              year: getNumberValue(year),
            })

      setRows(createReportRows(normalizeRows(data)))
    } catch (apiError) {
      setRows([])
      setError(getApiErrorMessage(apiError, searchMode))
    } finally {
      setLoading(false)
    }
  }, [month, searchMode, workOrderSearch, year])

  const handleExportExcel = () => {
    exportWorkbookToExcel({
      filePrefix: searchMode === 'work' ? `StockReport_WO_${workOrderSearch}` : `StockReport_${year}_${month}`,
      sheets: [
        {
          rows: createExportRows(filteredRows),
          sheetName: 'Stock Report',
        },
        {
          rows: createDetailExportRows({ rows: filteredRows, type: 'In' }),
          sheetName: 'Stock In',
        },
        {
          rows: createDetailExportRows({ rows: filteredRows, type: 'Out' }),
          sheetName: 'Stock Out',
        },
      ],
    })
  }

  const handleSearchModeChange = (event) => {
    setSearchMode(event.target.value)
    setRows([])
    setError('')
    setHasSearched(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isSearchReady) {
        setRows([])
        setError('')
        setHasSearched(false)
        return
      }

      loadRows()
    }, isSearchReady ? 350 : 0)

    return () => clearTimeout(timer)
  }, [isSearchReady, loadRows])

  return (
    <Box className="stock-page" component="main">
      <Container className="stock-page__container" maxWidth={false}>
        <Paper className="stock-section" component="section" variant="outlined">
          <Stack className="stock-section__header" direction={{ xs: 'column', lg: 'row' }}>
            <Stack className="stock-section__title-wrap">
              <Typography className="stock-section__title" component="h2">
                Stock Report
              </Typography>
            </Stack>

            <Stack className="stock-actions" direction={{ xs: 'column', sm: 'row' }}>
              <Button disabled={loading || filteredRows.length === 0} onClick={handleExportExcel} startIcon={<FileDown size={18} />} variant="outlined">
                Export Excel
              </Button>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', xl: 'row' }}
            gap={2}
            sx={{ alignItems: { xs: 'stretch', xl: 'center' }, px: 2, py: 1.5 }}
          >
            <Box className="stock-summary-grid" sx={{ flex: '1 1 420px', minWidth: 0 }}>
              {summaryCards.map(({ color, icon: Icon, label, tone, value }) => (
                <Paper
                  key={label}
                  className={`stock-summary-card stock-summary-card--${tone}`}
                  component="article"
                  variant="outlined"
                >
                  <Box className="stock-summary-card__icon">
                    <Icon color="currentColor" size={22} strokeWidth={2.2} />
                  </Box>
                  <Box className="stock-summary-card__content">
                    <Typography color="text.secondary" fontSize={12} lineHeight={1.2}>
                      {label}
                    </Typography>
                    <Typography color={color} fontSize={26} fontWeight={800} lineHeight={1.15}>
                      {value.toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
            <Stack gap={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' }, justifyContent: 'flex-end' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end' }}>
                <FormControlLabel
                  control={
                    <Radio
                      checked={searchMode === 'period'}
                      onChange={handleSearchModeChange}
                      size="small"
                      value="period"
                    />
                  }
                  label="ค้นหาตามปี/เดือน"
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
                <TextField
                  disabled={searchMode !== 'period'}
                  label="Year"
                  onChange={(event) => setYear(event.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { min: 2000, step: 1 } }}
                  sx={{
                    opacity: searchMode === 'period' ? 1 : 0.55,
                    width: { xs: '100%', sm: 140 },
                    '& .MuiInputBase-root': {
                      bgcolor: searchMode === 'period' ? 'background.paper' : 'action.disabledBackground',
                    },
                  }}
                  type="number"
                  value={year}
                />
                <TextField
                  disabled={searchMode !== 'period'}
                  label="Month"
                  onChange={(event) => setMonth(event.target.value)}
                  size="small"
                  slotProps={{ htmlInput: { max: 12, min: 1, step: 1 } }}
                  sx={{
                    opacity: searchMode === 'period' ? 1 : 0.55,
                    width: { xs: '100%', sm: 110 },
                    '& .MuiInputBase-root': {
                      bgcolor: searchMode === 'period' ? 'background.paper' : 'action.disabledBackground',
                    },
                  }}
                  type="number"
                  value={month}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'flex-end' }}>
                <FormControlLabel
                  control={
                    <Radio
                      checked={searchMode === 'work'}
                      onChange={handleSearchModeChange}
                      size="small"
                      value="work"
                    />
                  }
                  label="ค้นหาตาม Work"
                  sx={{ m: 0, whiteSpace: 'nowrap' }}
                />
                <BufferedTextField
                  disabled={searchMode !== 'work'}
                  label="Work Order"
                  onChange={(event) => setWorkOrderSearch(event.target.value)}
                  placeholder={searchMode === 'work' ? 'พิมพ์เลข Work Order' : 'เลือกค้นหาตาม Work ก่อน'}
                  size="small"
                  sx={{
                    opacity: searchMode === 'work' ? 1 : 0.55,
                    width: { xs: '100%', sm: 260 },
                    '& .MuiInputBase-root': {
                      bgcolor: searchMode === 'work' ? 'background.paper' : 'action.disabledBackground',
                    },
                  }}
                  value={workOrderSearch}
                />
              </Stack>
              <BufferedTextField
                className="stock-search-field"
                label="Search / Filter"
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ width: { xs: '100%', sm: 520 } }}
                value={search}
              />
            </Stack>
          </Stack>

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
            expandableIcon={{
              collapsed: <PlusCircle color="#16a34a" size={18} />,
              expanded: <MinusCircle color="#dc2626" size={18} />,
            }}
            expandableRows
            expandableRowsComponent={({ data }) => <StockReportExpandedRow data={data} tableStyles={customStyles} />}
            expandableRowsHideExpander={false}
            highlightOnHover
            noDataComponent={
              loading ? (
                <Stack alignItems="center" direction="row" gap={1} sx={{ py: 3 }}>
                  <CircularProgress size={18} />
                  <Typography fontSize={14}>กำลังโหลดข้อมูล...</Typography>
                </Stack>
              ) : (
                hasSearched ? 'ยังไม่มีข้อมูล' : 'เลือกเงื่อนไข'
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
