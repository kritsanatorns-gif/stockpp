import {Box,Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography,
} from '@mui/material'
import {ClipboardList,FileSpreadsheet,PackageCheck,QrCode,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
export const expandedSidebarWidth = 260
export const collapsedSidebarWidth = 68

const sections = [
  {
    title: 'REPORT',
    items: [
      { id: 'stock-summary', label: 'Stock Summary', icon: ClipboardList, activeIds: ['', 'stock-summary'] },
      { id: 'StockPPInShowData', label: 'Stock In', icon: QrCode, activeIds: ['StockPPInShowData', 'BarcodeStockCheckerin'] },
      { id: 'StockPPOutShowData', label: 'Stock Out', icon: QrCode },
      { id: 'stock-report', label: 'Stock Report', icon: FileSpreadsheet },
    ],
  },

]

function SidebarContent({ collapsed = false, onNavigate }) {
  const location = useLocation()
  const navigate = useNavigate()

  const activePath = location.pathname.replace(/^\/+/, '')

  return (
    <Box sx={{ height: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
      <Stack
        direction="row"
        gap={1.25}
        sx={{
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2,
          py: 2,
        }}
      >
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'primary.main',
            borderRadius: 1.5,
            color: 'primary.contrastText',
            display: 'flex',
            height: 40,
            justifyContent: 'center',
            width: 40,
          }}
        >
          <PackageCheck size={23} />
        </Box>
        <Box sx={{ display: collapsed ? 'none' : 'block', minWidth: 0 }}>
          <Typography fontSize={16} fontWeight={800} noWrap>
            StockPP
          </Typography>
          <Typography color="text.secondary" fontSize={12} noWrap>
            ระบบ Stock เข้าด้วยการสแกนบาร์โค้ด
          </Typography>
        </Box>
      </Stack>

      <Divider />

      {sections.map((section) => (
        <Box key={section.title} sx={{ px: collapsed ? 0.75 : 1.25, py: 1.5 }}>
          <Typography
            color="text.secondary"
            fontSize={11}
            fontWeight={800}
            sx={{ display: collapsed ? 'none' : 'block', px: 1.25, pb: 0.75 }}
          >
            {section.title}
          </Typography>
          <List disablePadding>
            {section.items.map(({ activeIds, icon: Icon, id, label }) => {
              const active = (activeIds ?? [id]).includes(activePath)

              return (
              <ListItemButton
                key={id}
                onClick={() => {
                  navigate(`/${id}`)
                  onNavigate?.()
                }}
                selected={active}
                sx={{
                  borderRadius: 1.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  mb: 0.25,
                  minHeight: 42,
                  px: collapsed ? 0 : 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
                title={collapsed ? label : ''}
              >
                <ListItemIcon sx={{ color: active ? 'inherit' : 'text.secondary', justifyContent: 'center', minWidth: collapsed ? 0 : 36 }}>
                  <Icon size={19} />
                </ListItemIcon>
                {!collapsed && <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: active ? 800 : 600,
                    noWrap: true,
                  }}
                />}
              </ListItemButton>
              )
            })}
          </List>
        </Box>
      ))}
    </Box>
  )
}

export function AppSidebar({ collapsed, mobileOpen, onClose }) {
  const desktopWidth = collapsed ? collapsedSidebarWidth : expandedSidebarWidth

  return (
    <>
      <Drawer
        ModalProps={{ keepMounted: true }}
        onClose={onClose}
        open={mobileOpen}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: expandedSidebarWidth,
          },
        }}
        variant="temporary"
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>

      <Drawer
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width'),
          width: desktopWidth,
          '& .MuiDrawer-paper': {
            borderRight: 1,
            borderColor: 'divider',
            boxSizing: 'border-box',
            transition: (theme) => theme.transitions.create('width'),
            width: desktopWidth,
          },
        }}
        variant="permanent"
      >
        <SidebarContent collapsed={collapsed} onNavigate={onClose} />
      </Drawer>
    </>
  )
}
