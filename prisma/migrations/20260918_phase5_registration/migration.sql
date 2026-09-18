-- Phase 5: Thai Hotel Registration รร.3/4/TM.30
-- Auto-created at check-in; RR3 for Thai guests, RR4+TM30 for foreign guests.

CREATE TYPE "RegistrationType" AS ENUM ('RR3', 'RR4', 'TM30');
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'OVERDUE', 'CANCELLED');

CREATE TABLE "registration_records" (
    "id"               TEXT NOT NULL,
    "bookingId"        TEXT NOT NULL,
    "stayId"           TEXT NOT NULL,
    "guestId"          TEXT NOT NULL,
    "registrationType" "RegistrationType" NOT NULL,
    "status"           "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "checkInDate"      TIMESTAMP(3) NOT NULL,
    "roomNumber"       TEXT NOT NULL,
    "guestName"        TEXT NOT NULL,
    "nationality"      TEXT,
    "idType"           TEXT,
    "idNumber"         TEXT,
    "dueAt"            TIMESTAMP(3) NOT NULL,
    "submittedBy"      TEXT,
    "submittedAt"      TIMESTAMP(3),
    "submissionRef"    TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_records_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "registration_records"
    ADD CONSTRAINT "registration_records_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_records"
    ADD CONSTRAINT "registration_records_stayId_fkey"
    FOREIGN KEY ("stayId") REFERENCES "stays"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registration_records"
    ADD CONSTRAINT "registration_records_guestId_fkey"
    FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "registration_records_status_idx"       ON "registration_records"("status");
CREATE INDEX "registration_records_bookingId_idx"    ON "registration_records"("bookingId");
CREATE INDEX "registration_records_guestId_idx"      ON "registration_records"("guestId");
CREATE INDEX "registration_records_dueAt_idx"        ON "registration_records"("dueAt");
CREATE INDEX "registration_records_checkInDate_idx"  ON "registration_records"("checkInDate");
