import { useState } from 'react'
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material'
import { LogIn, LogOut, UserRound } from 'lucide-react'

export function LoginPanel({ employeeId, employeeName = '', onLogin, onLogout }) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formValue = new FormData(event.currentTarget).get('employeeId')
    const success = await onLogin(String(formValue ?? inputValue).trim())
    if (success) setInputValue('')
  }

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{
        borderRadius: 2,
        height: '100%',
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack alignItems="center" direction="row" gap={1}>
          <UserRound size={23} />
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" fontSize={18} fontWeight={700} noWrap>
              รหัสพนักงาน
            </Typography>
            <Typography color="text.secondary" fontSize={13} noWrap>
              ล็อกอินก่อนยิงบาร์โค้ด
            </Typography>
          </Box>
        </Stack>

        {employeeId ? (
          <Stack spacing={1.25} sx={{ flex: 1, justifyContent: 'center' }}>
            <Chip
              color="success"
              label={employeeName ? `${employeeName} (${employeeId})` : `พนักงาน: ${employeeId}`}
              sx={{ alignSelf: 'flex-start' }}
            />
            <Button color="error" fullWidth onClick={onLogout} startIcon={<LogOut size={18} />} variant="outlined">
              Logout
            </Button>
          </Stack>
        ) : (
          <Stack component="form" spacing={1.25} sx={{ flex: 1, justifyContent: 'center' }} onSubmit={handleSubmit}>
            <TextField
              autoComplete="off"
              fullWidth
              label="รหัสพนักงาน"
              name="employeeId"
              onChange={(event) => setInputValue(event.target.value)}
            
              value={inputValue}
            />
            <Button fullWidth size="large" startIcon={<LogIn size={18} />} type="submit" variant="contained">
              Login
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
