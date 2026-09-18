-- Phase 0 + Phase 1: Foundation + Resort Core
-- Run: npm run db:migrate

-- Enums
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTING', 'HOUSEKEEPING');
CREATE TYPE "RoomStatus" AS ENUM ('VACANT', 'RESERVED', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTED', 'OUT_OF_ORDER');
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOGIN', 'LOGOUT', 'VERIFY', 'REJECT', 'APPROVE', 'POST', 'ADJUST', 'REFUND', 'EXPORT', 'CHECKIN', 'CHECKOUT');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'NO_SHOW', 'CHECKED_IN', 'CHECKED_OUT');
CREATE TYPE "BookingSource" AS ENUM ('DIRECT', 'WALK_IN', 'PHONE', 'WEBSITE', 'BOOKING_COM', 'AGODA', 'OTHER_OTA', 'OTHER');
CREATE TYPE "StayStatus" AS ENUM ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED');
CREATE TYPE "IdType" AS ENUM ('THAI_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER');

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FRONT_DESK',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Sessions
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- Room Types
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- Rooms
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "roomTypeId" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "RoomStatus" NOT NULL DEFAULT 'VACANT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rooms_roomNumber_key" ON "rooms"("roomNumber");

-- Guests
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'UNSPECIFIED',
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idType" "IdType",
    "idNumber" TEXT,
    "idIssuer" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "guests_firstName_lastName_idx" ON "guests"("firstName", "lastName");
CREATE INDEX "guests_idNumber_idx" ON "guests"("idNumber");
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- Bookings
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "checkInDate" DATE NOT NULL,
    "checkOutDate" DATE NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "roomRate" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "bookings_bookingReference_key" ON "bookings"("bookingReference");
CREATE INDEX "bookings_guestId_idx" ON "bookings"("guestId");
CREATE INDEX "bookings_roomId_idx" ON "bookings"("roomId");
CREATE INDEX "bookings_checkInDate_idx" ON "bookings"("checkInDate");

-- Stays
CREATE TABLE "stays" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "status" "StayStatus" NOT NULL DEFAULT 'EXPECTED',
    "notes" TEXT,
    "checkedInBy" TEXT,
    "checkedOutBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stays_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stays_bookingId_idx" ON "stays"("bookingId");
CREATE INDEX "stays_guestId_idx" ON "stays"("guestId");
CREATE INDEX "stays_roomId_idx" ON "stays"("roomId");
CREATE INDEX "stays_status_idx" ON "stays"("status");

-- System Settings
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Foreign Keys
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON UPDATE CASCADE;
ALTER TABLE "stays" ADD CONSTRAINT "stays_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON UPDATE CASCADE;
ALTER TABLE "stays" ADD CONSTRAINT "stays_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON UPDATE CASCADE;
ALTER TABLE "stays" ADD CONSTRAINT "stays_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE;
