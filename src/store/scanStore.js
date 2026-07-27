import { create } from 'zustand'
import { createScanRecord, normalizeBarcode } from '../utils/barcode'

const createScanStore = () =>
  create((set, get) => ({
    records: [],
    addScan: async (rawBarcode, employeeId, backendData = {}) => {
      const barcode = normalizeBarcode(rawBarcode)
      if (!barcode) return null

      const isDuplicate = get().records.some((record) => record.barcode === barcode)
      const status = backendData.status || (isDuplicate ? 'duplicate' : 'success')
      const record = createScanRecord(barcode, status, employeeId, backendData)

      set((state) => ({
        records: [record, ...state.records],
      }))

      return record
    },
    removeScan: async (id) => {
      set((state) => ({
        records: state.records.filter((record) => record.id !== id),
      }))
    },
    updateScan: async (id, updates = {}) => {
      set((state) => ({
        records: state.records.map((record) =>
          record.id === id
            ? {
                ...record,
                ...updates,
              }
            : record,
        ),
      }))
    },
    clearScans: async () => {
      set({ records: [] })
    },
  }))

export const useStockInScanStore = createScanStore()
export const useScanStore = useStockInScanStore
