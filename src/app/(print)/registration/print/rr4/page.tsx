import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/registration/PrintButton";

export const metadata: Metadata = { title: "ทะเบียนผู้พักชาวต่างชาติ รร.4 / TM30" };

export default async function PrintRR4Page(
  props: PageProps<"/registration/print/rr4">
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
      registrationType: "RR4",
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
          idType: true,
          idNumber: true,
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

  const BLANK_ROWS = Math.max(0, 8 - records.length);

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
        .law-notice { border: 1px solid #ccc; background: #fffbeb; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; border-radius: 4px; }
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
          <h1>ทะเบียนผู้พักชาวต่างชาติ</h1>
          <h2>(แบบ รร.4 — ตม.30)</h2>
          <div style={{ fontSize: 15, marginTop: 4 }}>โรงแรม / รีสอร์ท วิภวนา รีสอร์ท</div>
          <div style={{ fontSize: 13, marginTop: 4, color: "#555" }}>วันที่ {thaiDate}</div>
        </div>

        <div className="law-notice">
          <strong>ข้อกฎหมาย:</strong> ตาม พ.ร.บ.คนเข้าเมือง พ.ศ. 2522 มาตรา 38
          เจ้าของที่พักต้องแจ้งพักของคนต่างด้าว <strong>ภายใน 24 ชั่วโมง</strong>{" "}
          หลังเช็คอิน ผ่านระบบ tm30.immigration.go.th หรือยื่นแบบที่สถานีตำรวจท้องที่
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 30 }}>ที่</th>
              <th style={{ width: 150 }}>ชื่อ-นามสกุล</th>
              <th style={{ width: 80 }}>วันเกิด</th>
              <th style={{ width: 80 }}>สัญชาติ</th>
              <th style={{ width: 110 }}>เลข Passport</th>
              <th style={{ width: 45 }}>ห้อง</th>
              <th style={{ width: 90 }}>เช็คอิน</th>
              <th style={{ width: 90 }}>เช็คเอาท์</th>
              <th style={{ width: 80 }}>อาชีพ</th>
              <th style={{ width: 130 }}>ที่อยู่ในไทย</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>
                  {r.guestName}
                  {r.guest.phone && (
                    <div style={{ fontSize: 11, color: "#666" }}>☎ {r.guest.phone}</div>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {r.guest.dateOfBirth
                    ? new Date(r.guest.dateOfBirth).toLocaleDateString("en-GB")
                    : "—"}
                </td>
                <td style={{ textAlign: "center" }}>{r.nationality ?? "—"}</td>
                <td>{r.idNumber ?? "—"}</td>
                <td style={{ textAlign: "center" }}>{r.roomNumber}</td>
                <td style={{ textAlign: "center" }}>
                  {r.booking?.checkInDate
                    ? new Date(r.booking.checkInDate).toLocaleDateString("en-GB")
                    : "—"}
                </td>
                <td style={{ textAlign: "center" }}>
                  {r.booking?.checkOutDate
                    ? new Date(r.booking.checkOutDate).toLocaleDateString("en-GB")
                    : "—"}
                </td>
                <td>{r.guest.occupation ?? "—"}</td>
                <td>{r.guest.address ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  ไม่มีผู้พักชาวต่างชาติเช็คอินในวันนี้
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
            <div className="sig-line">ลายมือชื่อผู้แจ้ง / Signature</div>
            <div>ตำแหน่ง / Position: ..........</div>
          </div>
          <div style={{ fontSize: 12, color: "#555", textAlign: "center" }}>
            <div>รวมชาวต่างชาติ: {records.length} คน</div>
            <div>แจ้งที่ตำรวจท้องที่ / tm30.immigration.go.th</div>
            <div style={{ fontWeight: "bold", color: "#b91c1c" }}>ภายใน 24 ชั่วโมงหลังเช็คอิน</div>
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
