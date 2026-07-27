import { useState } from 'react'
import { AppBar, Box, Button, Chip, IconButton, Stack, TextField, Toolbar, Tooltip, Typography } from '@mui/material'
import toast from 'react-hot-toast'
import { LogIn, LogOut, Menu, Moon, PackageCheck, Sun } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function AppHeader({ darkMode, onOpenMenu, onToggleDarkMode }) {
  const [inputValue, setInputValue] = useState('')
  const { employee, employeeId, login, logout } = useAuthStore()
  const employeeName = employee?.name ?? employee?.Name ?? ''

  const handleLogin = async (event) => {
    event.preventDefault()

    const formValue = new FormData(event.currentTarget).get('employeeId')
    const success = await login(String(formValue ?? inputValue).trim())
    if (!success) {
      toast.error('ไม่พบรหัสพนักงานในระบบ')
      return
    }

    setInputValue('')
    toast.success('ล็อกอินเรียบร้อย')
  }

  const handleLogout = async () => {
    await logout()
    toast.success('ออกจากระบบแล้ว')
  }

  return (
    <AppBar color="inherit" elevation={0} position="sticky" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 2, minHeight: { xs: 64, md: 72 } }}>
        <IconButton aria-label="open menu" onClick={onOpenMenu} sx={{ ml: -1 }}>
          <Menu size={22} />
        </IconButton>

        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'primary.main',
            borderRadius: 1.5,
            color: 'primary.contrastText',
            display: 'flex',
            height: 42,
            justifyContent: 'center',
            width: 42,
          }}
        >
          <PackageCheck size={24} />
        </Box>

        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" fontSize={{ xs: 20, md: 24 }} fontWeight={700} noWrap>
            Stock PP
          </Typography>
          <Typography color="text.secondary" fontSize={14} noWrap>
            ระบบ Stock เข้าด้วยการสแกน Work Order
          </Typography>
        </Stack>

        {employeeId ? (
          <Stack alignItems="center" direction="row" gap={1} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Chip
              color="success"
              label={employeeName ? `${employeeName} (${employeeId})` : `พนักงาน: ${employeeId}`}
              size="small"
            />
            <Button color="error" onClick={handleLogout} startIcon={<LogOut size={17} />} variant="outlined">
              Logout
            </Button>
          </Stack>
        ) : (
          <Stack
            component="form"
            direction="row"
            gap={1}
            onSubmit={handleLogin}
            sx={{ alignItems: 'center', display: { xs: 'none', sm: 'flex' } }}
          >
            <TextField
              autoComplete="off"
              label="รหัสพนักงาน"
              name="employeeId"
              onChange={(event) => setInputValue(event.target.value)}
              size="small"
              sx={{ width: 160 }}
              value={inputValue}
            />
            <Button startIcon={<LogIn size={17} />} type="submit" variant="contained">
              Login
            </Button>
          </Stack>
        )}

        <Tooltip title={darkMode ? 'โหมดสว่าง' : 'โหมดมืด'}>
          <IconButton aria-label="toggle dark mode" onClick={onToggleDarkMode}>
            {darkMode ? <Sun size={21} /> : <Moon size={21} />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  )
}
