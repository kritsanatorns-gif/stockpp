import { Autocomplete, Box, Button, Chip, Paper, Stack, TextField, Typography, useTheme } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import * as DataTableModule from 'react-data-table-component'
import dayjs from 'dayjs'
import { Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { BufferedTextField } from '../../components/BufferedTextField'
import { getStatusLabel } from '../../utils/barcode'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'

const DataTable = DataTableModule.default?.default ?? DataTableModule.default
const monospaceFont = 'ui-monospace, SFMono-Regular, Consolas, monospace'
const rowsPerPageOptions = [10, 25, 50, 100]
const centerColumn = {
  center: true,
  compact: true,
}

const getText = (option, keys) => {
  if (typeof option === 'string') return option
  return keys.map((key) => option?.[key]).find(Boolean) ?? ''
}

const getLocationText = (option) =>
  getText(option, ['name', 'Name', 'location', 'Location', 'locationName', 'LocationName', 'area', 'Area'])

const getLocationId = (option) =>
  option?.id ??
  option?.Id ??
  option?.locationId ??
  option?.LocationId ??
  option?.location_id ??
  option?.Location_ID ??
  ''

const normalizeLocationText = (value) => String(value ?? '').trim().toLowerCase()

const findLocationByText = (locations, text) =>
  locations.find((location) => normalizeLocationText(getLocationText(location)) === normalizeLocationText(text))

const getRecordValue = (record, lowerKey, upperKey = lowerKey[0].toUpperCase() + lowerKey.slice(1)) =>
  record?.[lowerKey] ?? record?.[upperKey] ?? ''

const getNumberValue = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())

  return Number.isFinite(number) ? number : null
}

const sanitizeQtyInput = (value) => String(value ?? '').replace(/\D/g, '')

function filterRecords(records, search) {
  const keyword = search.trim().toLowerCase()
  if (!keyword) return records

  return records.filter((record) => {
    const scannedAt = dayjs(record.scannedAt).format('YYYY-MM-DD HH:mm:ss')

    return (
      record.barcode?.toLowerCase().includes(keyword) ||
      record.productId?.toLowerCase().includes(keyword) ||
      record.productName?.toLowerCase().includes(keyword) ||
      getStatusLabel(record.status).toLowerCase().includes(keyword) ||
      scannedAt.includes(keyword)
    )
  })
}

function getWorkOrderValue(record) {
  return String(record?.workId ?? record?.barcode ?? '').trim()
}

function getDuplicateWorkOrders(records) {
  return records
    .map(getWorkOrderValue)
    .filter((workOrder, index, arr) => workOrder && arr.indexOf(workOrder) !== index)
}

function CodeText({ children, color = 'inherit', fontWeight = 400 }) {
  return (
    <Typography component="code" fontFamily={monospaceFont} fontSize={14} color={color} fontWeight={fontWeight}>
      {children}
    </Typography>
  )
}

