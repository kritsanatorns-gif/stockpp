import { Grid, Paper, Stack, Typography } from '@mui/material'
import { AlertTriangle, ClipboardList } from 'lucide-react'

const stats = [
  {
    color: 'text.primary',
    icon: ClipboardList,
    key: 'total',
    label: 'รายการทั้งหมด',
    tone: 'blue',
  },
  {
    color: 'warning.main',
    icon: AlertTriangle,
    key: 'duplicate',
    label: 'ซ้ำ',
    tone: 'amber',
  },
  {
    color: 'error.main',
    icon: AlertTriangle,
    key: 'error',
    label: 'error',
    tone: 'red',
  },
]

const getWorkOrderValue = (record) => String(record?.workId ?? record?.barcode ?? '').trim()

const getDuplicateWorkOrders = (records) =>
  records
    .map(getWorkOrderValue)
    .filter((workOrder, index, arr) => workOrder && arr.indexOf(workOrder) !== index)

export function StatCards({ records }) {
  const duplicateWorkOrders = getDuplicateWorkOrders(records)
  const duplicateCount = records.filter((record) => duplicateWorkOrders.includes(getWorkOrderValue(record))).length
  const errorCount = records.filter((record) => record.status === 'failed' || record.error).length

  const counts = {
    duplicate: duplicateCount,
    error: errorCount,
    total: records.length,
  }

  return (
    <Grid container spacing={2}>
      {stats.map(({ color, icon: Icon, key, label, tone }) => (
        <Grid key={key} size={{ xs: 12 }}>
          <Paper
            className={`stock-summary-card stock-summary-card--${tone}`}
            variant="outlined"
          >
            <Stack alignItems="center" direction="row" gap={1.5}>
              <Stack
                alignItems="center"
                className="stock-summary-card__icon"
                justifyContent="center"
              >
                <Icon color="currentColor" size={24} strokeWidth={2.2} />
              </Stack>
              <Stack>
                <Typography color="text.secondary" fontSize={13}>
                  {label}
                </Typography>
                <Typography color={color} fontSize={28} fontWeight={800} lineHeight={1.15}>
                  {counts[key].toLocaleString('th-TH')}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}
