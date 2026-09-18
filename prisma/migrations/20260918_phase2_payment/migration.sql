-- Phase 2: Payment
-- Run: npm run db:migrate

-- Enums
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'PROMPTPAY', 'PAYMENT_GATEWAY', 'OTA', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentPurpose" AS ENUM ('DEPOSIT', 'BALANCE', 'FULL', 'EXTRA_CHARGE');
CREATE TYPE "DepositStatus" AS ENUM ('EXPECTED', 'RECEIVED', 'APPLIED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');

-- Payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "payments_paymentReference_key" ON "payments"("paymentReference");
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- Deposits
CREATE TABLE "deposits" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'EXPECTED',
    "paymentId" TEXT,
    "appliedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "deposits_bookingId_key" ON "deposits"("bookingId");
CREATE INDEX "deposits_bookingId_idx" ON "deposits"("bookingId");

-- Payment Allocations
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_allocations_paymentId_idx" ON "payment_allocations"("paymentId");
CREATE INDEX "payment_allocations_bookingId_idx" ON "payment_allocations"("bookingId");

-- Receivables
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "receivables_bookingId_idx" ON "receivables"("bookingId");
CREATE INDEX "receivables_status_idx" ON "receivables"("status");

-- Refunds
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- Foreign Keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON UPDATE CASCADE;
