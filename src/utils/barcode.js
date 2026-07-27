export const normalizeBarcode = (value) => value.trim().replace(/\s+/g, '')

const createClientId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return `${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export const createScanRecord = (barcode, status, employeeId = '', backendData = {}) => ({
  id: `${Date.now()}-${createClientId()}`,
  stockInId: backendData.stockInId ?? null,
  barcode,
  employeeId,
  workId: backendData.workId ?? barcode,
  area: backendData.area ?? '',
  error: backendData.error ?? '',
  locationId: backendData.locationId ?? null,
  locationName: backendData.locationName ?? '',
  productId: backendData.productId ?? '',
  productName: backendData.productName ?? '',
  qtyFull: backendData.qtyFull ?? '',
  qtyRemain: backendData.qtyRemain ?? '',
  qty: backendData.qty ?? '',
  scannedAt: new Date().toISOString(),
  status,
})

export const getStatusLabel = (status) => {
  if (status === 'duplicate') return 'ซ้ำ'
  if (status === 'failed') return 'ผิดพลาด'
  return 'สำเร็จ'
}