function createColumns({
  actionsDisabled,
  duplicateWorkOrders,
  onDelete,
  onEdit,
  onShowError,
  selectedArea,
}){
  const isDuplicateWorkOrder = (row) => duplicateWorkOrders.includes(getWorkOrderValue(row))

  return [
    {
      id: 'rowNumber',
      name: 'ลำดับ',
      ...centerColumn,
      cell: (_row, index) => index + 1,
      sortable: false,
      width: '92px',
    },
    {
      id: 'barcode',
      name: 'Work Order',
      ...centerColumn,

      selector: (row) =>
        row.barcode,

      sortable: true,
      grow: 2,

      cell: (row) => (
        <Typography
          component="code"
          fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace"
          fontSize={14}
          color={isDuplicateWorkOrder(row) ? 'warning.dark' : 'inherit'}
          fontWeight={isDuplicateWorkOrder(row) ? 700 : 400}
        >
          {row.barcode}
        </Typography>
      ),
    },
    {
      id: 'Product Id',
      name: 'Product Id',
      selector: (row) => row.productId,
      sortable: true,
      ...centerColumn,
      minWidth: '100px',
      grow: 2,
      cell: (row) => <CodeText>{row.productId}</CodeText>,
    },
    {
      id: 'Product Name',
      name: 'Product Name',
      ...centerColumn,
      selector: (row) => row.productName,
      sortable: true,
      grow: 2,
      cell: (row) => <Typography fontSize={14}>{row.productName}</Typography>,
    },
    {
      id: 'Area',
      name: 'Area',
      ...centerColumn,
      selector: (row) => getRecordValue(row, 'area'),
      sortable: true,
      width: '110px',
      cell: (row) => {
        const area = getRecordValue(row, 'area')
        const isAreaMismatch = selectedArea && area && normalizeLocationText(area) !== normalizeLocationText(selectedArea)

        return (
          <Typography color={isAreaMismatch ? 'error.main' : 'inherit'} fontSize={14} fontWeight={isAreaMismatch ? 700 : 400}>
            {area}
          </Typography>
        )
      },
    },
    {
      id: 'qtyFull',
      name: 'ยอดสูงสุด',
      ...centerColumn,
      selector: (row) => getRecordValue(row, 'qtyFull'),
      sortable: true,
      grow: 1,
      cell: (row) => <Typography fontSize={14}>{getRecordValue(row, 'qtyFull')}</Typography>,
    },
    {
      id: 'qtyRemain',
      name: 'จำนวนคงคลัง',
      ...centerColumn,
      selector: (row) => getRecordValue(row, 'qtyRemain'),
      sortable: true,
      grow: 1,
      cell: (row) => <Typography fontSize={14}>{getRecordValue(row, 'qtyRemain')}</Typography>,
    },
     {
      id: 'Qty',
      name: 'ยอดนำเข้า',
      ...centerColumn,
      selector: (row) => getRecordValue(row, 'qty'),
      sortable: true,
      grow: 1,
      cell: (row) => <Typography fontSize={14}>{getRecordValue(row, 'qty')}</Typography>,
    },
    {
      id: 'Error',
      name: 'Error',
      ...centerColumn,
      selector: (row) => getRecordValue(row, 'error'),
      sortable: true,
      minWidth: '190px',
      cell: (row) => {
        const error = getRecordValue(row, 'error')

        if (!error) return <Typography fontSize={14}>-</Typography>

        return (
          <Button
            color="error"
            onClick={() => onShowError(row)}
            size="small"
            variant="outlined"
          >
            ดู Error
          </Button>
        )
      },
    },
    {
      id: 'status',
      name: 'Status',
      ...centerColumn,
      selector: (row) => row.status,
      sortable: true,
      minWidth: '130px',
      cell: (row) => {
        const isDuplicate = isDuplicateWorkOrder(row)
        const isFailed = row.status === 'failed'

        return (
          <Chip
            color={isFailed ? 'error' : isDuplicate ? 'warning' : 'success'}
            label={isFailed ? 'ผิดพลาด' : isDuplicate ? 'ซ้ำ' : 'สำเร็จ'}
            size="small"
            variant={isFailed || isDuplicate ? 'filled' : 'outlined'}
          />
        )
      },
    },
  {
  name: '',
  button: true,
  ...centerColumn,
  width: '140px',

  cell: (row) => (
    <Stack direction="row">
      <Button
        color="primary"
        disabled={actionsDisabled}
        onClick={() => onEdit(row)}
        size="small"
        variant="text"
      >
        <Pencil size={16} />
      </Button>

      <Button
        aria-label="delete row"
        color="error"
        disabled={actionsDisabled}
        onClick={() => onDelete(row.id)}
        size="small"
        variant="text"
      >
        <Trash2 size={18} />
      </Button>
    </Stack>
  ),
},
  ]
}

function createTableStyles(theme) {
  return {
    table: {
      style: { backgroundColor: theme.palette.background.paper },
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
        minHeight: '58px',
      },
      highlightOnHoverStyle: {
        backgroundColor: theme.palette.action.hover,
        color: theme.palette.text.primary,
      },
    },
    cells: {
      style: {
        borderRight: `1px solid ${theme.palette.divider}`,
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
  }
}

function createRowStyles(theme, duplicateWorkOrders) {
  const duplicateBg = theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.22)' : '#fff8e1'
  const failedBg = theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.22)' : '#ffebee'

  return [
    {
      when: (row) => duplicateWorkOrders.includes(getWorkOrderValue(row)) && row.status !== 'failed',
      style: { backgroundColor: duplicateBg },
    },
    {
      when: (row) => row.status === 'failed',
      style: { backgroundColor: failedBg },
    },
  ]
}



