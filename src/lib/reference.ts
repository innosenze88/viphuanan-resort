import { db } from "@/lib/db";

async function getSetting(key: string, fallback: string): Promise<string> {
  const s = await db.systemSetting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}

function pad(n: number, len = 5): string {
  return String(n).padStart(len, "0");
}

export async function nextBookingReference(): Promise<string> {
  const prefix = await getSetting("booking.prefix", "BK");
  const year = new Date().getFullYear();
  const count = await db.booking.count();
  return `${prefix}-${year}-${pad(count + 1)}`;
}
