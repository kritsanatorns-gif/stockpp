import dayjs from 'dayjs'
import { getStatusLabel } from './barcode'

export const exportScansToExcel = async (records) => {
  const XLSX = await import('xlsx')
  const rows = records.map((record, index) => ({
    ลำดับ: index + 1,
    'Work Order': record.barcode,
    'Employee ID': record.employeeId ?? '',
    'Product Id': record.productId ?? '',
    'Product Name': record.productName ?? '',
    Area: record.area ?? '',
    'Qty Full': record.qtyFull ?? '',
    Qty: record.qty ?? '',
    Error: record.error ?? '',
    'เวลา Scan': dayjs(record.scannedAt).format('YYYY-MM-DD HH:mm:ss'),
    Status: getStatusLabel(record.status),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Order Scans')

  const fileName = `work-order-scans-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

export const exportTableRowsToExcel = async ({ filePrefix, rows, sheetName }) => {
  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filePrefix}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`)
}

export const exportWorkbookToExcel = async ({ filePrefix, sheets }) => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ rows, sheetName }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows)

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  })

  XLSX.writeFile(workbook, `${filePrefix}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`)
}
