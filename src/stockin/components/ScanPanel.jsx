import { Alert, Autocomplete, Box, Button, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { FileDown, Save, Trash2 } from 'lucide-react'

const numericBarcodePattern = /^\d*$/

const getLocationText = (option) => {
  if (typeof option === 'string') return option

  return (
    option?.name ??
    option?.Name ??
    option?.location ??
    option?.Location ??
    option?.locationName ??
    option?.LocationName ??
    option?.area ??
    option?.Area ??
    ''
  )
}

export function ScanPanel({
  barcode,
  controlsLocked = false,
  disabled,
  employeeId,
  employeeName = '',
  inputRef,
  locations = [],
  loading = false,
  onBarcodeChange,
  onClear,
  onExport,
  onLocationChange,
  onSave,
  onSubmit,
  saveDisabled = false,
  selectedLocation = '',
}) {
  const [barcodeError, setBarcodeError] = useState('')
  const [locationInput, setLocationInput] = useState(selectedLocation)
  const locationRequired = !disabled && !selectedLocation
  const scanDisabled = disabled || controlsLocked || loading || locationRequired

  const selectedLocationOption =
    locations.find((item) => getLocationText(item) === selectedLocation) ?? null

  const filteredLocations = useMemo(() => {
    const keyword = locationInput.trim().toLowerCase()

    if (!keyword) return locations

    return locations.filter((location) =>
      getLocationText(location)
        .toLowerCase()
        .includes(keyword)
    )
  }, [locationInput, locations])

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocationInput(selectedLocation)
    }, 0)

    return () => clearTimeout(timer)
  }, [selectedLocation])

  const handleBarcodeChange = (event) => {
    const nextBarcode = event.target.value

    if (!numericBarcodePattern.test(nextBarcode)) {
      setBarcodeError('กรุณาสแกนหรือพิมพ์เฉพาะตัวเลขเท่านั้น')
      return
    }

    setBarcodeError('')
    onBarcodeChange(nextBarcode)
  }

  const handleBarcodeKeyDown = (event) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    if (!scanDisabled) onSubmit?.(event, event.currentTarget.value)
  }

  const handleLocationChange = (_, newValue) => {
    const nextLocation = getLocationText(newValue)

    onLocationChange?.(newValue)
    setLocationInput(nextLocation)
  }

  return (
    <Paper component="section" variant="outlined" sx={{ borderRadius: 2, height: '100%', p: { xs: 2, md: 2.5 }, width: '100%' }}>
      <Stack spacing={2} sx={{ height: '100%' }}>
        <Stack alignItems={{ xs: 'flex-start', sm: 'center' }} direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Stack alignItems="center" direction="row" gap={1}>
            <Typography component="h2" fontSize={18} fontWeight={700}>
              ช่องยิง Work Order
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Ctrl/⌘ + K" />
        </Stack>

        {disabled ? (
          <Alert severity="warning">กรุณาล็อกอินด้วยรหัสพนักงานก่อนยิง Work Order</Alert>
        ) : locationRequired ? (
          <Alert severity="warning">กรุณาเลือกพื้นที่ก่อนยิง Work Order</Alert>
        ) : loading ? (
          <Alert severity="info">กำลังส่งข้อมูลไป backend และรอผลตอบกลับ...</Alert>
        ) : (
          <Alert severity="info">กำลังทำงานโดย {employeeName || employeeId}</Alert>
        )}

        <Stack
  component="form"
  direction={{ xs: 'column', md: 'row' }}
  gap={1.5}
  onSubmit={onSubmit}
  sx={{
    alignItems: 'stretch',
  }}
>
  {/* LOCATION */}
  <Autocomplete
    autoHighlight
    clearOnBlur={false}
    disabled={disabled || controlsLocked || loading}
    filterOptions={(options) => options}
    getOptionLabel={getLocationText}
    inputValue={locationInput}
    isOptionEqualToValue={(option, value) =>
      getLocationText(option) ===
      getLocationText(value)
    }
    noOptionsText="ไม่พบพื้นที่"
    onChange={handleLocationChange}
    onInputChange={(_, newValue) =>
      setLocationInput(newValue)
    }
    openOnFocus
    options={filteredLocations}
    value={selectedLocationOption}
    sx={{
      flex: {
        xs: '1 1 auto',
        md: '0 1 clamp(260px, 24vw, 420px)',
      },
      minWidth: {
        xs: '100%',
        md: 260,
      },

      '& .MuiInputBase-root': {
        height: 40,
      },
    }}
    renderInput={(params) => (
      <TextField
        {...params}
        label="เลือกพื้นที่"
        placeholder="พิมพ์เพื่อค้นหาพื้นที่"
        required
        size="small"
      />
    )}
  />

  {/* BARCODE */}
  <TextField
    fullWidth
    autoComplete="off"
    autoFocus
    disabled={scanDisabled}
    error={Boolean(barcodeError)}
    helperText={barcodeError}
    inputRef={inputRef}
            label="สแกนหรือพิมพ์ Work Order แล้วกด Enter"
            name="barcode"
            onChange={handleBarcodeChange}
            onKeyDown={handleBarcodeKeyDown}
            size="small"
            value={barcode}
    sx={{
      '& .MuiInputBase-root': {
        height: 40,
      },
    }}
    slotProps={{
      htmlInput: {
        inputMode: 'numeric',
        pattern: '[0-9]*',
      },

      input: {
        sx: {
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 0,
        },
      },
    }}
  />

  {/* SAVE BUTTON */}
  <Button
    disabled={saveDisabled || controlsLocked}
    onClick={onSave}
    size="large"
    startIcon={<Save size={18} />}
    type="button"
    variant="contained"
    sx={{
      height: 40,
      minWidth: 120,
      whiteSpace: 'nowrap',
    }}
  >
    บันทึก
  </Button>
</Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
          <Button disabled={loading} onClick={onExport} startIcon={<FileDown size={18} />} variant="outlined">
            Export Excel
          </Button>
          <Button color="error" disabled={loading} onClick={onClear} startIcon={<Trash2 size={18} />} variant="outlined">
            Clear All
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