function TableToolbar({
  onSearchChange,
  search,
}) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ alignItems: 'center', p: 2 }}>
      <Box sx={{ width: { xs: '100%', md: 260 } }}>
        <Typography component="h2" fontSize={18} fontWeight={700}>
          รายการที่สแกน
        </Typography>
        <Typography color="text.secondary" fontSize={13}>
          ค้นหา จัดเรียง และส่งออกข้อมูลได้ทันที
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
        <BufferedTextField
          label="Search / Filter"
          onChange={(event) => onSearchChange(event.target.value)}
          size="small"
          sx={{ width: { xs: '100%', md: 'min(520px, 42vw)' } }}
          value={search}
        />
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
     
    
      </Stack>
    </Stack>
  )
}

export function ScanDataTable({ actionsDisabled = false, locations = [], records, search, selectedArea = '', onDelete, onSearchChange, onUpdate }) {
  const theme = useTheme()
  const [editOpen, setEditOpen] =
  useState(false)
  const [selectedRow, setSelectedRow] =
  useState(null)
  const [editData, setEditData] =
  useState({})
  const [editAreaInput, setEditAreaInput] = useState('')
  const [errorRow, setErrorRow] = useState(null)
const handleEdit = useCallback((row) => {
  const area = getRecordValue(row, 'area')
  const locationId = getRecordValue(row, 'locationId')

  setSelectedRow(row)

  setEditData({
    barcode: row.barcode ?? '',
    productId: row.productId ?? '',
    productName: row.productName ?? '',
    qty: getRecordValue(row, 'qty'),
    qtyFull: getRecordValue(row, 'qtyFull'),
    qtyRemain: getRecordValue(row, 'qtyRemain'),
    area,
    locationId,
  })
  setEditAreaInput(area)

  setEditOpen(true)
}, [])

  const qtyLimitError = useMemo(() => {
    const qtyText = String(editData.qty ?? '').trim()
    const qty = getNumberValue(editData.qty)
    const qtyRemain = getNumberValue(editData.qtyRemain)

    if (qtyText === '') return 'กรุณาใส่ Qty'
    if (qty === null || qty <= 0) return 'Qty ต้องมากกว่า 0'
    if (qtyRemain === null || qty <= qtyRemain) return ''

    return `Qty ต้องไม่เกินจำนวนคงคลัง (${editData.qtyRemain})`
  }, [editData.qty, editData.qtyRemain])

const handleSave = useCallback(async () => {
  if (!selectedRow) return

  if (qtyLimitError) {
    toast.error(qtyLimitError)
    return
  }

  const inputArea = editAreaInput.trim()
  const selectedArea = String(editData.area ?? '').trim()
  const inputLocation = findLocationByText(locations, inputArea)
  const selectedLocation = findLocationByText(locations, selectedArea)
  const nextLocation = inputLocation ?? selectedLocation
  const nextArea = nextLocation ? getLocationText(nextLocation) : selectedArea || inputArea
  const nextLocationId = nextLocation ? getLocationId(nextLocation) : editData.locationId ?? ''

  if (inputArea && normalizeLocationText(inputArea) !== normalizeLocationText(selectedArea) && !inputLocation) {
    toast.error('กรุณาเลือก Area จากรายการ')
    return
  }

  if (!nextLocationId) {
    toast.error('ไม่พบ locationId ของ Area ที่เลือก')
    return
  }

  await onUpdate?.(selectedRow.id, {
    qty: editData.qty ?? '',
    area: nextArea,
    locationId: nextLocationId,
  })

  setEditOpen(false)
  setSelectedRow(null)
}, [editAreaInput, editData.area, editData.locationId, editData.qty, locations, onUpdate, qtyLimitError, selectedRow])

  const selectedEditLocationOption = useMemo(
    () => locations.find((item) => getLocationText(item) === (editData.area ?? '')) ?? null,
    [editData.area, locations],
  )
  const filteredEditLocations = useMemo(() => {
    const keyword = editAreaInput.trim().toLowerCase()
    const currentArea = getRecordValue(selectedRow, 'area').trim().toLowerCase()

    if (!keyword || keyword === currentArea) return locations

    return locations.filter((location) => getLocationText(location).toLowerCase().includes(keyword))
  }, [editAreaInput, locations, selectedRow])
  const duplicateWorkOrders = useMemo(() => getDuplicateWorkOrders(records), [records])
  const filteredRecords = useMemo(() => filterRecords(records, search), [records, search])
const columns = useMemo(
  () =>
    createColumns({
      actionsDisabled,
      duplicateWorkOrders,
      onDelete,
      onEdit: handleEdit,
      onShowError: setErrorRow,
      selectedArea,
    }),
  [actionsDisabled, duplicateWorkOrders, handleEdit, onDelete, selectedArea]
)
  const customStyles = useMemo(() => createTableStyles(theme), [theme])
  const conditionalRowStyles = useMemo(() => createRowStyles(theme, duplicateWorkOrders), [theme, duplicateWorkOrders])

  return (
    <Paper component="section" variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <TableToolbar
        onSearchChange={onSearchChange}
        search={search}
      />

      <DataTable
        columns={columns}
        conditionalRowStyles={conditionalRowStyles}
        customStyles={customStyles}
        data={filteredRecords}
        defaultSortAsc={false}
        dense
        highlightOnHover
        noDataComponent="ยังไม่มีข้อมูลสแกน"
        pagination
        paginationComponentOptions={{ rowsPerPageText: 'แสดงต่อหน้า', rangeSeparatorText: 'จาก' }}
        paginationPerPage={25}
        paginationRowsPerPageOptions={rowsPerPageOptions}
        persistTableHead
        responsive
      />
      <Dialog
  open={editOpen}
  onClose={() => setEditOpen(false)}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>
    แก้ไขข้อมูล
  </DialogTitle>

  <DialogContent>
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="Work Order"
        value={editData.barcode ?? ''}
        disabled
        onChange={(e) =>
          setEditData({
            ...editData,
            barcode: e.target.value,
          })
        }
      />

      <TextField
        label="Product ID"
        value={editData.productId ?? ''}
        disabled
        onChange={(e) =>
          setEditData({
            ...editData,
            productId: e.target.value,
          })
        }
      />

      <TextField
        label="Product Name"
        value={editData.productName ?? ''}
        disabled
        onChange={(e) =>
          setEditData({
            ...editData,
            productName: e.target.value,
          })
        }
      />
      <TextField
        label="Qty สูงสุด"
        value={editData.qtyFull ?? ''}
        disabled
        onChange={(e) =>
          setEditData({
            ...editData,
            qtyFull: e.target.value,
          })
        }
      />
      <TextField
        label="จำนวนคงคลัง"
        value={editData.qtyRemain ?? ''}
        disabled
        onChange={(e) =>
          setEditData({
            ...editData,
            qtyRemain: e.target.value,
          })
        }
      />
      <TextField
        error={Boolean(qtyLimitError)}
        helperText={qtyLimitError}
        label="Qty"
        value={editData.qty ?? ''}
        onChange={(e) =>
          setEditData({
            ...editData,
            qty: sanitizeQtyInput(e.target.value),
          })
        }
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            min: 1,
            pattern: '[0-9]*',
          },
        }}
      />
      <Autocomplete
        autoHighlight
        clearOnBlur={false}
        filterOptions={(options) => options}
        getOptionLabel={getLocationText}
        inputValue={editAreaInput}
        isOptionEqualToValue={(option, value) => getLocationText(option) === getLocationText(value)}
        noOptionsText="ไม่พบพื้นที่"
        onChange={(_, newValue) => {
          const nextArea = getLocationText(newValue)
          const nextLocationId = getLocationId(newValue)

          setEditData({
            ...editData,
            area: nextArea,
            locationId: nextLocationId,
          })
          setEditAreaInput(nextArea)
        }}
        onInputChange={(_, newValue) => {
          setEditAreaInput(newValue)
        }}
        openOnFocus
        options={filteredEditLocations}
        value={selectedEditLocationOption}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Area"
            placeholder="พิมพ์เพื่อค้นหาพื้นที่"
          />
        )}
      />
    </Stack>
  </DialogContent>

  <DialogActions>
    <Button
      onClick={() =>
        setEditOpen(false)
      }
    >
      Cancel
    </Button>

    <Button
      variant="contained"
      onClick={handleSave}
    >
      Save
    </Button>
  </DialogActions>
</Dialog>
      <Dialog
        open={Boolean(errorRow)}
        onClose={() => setErrorRow(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>รายละเอียด Error</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Typography fontSize={14}>Work Order: {errorRow?.workId ?? errorRow?.barcode ?? ''}</Typography>
            <Typography fontSize={14}>Product Id: {errorRow?.productId ?? ''}</Typography>
            <Typography fontSize={14}>Product Name: {errorRow?.productName ?? ''}</Typography>
            <Typography fontSize={14}>Qty: {getRecordValue(errorRow, 'qty')}</Typography>
            <Typography fontSize={14}>Status: {errorRow?.backendSaveStatus ?? errorRow?.status ?? ''}</Typography>
            <Typography color="error" fontSize={14}>Error: {getRecordValue(errorRow, 'error')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorRow(null)} variant="contained">
            ตกลง
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
