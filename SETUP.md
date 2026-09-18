# Viphuanan Resort — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local or Docker)

## Quick Start

### 1. PostgreSQL (Docker, ง่ายที่สุด)
```bash
docker run --name viphuanan-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=viphuanan_resort -p 5432:5432 -d postgres:16
```

หรือถ้ามี PostgreSQL อยู่แล้ว สร้าง database:
```sql
CREATE DATABASE viphuanan_resort;
```

### 2. Environment
ไฟล์ `.env` ถูกสร้างให้แล้ว — แก้ `DATABASE_URL` ถ้า credentials ต่างออกไป

### 3. Database Migration + Seed
```bash
npm run db:migrate   # สร้าง tables
npm run db:seed      # สร้าง 15 ห้อง + default users
```

### 4. Run Dev Server
```bash
npm run dev
```

เปิด: http://localhost:3000

## Default Users
| Email | Password | Role |
|-------|----------|------|
| admin@viphuanan.com | admin1234 | OWNER |
| frontdesk@viphuanan.com | frontdesk1234 | FRONT_DESK |

**เปลี่ยน password ก่อน production!**

## Phase Status
- [x] Phase 0 — Foundation (เสร็จแล้ว)
- [ ] Phase 1 — Resort Core (Room Board, Guest, Booking, Stay, Check-in/out)
- [ ] Phase 2 — Payment
- [ ] Phase 3 — Document AI/OCR
- [ ] Phase 4 — Accounting
- [ ] Phase 5 — Registration (รร.3/4)
- [ ] Phase 6 — Dashboard
- [ ] Phase 7 — Integrations
- [ ] Phase 8 — Reports + Tax
