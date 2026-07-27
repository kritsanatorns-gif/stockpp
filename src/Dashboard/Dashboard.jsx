import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardList, MapPinned } from 'lucide-react'
import { Box, Container, MenuItem, Paper, Select, Stack, Typography, useTheme } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { getStockPPInShowData, getStockPPOutShowData } from '../services/stockApi'
import './Dashboard.css'

const areaKeys = ['Area', 'area']
const createdDateKeys = ['create_ByDate', 'Create_ByDate', 'createdDate', 'createdAt', 'Saved At', 'savedAt']
const productIdKeys = ['Product Id', 'Product ID', 'productId', 'ProductId', 'product_id']
const qtyKeys = ['Qty', 'qty', 'quantity', 'Quantity']
const qtyRemainKeys = ['qtyRemain', 'QtyRemain', 'qty_remain', 'remainQty', 'RemainQty']
const outQtyKeys = ['Out Qty', 'outQty', 'qtyOut', 'QtyOut', 'out_qty']

const normalizeRows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (Array.isArray(data)) return data
  return data ? [data] : []
}

const getFirstValue = (row, keys) => {
  for (const key of keys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') return row[key]
  }

  return undefined
}

const getTextValue = (row, keys) => String(getFirstValue(row, keys) ?? '').trim()
const getNumberValue = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(number) ? number : 0
}

const summaryCards = [
  { key: 'products', icon: ClipboardList, label: 'Products', tone: 'blue' },
  { key: 'totalIn', icon: ArrowDownToLine, label: 'Stock In', tone: 'cyan' },
  { key: 'totalOut', icon: ArrowUpFromLine, label: 'Stock Out', tone: 'violet' },
  { key: 'balance', icon: Boxes, label: 'Balance', tone: 'green' },
  { key: 'areas', icon: MapPinned, label: 'Areas', tone: 'amber' },
  { key: 'lowBalance', icon: AlertTriangle, label: 'Low Stock', tone: 'red' },
]

const dateRangeOptions = [
  { label: '3 วันล่าสุด', value: '3' },
  { label: '7 วันล่าสุด', value: '7' },
  { label: '30 วันล่าสุด', value: '30' },
  { label: 'ทั้งหมด', value: 'all' },
]

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

const getRowDate = (row) => parseDateValue(getFirstValue(row, createdDateKeys))

