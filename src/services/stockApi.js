
import axios from 'axios'

// ---------------- CONFIG ----------------

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  'http://192.168.0.13:93/Api' //จริง
 // 'http://192.168.0.13:94/Api'  ///ทดสอบ
const SCAN_ENDPOINT =
  import.meta.env.VITE_SCAN_ENDPOINT ??
  '/stock/scan'

// ---------------- AXIOS INSTANCE ----------------

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(
    import.meta.env.VITE_API_TIMEOUT_MS ?? 10000
  ),
})

// ---------------- TOKEN ----------------

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`
  }

  return config
})

// ---------------- NORMALIZE RESPONSE ----------------

const normalizeScanResponse = (
  payload
) => {
  const data =
    payload?.data ?? payload ?? {}

  return {
    area:
      data.area ??
      data.Area ??
      '',

    error:
      data.error ??
      data.Error ??
      '',

    message:
      data.message ??
      data.Message ??
      payload?.message ??
      '',

    productId:
      data.productId ??
      data.ProductId ??
      data.product_id ??
      '',

    productName:
      data.productName ??
      data.ProductName ??
      data.product_name ??
      '',

    qty:
      data.qty ??
      data.Qty ??
      data.quantity ??
      '',

    status:
      data.status ??
      data.Status ??
      'success',
  }
}

// ---------------- LOCATION ---------------- 
export const getStockLocations = async () => { const response = await api.get( '/Stock_PP/Get_StockPPIn_DataLocation' )
   return response.data } 


   // ---------------- CHECK WO ---------------- 
  export const checkStockWO = async (wo) => { const response = await api.get( `/Stock_PP/Get_StockPPIn_CheckWo?wo=${encodeURIComponent(wo)}` ) 
  return response.data }

  // ---------------- CHECK WORK ----------------
  export const checkStockWork = async (work) => { const response = await api.get( `/Stock_PP/Get_StockPPIn_CheckWork?work=${encodeURIComponent(work)}` )
  return response.data }

export const checkStockPPOutWO = async (wo) => {
  const response = await api.get(`/Stock_PP/Get_StockPPOut_CheckWo?wo=${encodeURIComponent(wo)}`)
  return response.data
}

  

// ---------------- LOGIN EMPLOYEE ----------------

export const loginEmployee =
  async (userId) => {
    const response = await api.get(
      `/Stock_PP/Get_Employee?UserId=${userId}`
    )

    return response.data
  }


export const getStockPPInShowData = async () => { 
  const response = await api.get( '/Stock_PP/Get_StockPPIn_ShowData' ) 
  return response.data }

export const postStockPPInAddData = async (payload) => {
  const body = Array.isArray(payload) ? payload : [payload]
  const response = await api.post('/Stock_PP/Post_StockPPIn_AddData', body)
  return response.data
}

export const postStockPPOutAddData = async (payload) => {
  const body = Array.isArray(payload) ? payload : [payload]
  const response = await api.post('/Stock_PP/Post_StockPPOut_AddData', body)
  return response.data
}

export const getStockPPOutShowData = async () => { 
  const response = await api.get( '/Stock_PP/Get_StockPPOut_ShowData' ) 
  return response.data }

export const getStockOpenShowData = async () => {
  const response = await api.get('/Stock_PP/Get_StockOpen_ShowData')
  return response.data
}

export const getStockSummaryShowData = async ({ month, year }) => {
  const response = await api.get(`/Stock_PP/Get_StockSummary_ShowDataMonth?y=${encodeURIComponent(year)}&m=${encodeURIComponent(month)}`)
  return response.data
}

export const getStockSummaryShowDataWo = async (wo) => {
  const response = await api.get(`/Stock_PP/Get_StockSummary_ShowDataWo?wo=${encodeURIComponent(wo)}`)
  return response.data
}




// ---------------- SCAN API ----------------

export const submitBarcodeScan =
  async ({
    barcode,
    employeeId,
  }) => {
    try {
      const response =
        await api.post(
          SCAN_ENDPOINT,
          {
            barcode,
            employeeId,
            scannedAt:
              new Date().toISOString(),
          }
        )

      return normalizeScanResponse(
        response.data
      )
    } catch (error) {
      console.error(
        'submitBarcodeScan error:',
        error
      )

      if (
        error.code ===
        'ECONNABORTED'
      ) {
        throw new Error(
          'Backend timeout',
          { cause: error }
        )
      }

      throw new Error(
        error.response?.data
          ?.message ||
          error.message ||
          'API Error',
        { cause: error }
      )
    }
  }

// ---------------- LOGIN ----------------

export const login = (data) => {
  return api.post(
    '/auth/login',
    data
  )
}

export default api
