export const createScanSavePayload = ({ employeeId, records, transactionType }) => ({
  employeeId,
  records: records.map((record) => ({
    area: record.area ?? '',
    error: record.error ?? '',
    productId: record.productId ?? '',
    productName: record.productName ?? '',
    qty: record.qty ?? '',
    qtyFull: record.qtyFull ?? '',
    status: record.status ?? '',
    workOrder: record.workId ?? record.barcode ?? '',
  })),
  savedAt: new Date().toISOString(),
  transactionType,
})
