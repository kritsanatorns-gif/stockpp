import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { ScanDataTable } from '../components/ScanDataTable'
import { ScanPanel } from '../components/ScanPanel'
import { StatCards } from '../components/StatCards'

import { useAutoFocus } from '../../hooks/useAutoFocus'
import { useBarcodeShortcuts } from '../../hooks/useBarcodeShortcuts'
import { checkStockWO, getStockLocations, postStockPPInAddData } from '../../services/stockApi'
import { useAuthStore } from '../../store/authStore'
import { useStockInScanStore } from '../../store/scanStore'
import { normalizeBarcode } from '../../utils/barcode'
import { exportScansToExcel } from '../../utils/exportExcel'
import { playSuccessBeep } from '../../utils/sound'

const getFirstResult = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

const hasStockWOMatch = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (Array.isArray(data)) return data.some((item) => item?.wo ?? item?.WO)
  if (!data) return false
  if (data.status === false || data.Status === false) return false
  if (data.error || data.Error) return false
  return Boolean(data.wo ?? data.WO)
}

const normalizeStockWOData = (payload) => {
  const data = getFirstResult(payload) ?? {}
  const wo = data.wo ?? data.WO ?? ''

  return {
    stockInId: data.id ?? data.Id ?? data.ID ?? null,
    area: data.area ?? data.Area ?? '',
    error: data.error ?? data.Error ?? '',
    locationId: data.locationId ?? data.LocationId ?? data.stock_PP_Location_Id ?? data.Stock_PP_Location_Id ?? null,
    locationName: data.locationName ?? data.LocationName ?? data.name ?? data.Name ?? '',
    message: data.message ?? data.Message ?? `พบข้อมูล WO: ${wo}`,
    workId: wo,
    productId: data.productId ?? data.ProductId ?? data.product_id ?? '',
    productName: data.productName ?? data.ProductName ?? data.product_name ?? data.ItemName ?? data.itemName ?? '',
    qtyFull: data.qtyFull ?? data.QtyFull ?? data.qty_full ?? '',
    qtyRemain: data.qtyRemain ?? data.QtyRemain ?? data.qty_remain ?? data.remainQty ?? data.RemainQty ?? '',
    qty: data.qty ?? data.Qty ?? data.quantity ?? data.Quantity ?? '',
    status: 'success',
  }
}

const getLocationText = (option) => {
  if (typeof option === 'string') return option

  return (
    option?.name ??
    option?.Name ??
    option?.location ??
    option?.Location ??
    option?.locationName ??
    option?.LocationName ??
    option?.area ??
    option?.Area ??
    ''
  )
}

const getLocationId = (option) =>
  option?.id ??
  option?.Id ??
  option?.locationId ??
  option?.LocationId ??
  option?.location_id ??
  option?.Location_ID ??
  ''

const hasLocationId = (value) => value !== null && value !== undefined && String(value).trim() !== ''

const getNumberPayloadValue = (value) => {
  const number = Number(String(value ?? '').replace(/,/g, '').trim())

  return Number.isFinite(number) ? number : 0
}

const getInvalidQtyRecord = (records) =>
  records.find((record) => getNumberPayloadValue(record.qty) <= 0)

const getRecordLocationId = ({ fallbackLocationId, record }) => {
  const recordLocationId = hasLocationId(record.locationId) ? getNumberPayloadValue(record.locationId) : 0

  return recordLocationId || getNumberPayloadValue(fallbackLocationId)
}

const createStockInAddPayload = ({ employeeId, fallbackLocationId, record }) => ({
  id: record.stockInId ?? null,
  wo: record.workId ?? record.barcode ?? '',
  productId: record.productId ?? '',
  productName: record.productName ?? '',
  locationId: getRecordLocationId({ fallbackLocationId, record }),
  qtyFull: getNumberPayloadValue(record.qtyFull),
  qty: getNumberPayloadValue(record.qty),
  user: String(employeeId ?? ''),
  status: 1,
  error: null,
})

const normalizeStockInSaveResults = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  const items = data?.item ?? data?.Item ?? data?.items ?? data?.Items
  if (Array.isArray(items)) return items
  if (items) return [items]
  if (Array.isArray(data)) return data
  return data ? [data] : []
}

