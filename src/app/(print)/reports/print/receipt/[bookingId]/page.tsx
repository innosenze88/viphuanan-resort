import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/registration/PrintButton";

export const metadata: Metadata = { title: "ใบเสร็จรับเงิน / Receipt" };

const RESORT = {
  name: "วิภวนา รีสอร์ท",
  nameEn: "Viphuanan Resort",
  address: "เลขที่ ... ตำบล ... อำเภอ ... จังหวัด ... รหัสไปรษณีย์ ...",
  phone: "0XX-XXX-XXXX",
  taxId: "X-XXXX-XXXXX-XX-X",
};

function thaiDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  PAYMENT_GATEWAY: "บัตรเครดิต/เดบิต",
  OTA: "OTA",
  OTHER: "อื่นๆ",
};

const PURPOSE_LABEL: Record<string, string> = {
  DEPOSIT: "มัดจำ",
  BALANCE: "ส่วนที่เหลือ",
  FULL: "เต็มจำนวน",
  EXTRA_CHARGE: "ค่าใช้จ่ายเพิ่มเติม",
};

export default async function ReceiptPage(
  props: PageProps<"/reports/print/receipt/[bookingId]">
) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { bookingId } = await props.params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      guest: true,
      room: { select: { roomNumber: true } },
      payments: {
        where: { status: "VERIFIED" },
        orderBy: { paidAt: "asc" },
        select: {
          id: true,
          paymentReference: true,
          amount: true,
          method: true,
          purpose: true,
          paidAt: true,
          notes: true,
        },
      },
    },
  });

  if (!booking) notFound();

  const totalPaid = booking.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(booking.grossAmount) - totalPaid;

  return (
    <>
      <style>{`
        body { font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', sans-serif; background: #f5f5f5; }
        @page { size: A4 portrait; margin: 1.5cm; }
        @media print { .no-print { display: none !important; } body { background: white; padding: 0; } }
        .receipt { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm 15mm; box-sizing: border-box; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 20px; }
        .hotel-name { font-size: 24px; font-weight: bold; }
        .hotel-sub { font-size: 13px; color: #555; margin-top: 2px; }
        .receipt-title { font-size: 20px; font-weight: bold; margin-top: 10px; }
        .receipt-no { font-size: 13px; color: #666; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .info-box { background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 4px; padding: 10px 14px; }
        .info-label { font-size: 11px; color: #777; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
        .info-value { font-size: 14px; font-weight: 600; color: #111; }
        .info-sub { font-size: 12px; color: #666; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 9px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        th { background: #f4f4f4; font-weight: bold; text-align: left; border-bottom: 2px solid #ddd; }
        .text-right { text-align: right; }
        .summary-box { border: 2px solid #000; border-radius: 6px; padding: 14px 18px; margin-top: 8px; }
        .summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
        .summary-row.total { font-size: 16px; font-weight: bold; border-top: 1px solid #ccc; margin-top: 8px; padding-top: 8px; }
        .summary-row.balance-zero { color: #16a34a; }
        .summary-row.balance-due { color: #dc2626; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
        .sig-box { text-align: center; width: 180px; }
        .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 4px; }
        .paid-badge { display: inline-block; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: bold; margin-top: 6px; }
        @media screen { .receipt { border: 1px solid #ddd; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px auto; } }
      `}</style>

      <div className="receipt">
        {/* Header */}
        <div className="header">
          <div className="hotel-name">{RESORT.name}</div>
          <div className="hotel-sub">{RESORT.nameEn}</div>
          <div className="hotel-sub">{RESORT.address}</div>
          <div className="hotel-sub">โทร. {RESORT.phone} · เลขผู้เสียภาษี: {RESORT.taxId}</div>
          <div className="receipt-title">ใบเสร็จรับเงิน</div>
          <div className="hotel-sub" style={{ fontSize: 13 }}>Receipt / Official Receipt</div>
          <div className="receipt-no">เลขที่ REC-{booking.bookingReference}</div>
          <div className="receipt-no">
            วันที่ออกเอกสาร:{" "}
            {thaiDate(
              booking.checkOutDate
                ? booking.checkOutDate
                : new Date()
            )}
          </div>
          {balance <= 0 && <div className="paid-badge">ชำระครบแล้ว ✓</div>}
        </div>

        {/* Guest & booking info */}
        <div className="info-grid">
          <div className="info-box">
            <div className="info-label">ชื่อผู้รับบริการ</div>
            <div className="info-value">{booking.guest.fullName}</div>
            {booking.guest.phone && (
              <div className="info-sub">โทร. {booking.guest.phone}</div>
            )}
            {booking.guest.email && (
              <div className="info-sub">{booking.guest.email}</div>
            )}
            {booking.guest.idNumber && (
              <div className="info-sub">
                {booking.guest.idType}: {booking.guest.idNumber}
              </div>
            )}
          </div>
          <div className="info-box">
            <div className="info-label">รายละเอียดการพัก</div>
            <div className="info-value">เลขจอง: {booking.bookingReference}</div>
            <div className="info-sub">
              ห้อง {booking.room.roomNumber} · {booking.numberOfNights} คืน
            </div>
            <div className="info-sub">
              เช็คอิน: {thaiDate(booking.checkInDate)}
            </div>
            <div className="info-sub">
              เช็คเอาท์: {thaiDate(booking.checkOutDate)}
            </div>
          </div>
        </div>

        {/* Service line */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>ที่</th>
              <th>รายการ / Description</th>
              <th className="text-right" style={{ width: 80 }}>คืน</th>
              <th className="text-right" style={{ width: 100 }}>ราคา/คืน</th>
              <th className="text-right" style={{ width: 110 }}>รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>1</td>
              <td>
                ค่าห้องพัก ห้อง {booking.room.roomNumber}
                <div style={{ fontSize: 11, color: "#888" }}>
                  {thaiDate(booking.checkInDate)} – {thaiDate(booking.checkOutDate)}
                </div>
              </td>
              <td className="text-right">{booking.numberOfNights}</td>
              <td className="text-right">
                ฿{Number(booking.roomRate).toLocaleString("th-TH")}
              </td>
              <td className="text-right">
                ฿{(Number(booking.roomRate) * booking.numberOfNights).toLocaleString("th-TH")}
              </td>
            </tr>
            {Number(booking.discount) > 0 && (
              <tr>
                <td style={{ textAlign: "center" }}>2</td>
                <td>ส่วนลด / Discount</td>
                <td></td>
                <td></td>
                <td className="text-right" style={{ color: "#dc2626" }}>
                  −฿{Number(booking.discount).toLocaleString("th-TH")}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Payment history */}
        {booking.payments.length > 0 && (
          <>
            <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 6 }}>
              รายละเอียดการชำระเงิน:
            </div>
            <table>
              <thead>
                <tr>
                  <th>เลขอ้างอิงการชำระ</th>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th>วิธีชำระ</th>
                  <th className="text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {p.paymentReference}
                    </td>
                    <td>{p.paidAt ? thaiDate(p.paidAt) : "—"}</td>
                    <td>{PURPOSE_LABEL[p.purpose] ?? p.purpose}</td>
                    <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      ฿{Number(p.amount).toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Summary */}
        <div className="summary-box">
          <div className="summary-row">
            <span>ยอดค่าบริการทั้งหมด:</span>
            <span>฿{Number(booking.grossAmount).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="summary-row">
            <span>ชำระแล้วรวม:</span>
            <span>฿{totalPaid.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`summary-row total ${balance <= 0 ? "balance-zero" : "balance-due"}`}>
            <span>{balance <= 0 ? "ชำระครบแล้ว" : "ยอดค้างชำระ"}:</span>
            <span>฿{Math.abs(balance).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <div style={{ fontSize: 11, color: "#777", maxWidth: 220 }}>
            <strong>หมายเหตุ:</strong> กรุณาเก็บใบเสร็จนี้ไว้เป็นหลักฐาน
            ออกโดยระบบคอมพิวเตอร์ วันที่{" "}
            {thaiDate(new Date())}
          </div>
          <div className="sig-box">
            <div className="sig-line">ลายมือชื่อผู้รับเงิน</div>
            <div>ตำแหน่ง: ........................</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">ลายมือชื่อผู้จ่ายเงิน</div>
            <div>{booking.guest.fullName}</div>
          </div>
        </div>
      </div>

      <PrintButton label="🖨 พิมพ์ใบเสร็จ" />
    </>
  );
}
