import { useMemo, useState } from 'react'
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { AppHeader } from './components/AppHeader'
import { AppSidebar, collapsedSidebarWidth, expandedSidebarWidth } from './components/AppSidebar'
import { BarcodeStockCheckerin } from './stockin/page/BarcodeStockCheckerin'
import { StockPPInShowData } from './stockin/page/StockPPInShowData'
import { StockPPOutShowData } from './stockout/page/StockPPOutShowData'
import { StockSummary } from './stock/page/StockSummary'
import { StockReport } from './stockreport/page/StockReport'

import { Routes, Route } from 'react-router-dom'
const getInitialDarkMode = () => {
  const saved = localStorage.getItem('stockpp-dark-mode')
  if (saved) return saved === 'true'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}
function App() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const theme = useMemo( () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#2563eb',
          },
          success: {
            main: '#2e7d32',
          },
          error: {
            main: '#d32f2f',
          },
          background: {
            default: darkMode ? '#101214' : '#f4f7fe',
            paper: darkMode ? '#181b1f' : '#ffffff',
          },
        },
        shape: {
          borderRadius: 8,
        },
        typography: {
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          button: {
            fontWeight: 700,
            textTransform: 'none',
          },
        },
      }),
    [darkMode],
  )

  const handleToggleDarkMode = () => {
    setDarkMode((current) => {
      const next = !current
      localStorage.setItem('stockpp-dark-mode', String(next))
      return next
    })
  }

  const handleMenuClick = () => {
    if (window.matchMedia('(min-width: 900px)').matches) {
      setSidebarCollapsed((current) => !current)
      return
    }

    setMobileMenuOpen(true)
  }

  const currentSidebarWidth = sidebarCollapsed ? collapsedSidebarWidth : expandedSidebarWidth

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100svh' }}>
        <AppSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            minWidth: 0,
            transition: (theme) => theme.transitions.create('width'),
            width: { md: `calc(100% - ${currentSidebarWidth}px)` },
          }}
        >
          <AppHeader
            darkMode={darkMode}
            onOpenMenu={handleMenuClick}
            onToggleDarkMode={handleToggleDarkMode}
          />
         
            <Routes>
              <Route path="/" element={<StockSummary />} />
              <Route path= "/StockPPInShowData" element={<StockPPInShowData />} />
              <Route path="/BarcodeStockCheckerin" element={<BarcodeStockCheckerin />} />
              <Route path="/StockPPOutShowData" element={<StockPPOutShowData />} />
              <Route path="/stock-summary" element={<StockSummary />} />
              <Route path="/stock-report" element={<StockReport />} />
        
            </Routes>
         
        </Box>
      </Box>
      <Toaster
        containerStyle={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        position="top-center"
        toastOptions={{
          duration: 2200,
          style: {
            fontSize: 14,
          },
        }}
      />
    </ThemeProvider>
  )
}

export default App
