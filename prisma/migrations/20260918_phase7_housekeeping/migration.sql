-- Phase 7: Housekeeping & Maintenance

-- Enums
CREATE TYPE "HousekeepingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'INSPECTED', 'CANCELLED');
CREATE TYPE "HousekeepingPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "HousekeepingType" AS ENUM ('CHECKOUT_CLEAN', 'DAILY_SERVICE', 'DEEP_CLEAN', 'INSPECTION', 'OTHER');
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Housekeeping tasks
CREATE TABLE "housekeeping_tasks" (
    "id"          TEXT NOT NULL,
    "roomId"      TEXT NOT NULL,
    "taskType"    "HousekeepingType" NOT NULL DEFAULT 'CHECKOUT_CLEAN',
    "status"      "HousekeepingStatus" NOT NULL DEFAULT 'PENDING',
    "priority"    "HousekeepingPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo"  TEXT,
    "notes"       TEXT,
    "startedAt"   TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inspectedBy" TEXT,
    "inspectedAt" TIMESTAMP(3),
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housekeeping_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "housekeeping_tasks_roomId_idx" ON "housekeeping_tasks"("roomId");
CREATE INDEX "housekeeping_tasks_status_idx" ON "housekeeping_tasks"("status");
CREATE INDEX "housekeeping_tasks_createdAt_idx" ON "housekeeping_tasks"("createdAt");

ALTER TABLE "housekeeping_tasks"
    ADD CONSTRAINT "housekeeping_tasks_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Maintenance requests
CREATE TABLE "maintenance_requests" (
    "id"          TEXT NOT NULL,
    "roomId"      TEXT,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status"      "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "priority"    "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
    "assignedTo"  TEXT,
    "resolvedBy"  TEXT,
    "resolvedAt"  TIMESTAMP(3),
    "notes"       TEXT,
    "createdBy"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_requests_roomId_idx" ON "maintenance_requests"("roomId");
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");
CREATE INDEX "maintenance_requests_priority_idx" ON "maintenance_requests"("priority");

ALTER TABLE "maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