const formatChartDateKey = (date) => {
  const pad = (number) => String(number).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const formatChartLabel = (date) => {
  const pad = (number) => String(number).padStart(2, '0')

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

const filterRowsByDateRange = (rows, dateRange) => {
  if (dateRange === 'all') return rows

  const days = Number(dateRange)
  const fromDate = new Date()
  fromDate.setHours(0, 0, 0, 0)
  fromDate.setDate(fromDate.getDate() - Math.max(days - 1, 0))

  return rows.filter((row) => {
    const rowDate = getRowDate(row)

    return rowDate ? rowDate >= fromDate : false
  })
}

const createDateBuckets = (dateRange, inRows, outRows) => {
  if (dateRange !== 'all') {
    const days = Number(dateRange)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return Array.from({ length: days }, (_item, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (days - 1 - index))

      return {
        date,
        inValue: 0,
        label: formatChartLabel(date),
        outValue: 0,
      }
    })
  }

  const dateKeys = [...inRows, ...outRows]
    .map(getRowDate)
    .filter(Boolean)
    .map((date) => {
      const day = new Date(date)
      day.setHours(0, 0, 0, 0)

      return formatChartDateKey(day)
    })
    .sort()
    .filter((key, index, array) => array.indexOf(key) === index)

  return dateKeys.map((key) => {
    const [year, month, day] = key.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    return {
      date,
      inValue: 0,
      label: formatChartLabel(date),
      outValue: 0,
    }
  })
}

const createTimeSeries = ({ dateRange, inRows, outRows }) => {
  const buckets = createDateBuckets(dateRange, inRows, outRows)
  const bucketByDate = new Map(buckets.map((bucket) => [formatChartDateKey(bucket.date), bucket]))

  inRows.forEach((row) => {
    const rowDate = getRowDate(row)
    if (!rowDate) return

    const bucket = bucketByDate.get(formatChartDateKey(rowDate))
    if (bucket) bucket.inValue += getNumberValue(getTextValue(row, qtyKeys))
  })

  outRows.forEach((row) => {
    const rowDate = getRowDate(row)
    if (!rowDate) return

    const bucket = bucketByDate.get(formatChartDateKey(rowDate))
    if (bucket) bucket.outValue += getNumberValue(getTextValue(row, outQtyKeys))
  })

  return buckets
}

const createLinePath = (items, key, maxValue) => {
  if (items.length === 0) return ''

  const width = 620
  const height = 190
  const left = 20
  const top = 20
  const step = items.length > 1 ? (width - left * 2) / (items.length - 1) : 0
  const points = items.map((item, index) => {
    const x = items.length > 1 ? left + step * index : width / 2
    const y = top + height - (item[key] / maxValue) * height

    return `${x.toFixed(1)} ${y.toFixed(1)}`
  })

  return `M ${points.join(' L ')}`
}

const getPointPosition = (items, index, value, maxValue) => {
  const width = 620
  const height = 190
  const left = 20
  const top = 20
  const step = items.length > 1 ? (width - left * 2) / (items.length - 1) : 0

  return {
    x: items.length > 1 ? left + step * index : width / 2,
    y: top + height - (value / maxValue) * height,
  }
}

const shouldShowTimeLabel = (index, items) => {
  if (items.length <= 10) return true
  if (index === 0 || index === items.length - 1) return true

  return index % Math.ceil(items.length / 8) === 0
}

const getOldStockInCount = (inRows) => {
  const thresholdDate = new Date()
  thresholdDate.setHours(0, 0, 0, 0)
  thresholdDate.setDate(thresholdDate.getDate() - 100)

  return inRows.filter((row) => {
    const rowDate = getRowDate(row)
    const qtyRemain = getNumberValue(getTextValue(row, qtyRemainKeys))

    return rowDate && rowDate < thresholdDate && qtyRemain !== 0
  }).length
}

export function Dashboard() {
  const theme = useTheme()
  const [dateRange, setDateRange] = useState('3')
  const [rows, setRows] = useState({ inRows: [], outRows: [] })

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        const [stockInData, stockOutData] = await Promise.all([getStockPPInShowData(), getStockPPOutShowData()])
        if (!mounted) return

        setRows({
          inRows: normalizeRows(stockInData),
          outRows: normalizeRows(stockOutData),
        })
      } catch (error) {
        console.error(error)
        if (!mounted) return

        setRows({
          inRows: [],
          outRows: [],
        })
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const dateFilteredRows = useMemo(
    () => ({
      inRows: filterRowsByDateRange(rows.inRows, dateRange),
      outRows: filterRowsByDateRange(rows.outRows, dateRange),
    }),
    [dateRange, rows]
  )

  const metrics = useMemo(() => {
    const totalIn = dateFilteredRows.inRows.reduce((sum, row) => sum + getNumberValue(getTextValue(row, qtyKeys)), 0)
    const totalOut = dateFilteredRows.outRows.reduce((sum, row) => sum + getNumberValue(getTextValue(row, outQtyKeys)), 0)
    const products = new Set([...dateFilteredRows.inRows, ...dateFilteredRows.outRows].map((row) => getTextValue(row, productIdKeys)).filter(Boolean))
    const areas = new Set([...dateFilteredRows.inRows, ...dateFilteredRows.outRows].map((row) => getTextValue(row, areaKeys)).filter(Boolean))
    const balance = totalIn - totalOut
    const oldStockIn = getOldStockInCount(rows.inRows)

    return {
      areas: areas.size,
      balance,
      lowBalance: oldStockIn,
      products: products.size || dateFilteredRows.inRows.length + dateFilteredRows.outRows.length,
      totalIn,
      totalOut,
    }
  }, [dateFilteredRows, rows.inRows])

  const timeSeries = useMemo(
    () => createTimeSeries({ dateRange, inRows: dateFilteredRows.inRows, outRows: dateFilteredRows.outRows }),
    [dateFilteredRows.inRows, dateFilteredRows.outRows, dateRange]
  )
  const visibleTimeLabels = useMemo(
    () => timeSeries.filter((_item, index) => shouldShowTimeLabel(index, timeSeries)),
    [timeSeries]
  )
  const maxBar = Math.max(...timeSeries.flatMap((item) => [item.inValue, item.outValue]), 1)
  const inLinePath = useMemo(() => createLinePath(timeSeries, 'inValue', maxBar), [maxBar, timeSeries])
  const outLinePath = useMemo(() => createLinePath(timeSeries, 'outValue', maxBar), [maxBar, timeSeries])
  const pieTotal = Math.max(metrics.totalIn + metrics.totalOut, 1)
  const inPie = Math.round((metrics.totalIn / pieTotal) * 100)

  return (
    <Box className={`dashboard-page dashboard-page--${theme.palette.mode}`} component="main">
      <Container className="dashboard-container" maxWidth={false}>
        <Stack className="dashboard-heading">
          <Typography className="dashboard-eyebrow">Pages / Main Dashboard</Typography>
          <Typography className="dashboard-title" component="h2">Main Dashboard</Typography>
          <Select
            onChange={(event) => setDateRange(event.target.value)}
            size="small"
            sx={{ maxWidth: 180 }}
            value={dateRange}
          >
            {dateRangeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Box className="dashboard-stat-grid">
          {summaryCards.map(({ icon: Icon, key, label, tone }) => (
            <Paper className={`dashboard-stat-card dashboard-stat-card--${tone}`} key={key} variant="outlined">
              <Box className="dashboard-stat-icon">
                <Icon size={19} />
              </Box>
              <Box>
                <Typography className="dashboard-stat-label">{label}</Typography>
                <Typography className="dashboard-stat-value">{metrics[key].toLocaleString()}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        <Box className="dashboard-grid">
          <Paper className="dashboard-panel dashboard-panel--wide" variant="outlined">
            <Stack className="dashboard-panel-header" direction="row">
              <Box>
                <Typography className="dashboard-panel-title">Stock Movement</Typography>
                <Typography className="dashboard-panel-value">{metrics.balance.toLocaleString()}</Typography>
              </Box>
              <Stack className="dashboard-legend" direction="row">
                <span className="dashboard-legend__dot dashboard-legend__dot--in" />
                <Typography>In</Typography>
                <span className="dashboard-legend__dot dashboard-legend__dot--out" />
                <Typography>Out</Typography>
              </Stack>
            </Stack>
            <Box className="dashboard-line-chart" aria-hidden="true">
              <svg viewBox="0 0 620 220" role="img">
                {[55, 105, 155, 205].map((y) => (
                  <line className="dashboard-grid-line" key={y} x1="20" x2="600" y1={y} y2={y} />
                ))}
                <path className="dashboard-line dashboard-line--primary" d={inLinePath} />
                <path className="dashboard-line dashboard-line--secondary" d={outLinePath} />
                {timeSeries.map((item, index) => {
                  if (item.inValue <= 0) return null

                  const point = getPointPosition(timeSeries, index, item.inValue, maxBar)

                  return <circle className="dashboard-point dashboard-point--in" cx={point.x} cy={point.y} key={`in-${item.label}`} r="5" />
                })}
                {timeSeries.map((item, index) => {
                  if (item.outValue <= 0) return null

                  const point = getPointPosition(timeSeries, index, item.outValue, maxBar)

                  return <circle className="dashboard-point dashboard-point--out" cx={point.x} cy={point.y} key={`out-${item.label}`} r="5" />
                })}
              </svg>
              <Box className="dashboard-months" style={{ gridTemplateColumns: `repeat(${Math.max(visibleTimeLabels.length, 1)}, 1fr)` }}>
                {visibleTimeLabels.map((item) => <span key={item.label}>{item.label}</span>)}
              </Box>
            </Box>
          </Paper>

          <Paper className="dashboard-panel" variant="outlined">
            <Typography className="dashboard-panel-title">Daily Stock</Typography>
            <Box className="dashboard-bars-scroll">
              <Box className="dashboard-bars" style={{ gridTemplateColumns: `repeat(${Math.max(timeSeries.length, 1)}, minmax(34px, 1fr))` }}>
                {timeSeries.map((item, index) => (
                  <Box className="dashboard-bar-item" key={item.label}>
                    <Box className="dashboard-bar-track" title={`${item.label} In ${item.inValue.toLocaleString()} / Out ${item.outValue.toLocaleString()}`}>
                      <span className="dashboard-bar dashboard-bar--out" style={{ height: `${(item.outValue / maxBar) * 100}%` }} />
                      <span className="dashboard-bar dashboard-bar--in" style={{ height: `${(item.inValue / maxBar) * 100}%` }} />
                    </Box>
                    <Typography>{shouldShowTimeLabel(index, timeSeries) ? item.label : ''}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>

          <Paper className="dashboard-panel" variant="outlined">
            <Typography className="dashboard-panel-title">Check Table</Typography>
            <Stack className="dashboard-check-list">
              {[
                ['Stock In', metrics.totalIn],
                ['Stock Out', metrics.totalOut],
                ['Balance', metrics.balance],
              ].map(([label, value]) => (
                <Box className="dashboard-check-row" key={label}>
                  <span />
                  <Typography>{label}</Typography>
                  <Typography>{value.toLocaleString()}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper className="dashboard-panel" variant="outlined">
            <Typography className="dashboard-panel-title">Stock Ratio</Typography>
            <Box className="dashboard-pie-wrap">
              <Box className="dashboard-pie" style={{ '--in-pie': `${inPie}%` }} />
              <Stack gap={0.75}>
                <Typography className="dashboard-pie-label">In {inPie}%</Typography>
                <Typography className="dashboard-pie-label dashboard-pie-label--out">Out {100 - inPie}%</Typography>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
