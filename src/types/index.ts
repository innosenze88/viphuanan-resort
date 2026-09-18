export type { UserRole, RoomStatus, AuditAction } from "@prisma/client";

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; reference?: string } };

export function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function apiError(
  code: string,
  message: string,
  reference?: string
): ApiResponse<never> {
  return { success: false, error: { code, message, reference } };
}
