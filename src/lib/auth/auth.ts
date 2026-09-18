import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.active) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// Role-based permission check
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: ["*"],
  MANAGER: [
    "rooms.*", "guests.*", "bookings.*", "stays.*",
    "payments.*", "documents.*", "accounting.read",
    "reports.*", "housekeeping.*", "maintenance.*",
    "settings.read",
  ],
  FRONT_DESK: [
    "rooms.read", "guests.*", "bookings.*", "stays.*",
    "payments.create", "payments.read",
    "documents.upload", "documents.read",
    "housekeeping.read",
  ],
  ACCOUNTING: [
    "documents.*", "payments.*", "accounting.*",
    "reports.*", "rooms.read", "guests.read", "bookings.read",
  ],
  HOUSEKEEPING: [
    "rooms.read", "rooms.status", "housekeeping.*", "maintenance.create",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;

  const [module, action] = permission.split(".");
  if (perms.includes(`${module}.*`)) return true;
  if (action !== "*" && perms.includes(`${module}.read`) && action === "read") return true;

  return false;
}
