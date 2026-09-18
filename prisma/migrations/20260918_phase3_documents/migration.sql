-- Phase 3: Document AI/OCR
-- Run: npm run db:migrate

-- Enums
CREATE TYPE "DocumentType" AS ENUM ('PAYMENT_SLIP', 'INVOICE', 'RECEIPT', 'GUEST_ID', 'CONTRACT', 'OTHER');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "OcrStatus" AS ENUM ('NOT_STARTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Documents
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "bookingId" TEXT,
    "guestId" TEXT,
    "uploadedBy" TEXT,
    "ocrStatus" "OcrStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ocrRawText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrExtracted" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "documents_bookingId_idx" ON "documents"("bookingId");
CREATE INDEX "documents_guestId_idx" ON "documents"("guestId");
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- Foreign Keys
ALTER TABLE "documents" ADD CONSTRAINT "documents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON UPDATE CASCADE;