const getStockInSaveFailures = (payload) =>
  normalizeStockInSaveResults(payload).filter((item) => {
    const error = item?.error ?? item?.Error

    return Boolean(error)
  })

const getStockInSaveFailureEntries = (payload) =>
  normalizeStockInSaveResults(payload)
    .map((item, index) => ({
      index,
      item,
    }))
    .filter(({ item }) => {
      const error = item?.error ?? item?.Error

      return Boolean(error)
    })

const getSaveResultWo = (item) => String(item?.wo ?? item?.WO ?? item?.WorkOrder ?? '').trim()
const getSaveResultError = (item) => item?.error ?? item?.Error ?? item?.message ?? item?.Message ?? ''
const getSaveResultStatus = (item) => Number(item?.status ?? item?.Status ?? 0)
const getSaveResultLocationId = (item) =>
  item?.locationId ?? item?.LocationId ?? item?.stock_PP_Location_Id ?? item?.Stock_PP_Location_Id ?? ''
const getSaveResultQty = (item) => item?.qty ?? item?.Qty ?? item?.quantity ?? item?.Quantity ?? ''

const getSaveMatchKey = ({ locationId, qty, wo }) =>
  [
    String(wo ?? '').trim(),
    String(getNumberPayloadValue(locationId)),
    String(getNumberPayloadValue(qty)),
  ].join('|')

const getRecordSaveMatchKey = ({ fallbackLocationId, record }) =>
  getSaveMatchKey({
    locationId: getRecordLocationId({ fallbackLocationId, record }),
    qty: record.qty,
    wo: record.workId ?? record.barcode ?? '',
  })

const getResultSaveMatchKey = (item) =>
  getSaveMatchKey({
    locationId: getSaveResultLocationId(item),
    qty: getSaveResultQty(item),
    wo: getSaveResultWo(item),
  })

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

const isCompletedQtyMessage = (message) => {
  const text = String(message ?? '').trim()

  return text.includes('ครบ') && text.includes('จำนวน')
}

