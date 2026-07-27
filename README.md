# StockPP Barcode Stock Checker

เว็บ React + Vite สำหรับยิงบาร์โค้ดเพื่อตรวจสอบสินค้า รองรับ USB barcode scanner ที่ส่งค่าเหมือน keyboard input
## Login Feature

# StockPP

ระบบจัดการสต็อกสินค้า (Stock Management System)

## Features

- Login
- Dashboard
- Barcode Scan
- Stock In
- Stock Out
- Report

## Technology

- React
- Vite
- Material UI
- JavaScript

## Run Project

```bash
npm install
npm run dev
```

## Author

Kritsanatorn

## Backend API

สร้างไฟล์ `.env` จาก `.env.example` แล้วตั้งค่า backend:

```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_SCAN_ENDPOINT=/api/stock/scan
VITE_API_TIMEOUT_MS=10000
VITE_USE_MOCK_API=false
```

ตอนยิงบาร์โค้ด frontend จะส่ง `POST` ไปที่ endpoint:

```json
{
  "barcode": "8850999012345",
  "employeeId": "8128",
  "scannedAt": "2026-06-04T06:00:00.000Z"
}
```

Response ที่รองรับ:

```json
{
  "message": "OK",
  "data": {
    "productId": "P-001",
    "productName": "Product name",
    "area": "FG-A01",
    "qty": 1,
    "error": "",
    "status": "success"
  }
}
```

ถ้า backend ยังไม่พร้อมและยังไม่ได้ตั้ง `VITE_API_BASE_URL` ระบบจะใช้ mock API ให้ทดสอบได้ก่อน

## Tech Stack

- React + Vite
- MUI (Material UI)
- react-data-table-component
- react-hot-toast
- xlsx
- lucide-react
- zustand
- dayjs

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

เปิดเว็บตาม URL ที่ Vite แสดง เช่น `http://localhost:5173`

## Build

```bash
npm run build
```

ไฟล์ production จะอยู่ใน `dist/`

## Deploy

ใช้ได้กับ Netlify, Vercel, Cloudflare Pages, GitHub Pages หรือ static server ทั่วไป

- Build command: `npm run build`
- Output directory: `dist`

สำหรับ server เอง ให้รัน `npm run build` แล้วนำไฟล์ใน `dist/` ไปวางบน Nginx, Apache หรือ IIS
