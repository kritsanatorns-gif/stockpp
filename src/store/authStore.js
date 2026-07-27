import { create } from 'zustand'
import { loginEmployee } from '../services/stockApi'

localStorage.removeItem('stockpp-auth')

const normalizeEmployeeResponse = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

const isValidEmployee = (employee) => {
  if (!employee) return false
  if (employee.status === false || employee.Status === false) return false
  if (employee.error || employee.Error) return false
  return Object.keys(employee).length > 0
}

export const useAuthStore = create(
  (set) => ({
    employeeId: '',
    employee: null,
    login: async (employeeId) => {
      const normalizedEmployeeId = employeeId.trim()
      if (!normalizedEmployeeId) return false

      let employee = null

      try {
        employee = normalizeEmployeeResponse(await loginEmployee(normalizedEmployeeId))
      } catch (error) {
        console.error(error)
        return false
      }

      if (!isValidEmployee(employee)) return false

      set({
        employee,
        employeeId:
          employee.code ??
          employee.Code ??
          employee.userId ??
          employee.UserId ??
          employee.employeeId ??
          employee.EmployeeId ??
          employee.id ??
          employee.Id ??
          normalizedEmployeeId,
      })
      return true
    },
    logout: async () => {
      set({ employee: null, employeeId: '' })
    },
  }),
)
