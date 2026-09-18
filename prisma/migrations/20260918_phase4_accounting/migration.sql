-- Phase 4: Accounting
-- Run: npm run db:migrate

-- Enums
CREATE TYPE "AccountCategory" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'APPROVED', 'POSTED');
CREATE TYPE "JournalType" AS ENUM ('REVENUE', 'EXPENSE', 'ADJUSTMENT', 'REVERSAL', 'CORRECTION', 'OTHER');
CREATE TYPE "ExpenseCategory" AS ENUM ('UTILITIES', 'MAINTENANCE', 'SUPPLIES', 'STAFFING', 'MARKETING', 'DEPRECIATION', 'OTHER');

-- Chart of Accounts
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AccountCategory" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chart_of_accounts_code_key" ON "chart_of_accounts"("code");
CREATE INDEX "chart_of_accounts_category_idx" ON "chart_of_accounts"("category");

-- Journal Entries
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "type" "JournalType" NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "entryDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "bookingId" TEXT,
    "paymentId" TEXT,
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "postedAt" TIMESTAMP(3),
    "reversalOf" TEXT,
    "adjustmentOf" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "journal_entries_entryNumber_key" ON "journal_entries"("entryNumber");
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");
CREATE INDEX "journal_entries_entryDate_idx" ON "journal_entries"("entryDate");
CREATE INDEX "journal_entries_bookingId_idx" ON "journal_entries"("bookingId");

-- Journal Lines
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "debitAccountId" TEXT,
    "creditAccountId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "journal_lines_journalEntryId_idx" ON "journal_lines"("journalEntryId");

-- Expenses
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expenseDate" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT,
    "receiptRef" TEXT,
    "journalEntryId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expenses_expenseDate_idx" ON "expenses"("expenseDate");
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- Foreign Keys
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "chart_of_accounts"("id") ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "chart_of_accounts"("id") ON UPDATE CASCADE;

-- Seed: Default Chart of Accounts
INSERT INTO "chart_of_accounts" ("id","code","name","category","description","updatedAt") VALUES
  ('acc-1001','1001','เงินสด','ASSET','Cash on hand','NOW()'),
  ('acc-1002','1002','เงินฝากธนาคาร','ASSET','Bank account','NOW()'),
  ('acc-1101','1101','ลูกหนี้การค้า','ASSET','Accounts receivable','NOW()'),
  ('acc-2001','2001','เจ้าหนี้การค้า','LIABILITY','Accounts payable','NOW()'),
  ('acc-2101','2101','ภาษีมูลค่าเพิ่มค้างจ่าย','LIABILITY','VAT payable','NOW()'),
  ('acc-3001','3001','ทุน','EQUITY','Owner equity','NOW()'),
  ('acc-4001','4001','รายได้ค่าห้องพัก','REVENUE','Room revenue','NOW()'),
  ('acc-4002','4002','รายได้อื่นๆ','REVENUE','Other revenue','NOW()'),
  ('acc-5001','5001','ค่าสาธารณูปโภค','EXPENSE','Utilities expense','NOW()'),
  ('acc-5002','5002','ค่าซ่อมบำรุง','EXPENSE','Maintenance expense','NOW()'),
  ('acc-5003','5003','ค่าใช้จ่ายพนักงาน','EXPENSE','Staff expense','NOW()'),
  ('acc-5004','5004','ค่าวัสดุสิ้นเปลือง','EXPENSE','Supplies expense','NOW()'),
  ('acc-5005','5005','ค่าการตลาด','EXPENSE','Marketing expense','NOW()'),
  ('acc-5099','5099','ค่าใช้จ่ายอื่นๆ','EXPENSE','Other expense','NOW()');
