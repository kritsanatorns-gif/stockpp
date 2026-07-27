import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography, useTheme } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import * as DataTableModule from 'react-data-table-component'
import { ClipboardList, FileDown, RefreshCw } from 'lucide-react'
import { BufferedTextField } from '../../components/BufferedTextField'
import { getStockOpenShowData } from '../../services/stockApi'
import { exportTableRowsToExcel } from '../../utils/exportExcel'

const DataTable = DataTableModule.default?.default ?? DataTableModule.default
const rowsPerPageOptions = [10, 25, 50, 100]
const columnsWithHeaderSearch = new Set(['Work Order', 'Product Id', 'Product Name', 'Area'])
const stockSummaryColumns = [
  { key: 'Work Order', label: 'Work Order' },
  { key: 'Product Id', label: 'Product Id' },
  { key: 'Product Name', label: 'Product Name' },
  { key: 'Area', label: 'Area' },
  { key: 'Qty Full', label: 'Qty Full' },
  { key: 'Total In', label: 'Total In' },
  { key: 'Total Out', label: 'Total Out' },
  { key: 'Qty Remain', label: 'Qty Remain' },
]

const workOrderKeys = ['Work Order', 'workOrder', 'workId', 'barcode', 'wo', 'WO']
const areaKeys = ['Area', 'area', 'name', 'Name']
const productIdKeys = ['Product Id', 'Product ID', 'productId', 'ProductId', 'product_id']
const productNameKeys = ['Product Name', 'productName', 'ProductName', 'product_name', 'ItemName', 'itemName']
const qtyFullKeys = ['Qty Full', 'QtyFull', 'qtyFull', 'qty_full']
const qtyInKeys = ['Total In', 'qtyIn', 'QtyIn', 'inQty', 'InQty', 'Qty', 'qty', 'quantity', 'Quantity']
const qtyRemainKeys = ['Qty Remain', 'QtyRemain', 'qtyRemain', 'qty_remain', 'remainQty', 'RemainQty']
const qtyOutKeys = ['Total Out', 'qtyOut', 'QtyOut', 'outQty', 'OutQty', 'out_qty']

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

const createSummaryRows = (stockOpenRows) =>
  stockOpenRows.map((row) => {
    const totalIn = getNumberValue(getTextValue(row, qtyInKeys))
    const totalOut = getNumberValue(getTextValue(row, qtyOutKeys))
    const qtyRemain = getFirstValue(row, qtyRemainKeys)

    return {
      'Work Order': getTextValue(row, workOrderKeys),
      'Product Id': getTextValue(row, productIdKeys),
      'Product Name': getTextValue(row, productNameKeys),
      Area: getTextValue(row, areaKeys),
      'Qty Full': getNumberValue(getTextValue(row, qtyFullKeys)),
      'Total In': totalIn,
      'Total Out': totalOut,
      'Qty Remain': qtyRemain !== undefined ? getNumberValue(qtyRemain) : totalIn - totalOut,
    }
  })

const formatCellValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const getSummaryColumnValue = (row, key) => {
  if (key === 'Qty Remain') {
    const qtyRemain = getFirstValue(row, qtyRemainKeys)

    return formatCellValue(qtyRemain !== undefined ? getNumberValue(qtyRemain) : getNumberValue(row['Total In']) - getNumberValue(row['Total Out']))
  }

  return formatCellValue(row[key])
}

const filterRows = (rows, search, columnFilters) => {
  const keyword = search.trim().toLowerCase()

  return rows.filter((row) =>
    (!keyword || stockSummaryColumns.some((column) => getSummaryColumnValue(row, column.key).toLowerCase().includes(keyword))) &&
    Object.entries(columnFilters).every(([key, filter]) => {
      const columnKeyword = filter.trim().toLowerCase()

      return !columnKeyword || getSummaryColumnValue(row, key).toLowerCase().includes(columnKeyword)
    })
  )
}

const getColumnSize = (key) => {
  const textKey = String(key ?? '').trim().toLowerCase()

  if (textKey === 'no') return { width: '90px' }
  if (textKey === 'work order') return { grow: 1.4, minWidth: '170px' }
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
  stockSummaryColumns.map(({ key, label }) => ({
    id: key,
    name: createColumnName({
      filterValue: columnFilters[key] ?? '',
      key,
      label,
      onColumnFilterChange,
    }),
    selector: (row) => getSummaryColumnValue(row, key),
    sortable: true,
    ...getColumnSize(key),
    cell: (row) => (
      <Typography fontSize={14} noWrap title={getSummaryColumnValue(row, key)}>
        {getSummaryColumnValue(row, key)}
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

export function StockSummary() {
  const theme = useTheme()
  const [columnFilters, setColumnFilters] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')

  const handleColumnFilterChange = (key, value) => {
    setColumnFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }
  const filteredRows = useMemo(() => filterRows(rows, search, columnFilters), [columnFilters, rows, search])
  const columns = useMemo(
    () => createColumns({ columnFilters, onColumnFilterChange: handleColumnFilterChange }),
    [columnFilters]
  )
  const customStyles = useMemo(() => createTableStyles(theme), [theme])
  const summary = useMemo(() => {
    return {
      products: rows.length,
    }
  }, [rows])
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

  const loadRows = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getStockOpenShowData()
      setRows(createSummaryRows(normalizeRows(data)))
    } catch (apiError) {
      console.error(apiError)

      setRows([])
      setError(apiError.message || 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    exportTableRowsToExcel({
      filePrefix: 'StockSummary',
      rows: filteredRows,
      sheetName: 'Stock Summary',
    })
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
                Stock Summary
              </Typography>
            </Stack>

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

          <Box
            className="stock-summary-grid"
          >
            {summaryCards.map(({ color, icon: Icon, label, tone, value }) => (
              <Paper
                key={label}
                className={`stock-summary-card stock-summary-card--${tone}`}
                component="article"
                variant="outlined"
              >
                <Box
                  className="stock-summary-card__icon"
                >
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

          <Box className="stock-search-row">
            <BufferedTextField
              className="stock-search-field"
              fullWidth
              label="Search / Filter"
              onChange={(event) => setSearch(event.target.value)}
              size="small"
              value={search}
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
