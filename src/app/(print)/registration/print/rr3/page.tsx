import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/registration/PrintButton";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "ทะเบียนรับรองผู้พัก รร.3" };

export default async function PrintRR3Page(
  props: PageProps<"/registration/print/rr3">
) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { date } = await props.searchParams;
  const targetDate = typeof date === "string" ? new Date(date) : new Date();
  const dateStr = targetDate.toISOString().slice(0, 10);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const records = await db.registrationRecord.findMany({
    where: {
      registrationType: "RR3",
      checkInDate: { gte: new Date(dateStr), lt: nextDate },
    },
    orderBy: { checkInDate: "asc" },
    include: {
      guest: {
        select: {
          dateOfBirth: true,
          address: true,
          occupation: true,
          phone: true,
        },
      },
      booking: { select: { checkInDate: true, checkOutDate: true } },
    },
  });

  const thaiDate = targetDate.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const BLANK_ROWS = Math.max(0, 10 - records.length);

  return (
    <>
      <style>{`
        body { font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', sans-serif; }
        @page { size: A4 landscape; margin: 1cm; }
        @media print { .no-print { display: none !important; } body { padding: 0; } }
        .print-page { width: 100%; max-width: 270mm; margin: 0 auto; padding: 12px; background: white; }
        .print-header { text-align: center; margin-bottom: 14px; }
        .print-header h1 { font-size: 20px; font-weight: bold; }
        .print-header h2 { font-size: 16px; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        .print-table th { background: #f0f0f0; font-weight: bold; text-align: center; }
        .print-table tr:nth-child(even) td { background: #fafafa; }
        .print-footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; }
        .sig-box { text-align: center; width: 200px; }
        .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; }
        .print-btn { display: block; margin: 16px auto; background: #2563eb; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; }
      `}</style>

      <div className="print-page">
        <div className="print-header">
          <h1>ทะเบียนรับรองผู้พัก</h1>
          <h2>(แบบ รร.3)</h2>
          <div style={{ fontSize: 15, marginTop: 4 }}>โรงแรม / รีสอร์ท วิภวนา รีสอร์ท</div>
          <div style={{ fontSize: 13, marginTop: 4, color: "#555" }}>วันที่ {thaiDate}</div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>ที่</th>
              <th style={{ width: 140 }}>ชื่อ-นามสกุล</th>
              <th style={{ width: 80 }}>วันเกิด</th>
              <th style={{ width: 70 }}>สัญชาติ</th>
              <th style={{ width: 110 }}>เลขประจำตัว</th>
              <th style={{ width: 45 }}>ห้อง</th>
              <th style={{ width: 90 }}>เช็คอิน</th>
              <th style={{ width: 90 }}>เช็คเอาท์</th>
              <th style={{ width: 140 }}>ที่อยู่</th>
              <th style={{ width: 80 }}>อาชีพ</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>{r.guestName}</td>
                <td style={{ textAlign: "center" }}>
                  {r.guest.dateOfBirth
                    ? new Date(r.guest.dateOfBirth).toLocaleDateString("th-TH")
                    : "—"}
                </td>
                <td style={{ textAlign: "center" }}>{r.nationality ?? "—"}</td>
                <td>
                  {r.idType ? `${r.idType}: ` : ""}
                  {r.idNumber ?? "—"}
                </td>
                <td style={{ textAlign: "center" }}>{r.roomNumber}</td>
                <td style={{ textAlign: "center" }}>
                  {r.booking?.checkInDate
                    ? new Date(r.booking.checkInDate).toLocaleDateString("th-TH")
                    : "—"}
                </td>
                <td style={{ textAlign: "center" }}>
                  {r.booking?.checkOutDate
                    ? new Date(r.booking.checkOutDate).toLocaleDateString("th-TH")
                    : "—"}
                </td>
                <td>{r.guest.address ?? "—"}</td>
                <td>{r.guest.occupation ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  ไม่มีผู้พักเช็คอินในวันนี้
                </td>
              </tr>
            )}
            {Array.from({ length: BLANK_ROWS }).map((_, i) => (
              <tr key={`b${i}`}>
                <td style={{ textAlign: "center" }}>{records.length + i + 1}</td>
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="print-footer">
          <div className="sig-box">
            <div className="sig-line">ลายมือชื่อผู้รับแจ้ง</div>
            <div>ตำแหน่ง ..........</div>
          </div>
          <div style={{ fontSize: 12, color: "#555", textAlign: "center" }}>
            <div>รวมผู้พัก: {records.length} คน</div>
            <div>ประจำวัน: {thaiDate}</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">ลายมือชื่อเจ้าของ/ผู้จัดการ</div>
            <div>วิภวนา รีสอร์ท</div>
          </div>
        </div>
      </div>

      <PrintButton />
    </>
  );
}