export function BarcodeStockCheckerin() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [barcode, setBarcode] = useState('')
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTableActionLocked, setIsTableActionLocked] = useState(false)
  const [scanAlertMessage, setScanAlertMessage] = useState('')
  const [locations, setLocations] = useState([])
  const [selectedArea, setSelectedArea] = useState('')
  const { employee, employeeId } = useAuthStore()
  const { addScan, clearScans, records, removeScan, updateScan } = useStockInScanStore()
  const isLoggedIn = Boolean(employeeId)
  const employeeName = employee?.name ?? employee?.Name ?? ''
  const stockInControlsLocked = isTableActionLocked && records.length > 0

  const focusScanner = useCallback(() => {
    if (isLoggedIn && selectedArea && !stockInControlsLocked) requestAnimationFrame(() => inputRef.current?.focus())
  }, [isLoggedIn, selectedArea, stockInControlsLocked])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const data = await getStockLocations()
        setLocations(data ?? [])
      } catch (error) {
        console.error(error)
        toast.error('โหลดพื้นที่ไม่สำเร็จ')
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => () => {
    clearScans()
  }, [clearScans])

  const handleSubmit = useCallback(
    async (event, submittedBarcode = barcode) => {
      event.preventDefault()

      if (!employeeId) {
        setBarcode('')
        toast.error('กรุณาล็อกอินด้วยรหัสพนักงานก่อนยิง Work Order')
        return
      }

      if (!selectedArea) {
        toast.error('กรุณาเลือกพื้นที่ก่อนยิง Work Order')
        return
      }

      const normalizedBarcode = normalizeBarcode(submittedBarcode)
      if (!normalizedBarcode || isSubmitting) {
        focusScanner()
        return
      }

      setIsSubmitting(true)

      try {
        const stockWOData = await checkStockWO(normalizedBarcode)

        if (!hasStockWOMatch(stockWOData)) {
          setBarcode('')
          toast.error(`ไม่พบข้อมูล WO: ${normalizedBarcode}`)
          return
        }

        const normalizedStockWOData = normalizeStockWOData(stockWOData)
        const apiLocationId = hasLocationId(normalizedStockWOData.locationId)
          ? getNumberPayloadValue(normalizedStockWOData.locationId)
          : 0
        const apiLocation = apiLocationId
          ? locations.find((location) => getNumberPayloadValue(getLocationId(location)) === apiLocationId)
          : null
        const backendData = {
          ...normalizedStockWOData,
          area: apiLocationId
            ? getLocationText(apiLocation) || normalizedStockWOData.locationName || normalizedStockWOData.area || String(apiLocationId)
            : selectedArea,
        }
        const record = await addScan(normalizedBarcode, employeeId, backendData)

        setBarcode('')
        await playSuccessBeep()

        if (record.status === 'duplicate') {
          toast.error(`Work Order ซ้ำ: ${record.barcode}`)
        } else if (record.status === 'failed') {
          toast.error(backendData.message || backendData.error || 'Backend แจ้งว่ารายการผิดพลาด')
        } else {
          toast.success(backendData.message || `สแกนสำเร็จ: ${record.barcode}`)
        }
      } catch (error) {
        const errorMessage = getApiErrorMessage(error)

        if (isCompletedQtyMessage(errorMessage)) {
          setBarcode('')
          setScanAlertMessage(errorMessage)
          return
        }

        await addScan(normalizedBarcode, employeeId, {
          error: errorMessage,
          status: 'failed',
        })
        setBarcode('')
        toast.error(`ตรวจสอบ Work Order ไม่สำเร็จ: ${errorMessage}`)
      } finally {
        setIsSubmitting(false)
        focusScanner()
      }
    },
    [addScan, barcode, employeeId, focusScanner, isSubmitting, locations, selectedArea],
  )

  const handleAreaChange = useCallback(
    (location) => {
      const nextArea = getLocationText(location)

      setSelectedArea(nextArea)
      setBarcode('')

      if (nextArea && isLoggedIn) {
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    },
    [isLoggedIn],
  )

  const handleClear = useCallback(async () => {
    await clearScans()
    setIsTableActionLocked(false)
    toast.success('ล้างรายการทั้งหมดแล้ว')
    focusScanner()
  }, [clearScans, focusScanner])

  const handleDelete = useCallback(
    async (id) => {
      await removeScan(id)
      toast.success('ลบรายการแล้ว')
      focusScanner()
    },
    [focusScanner, removeScan],
  )

  const handleUpdate = useCallback(
    async (id, updates) => {
      await updateScan(id, updates)
      toast.success('บันทึกการแก้ไขแล้ว')
      focusScanner()
    },
    [focusScanner, updateScan],
  )

  const handleExport = useCallback(async () => {
    if (records.length === 0) {
      toast.error('ยังไม่มีข้อมูลสำหรับ Export')
      focusScanner()
      return
    }

    await exportScansToExcel(records)
    toast.success('Export Excel เรียบร้อย')
    focusScanner()
  }, [focusScanner, records])

  const handleSave = useCallback(() => {
    if (records.length === 0) {
      toast.error('ยังไม่มีข้อมูลสำหรับบันทึก')
      focusScanner()
      return
    }

    const selectedLocation = locations.find((location) => getLocationText(location) === selectedArea)
    const fallbackLocationId = getLocationId(selectedLocation)

    if (!fallbackLocationId) {
      toast.error('ไม่พบ locationId ของพื้นที่ที่เลือก')
      focusScanner()
      return
    }

    const missingLocationRecord = records.find((record) => !getRecordLocationId({ fallbackLocationId, record }))

    if (missingLocationRecord) {
      const workOrder = missingLocationRecord.workId ?? missingLocationRecord.barcode ?? ''
      toast.error(`ไม่พบ locationId${workOrder ? `: ${workOrder}` : ''}`)
      focusScanner()
      return
    }

    const invalidQtyRecord = getInvalidQtyRecord(records)

    if (invalidQtyRecord) {
      const workOrder = invalidQtyRecord.workId ?? invalidQtyRecord.barcode ?? ''

      toast.error(`ยอดนำเข้าต้องมากกว่า 0${workOrder ? `: ${workOrder}` : ''}`)
      focusScanner()
      return
    }

    const saveRecords = async () => {
      setIsTableActionLocked(true)
      setIsSaving(true)

      try {
        const payloads = records.map((record) =>
          createStockInAddPayload({
            employeeId,
            fallbackLocationId,
            record,
          })
        )

        const saveResult = await postStockPPInAddData(payloads)
        const failures = getStockInSaveFailures(saveResult)
        const failureEntries = getStockInSaveFailureEntries(saveResult)

        if (failures.length > 0) {
          const firstFailure = failures[0]
          const failureWo = getSaveResultWo(firstFailure)
          const failureError = getSaveResultError(firstFailure)
          const usedRecordIds = new Set()
          await Promise.all(
            failureEntries.map(({ index, item }) => {
              const failureKey = getResultSaveMatchKey(item)
              const matchingRecord =
                records.find((record) => {
                  if (usedRecordIds.has(record.id)) return false

                  return getRecordSaveMatchKey({ fallbackLocationId, record }) === failureKey
                }) ?? records[index]

              if (!matchingRecord) return Promise.resolve()

              usedRecordIds.add(matchingRecord.id)

              return updateScan(matchingRecord.id, {
                backendSaveStatus: getSaveResultStatus(item),
                error: getSaveResultError(item),
                status: 'failed',
              })
            })
          )

          throw new Error(failureWo ? `${failureWo}: ${failureError}` : failureError)
        }

        toast.success(`บันทึก Stock In สำเร็จ ${payloads.length} รายการ`)
      } catch (error) {
        console.error(error)
        toast.error(`บันทึก Stock In ไม่สำเร็จ: ${error.message}`)
      } finally {
        setIsSaving(false)
        focusScanner()
      }
    }

    saveRecords()
  }, [employeeId, focusScanner, locations, records, selectedArea, updateScan])

  useAutoFocus(inputRef, isLoggedIn && Boolean(selectedArea) && !stockInControlsLocked)
  useBarcodeShortcuts({
    enabled: isLoggedIn && Boolean(selectedArea) && !stockInControlsLocked,
    inputRef,
    onClear: handleClear,
    onExport: handleExport,
  })

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt)),
    [records],
  )

  return (
    <Box className="stock-page" component="main">
      <Container className="stock-page__container" maxWidth={false}>
        <Stack spacing={2.25}>
          <Box className="stock-back-row">
            <Button onClick={() => navigate('/StockPPInShowData')} startIcon={<ArrowLeft size={18} />} variant="outlined">
              ย้อนกลับ
            </Button>
          </Box>
          <Box
            className="stock-scanner-layout"
          >
            <ScanPanel
              barcode={barcode}
              controlsLocked={stockInControlsLocked}
              disabled={!isLoggedIn}
              employeeId={employeeId}
              employeeName={employeeName}
              inputRef={inputRef}
              locations={locations}
              loading={isSubmitting || isSaving}
              onBarcodeChange={setBarcode}
              onClear={handleClear}
              onExport={handleExport}
              onLocationChange={handleAreaChange}
              onSave={handleSave}
              onSubmit={handleSubmit}
              saveDisabled={!isLoggedIn || isSubmitting || isSaving || stockInControlsLocked || records.length === 0}
              selectedLocation={selectedArea}
            />
            <StatCards records={sortedRecords} />
          </Box>
         
          <ScanDataTable
            actionsDisabled={stockInControlsLocked}
            locations={locations}
            onDelete={handleDelete}
            onSearchChange={setSearch}
            onUpdate={handleUpdate}
            records={sortedRecords}
            search={search}
            selectedArea={selectedArea}
          />
          <Dialog
            fullWidth
            maxWidth="xs"
            onClose={() => {
              setScanAlertMessage('')
              focusScanner()
            }}
            open={Boolean(scanAlertMessage)}
          >
            <DialogTitle>แจ้งเตือน</DialogTitle>
            <DialogContent>
              <Typography color="error" fontSize={15} sx={{ mt: 1 }}>
                {scanAlertMessage}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setScanAlertMessage('')
                  focusScanner()
                }}
                variant="contained"
              >
                ตกลง
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </Box>
  )
}
