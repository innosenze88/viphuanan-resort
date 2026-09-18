import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PrintButton } from "@/components/registration/PrintButton";

export const metadata: Metadata = { title: "ใบกำกับภาษี / Tax Invoice" };

// Resort information — in production, load from SystemSettings
const RESORT = {
  name: "วิภวนา รีสอร์ท",
  nameEn: "Viphuanan Resort",
  address: "เลขที่ ... ตำบล ... อำเภอ ... จังหวัด ... รหัสไปรษณีย์ ...",
  phone: "0XX-XXX-XXXX",
  taxId: "X-XXXX-XXXXX-XX-X",
  vatRate: 0.07,
};

function thaiDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function TaxInvoicePage(
  props: PageProps<"/reports/print/tax-invoice/[bookingId]">
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
          paymentReference: true,
          amount: true,
          method: true,
          purpose: true,
          paidAt: true,
        },
      },
    },
  });

  if (!booking) notFound();

  const grossAmount = Number(booking.grossAmount);
  // VAT-inclusive: tax base = grossAmount / 1.07, VAT = grossAmount - taxBase
  const taxBase = grossAmount / (1 + RESORT.vatRate);
  const vatAmount = grossAmount - taxBase;

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

  const invoiceNumber = `TAX-${booking.bookingReference}`;
  const invoiceDate = booking.checkOutDate
    ? new Date(booking.checkOutDate)
    : new Date();

  return (
    <>
      <style>{`
        body { font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', sans-serif; background: #f5f5f5; }
        @page { size: A4 portrait; margin: 1.5cm; }
        @media print { .no-print { display: none !important; } body { background: white; padding: 0; } }
        .invoice { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 20mm 15mm; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .hotel-name { font-size: 22px; font-weight: bold; }
        .hotel-address { font-size: 12px; color: #444; margin-top: 4px; }
        .invoice-title { text-align: right; }
        .invoice-title h1 { font-size: 24px; font-weight: bold; }
        .invoice-title .subtitle { font-size: 14px; color: #666; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .meta-box { background: #f9f9f9; border: 1px solid #ddd; padding: 10px 14px; border-radius: 4px; }
        .meta-box label { font-size: 11px; color: #777; display: block; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-box .val { font-size: 14px; font-weight: 600; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 8px 10px; border: 1px solid #ddd; font-size: 13px; }
        th { background: #f0f0f0; font-weight: bold; text-align: left; }
        .text-right { text-align: right; }
        .totals { margin-top: 8px; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 10px; font-size: 13px; }
        .total-row.grand { font-size: 16px; font-weight: bold; background: #000; color: #fff; padding: 8px 10px; border-radius: 4px; }
        .payment-history { margin-top: 16px; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; }
        .sig-box { text-align: center; width: 180px; }
        .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 4px; }
        .tax-notice { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 4px; padding: 8px 12px; font-size: 11px; color: #92400e; margin-bottom: 16px; }
        @media screen { .invoice { border: 1px solid #ddd; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px auto; } }
      `}</style>

      <div className="invoice">
        {/* Header */}
        <div className="header">
          <div>
            <div className="hotel-name">{RESORT.name}</div>
            <div className="hotel-address">{RESORT.address}</div>
            <div className="hotel-address">โทร. {RESORT.phone}</div>
            <div className="hotel-address">เลขประจำตัวผู้เสียภาษี: {RESORT.taxId}</div>
          </div>
          <div className="invoice-title">
            <h1>ใบกำกับภาษี</h1>
            <div className="subtitle">Tax Invoice (ต้นฉบับ / Original)</div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <div>เลขที่: <strong>{invoiceNumber}</strong></div>
              <div>วันที่: <strong>{thaiDate(invoiceDate)}</strong></div>
            </div>
          </div>
        </div>

        {/* Meta grid */}
        <div className="meta-grid">
          <div className="meta-box">
            <label>ชื่อผู้ซื้อ / Bill to</label>
            <div className="val">{booking.guest.fullName}</div>
            {booking.guest.idNumber && (
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                {booking.guest.idType}: {booking.guest.idNumber}
              </div>
            )}
            {booking.guest.address && (
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                {booking.guest.address}
              </div>
            )}
          </div>
          <div className="meta-box">
            <label>รายละเอียดการจอง</label>
            <div className="val">เลขที่จอง: {booking.bookingReference}</div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
              ห้อง {booking.room.roomNumber} · เช็คอิน {thaiDate(booking.checkInDate)} · เช็คเอาท์ {thaiDate(booking.checkOutDate)}
            </div>
          </div>
        </div>

        {/* Tax notice */}
        <div className="tax-notice">
          ใบกำกับภาษีนี้ออกในกรณีที่ราคาบริการรวม VAT 7% แล้ว (VAT-inclusive)
          กรุณาเก็บเอกสารนี้ไว้เป็นหลักฐานการลดหย่อนภาษี
        </div>

        {/* Line items */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>ที่</th>
              <th>รายการ / Description</th>
              <th className="text-right" style={{ width: 80 }}>จำนวนคืน</th>
              <th className="text-right" style={{ width: 100 }}>ราคา/คืน</th>
              <th className="text-right" style={{ width: 110 }}>จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center" }}>1</td>
              <td>
                ค่าห้องพัก ห้อง {booking.room.roomNumber}
                <div style={{ fontSize: 11, color: "#666" }}>
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

        {/* Totals */}
        <div className="totals">
          <div className="total-row">
            <span>มูลค่าก่อนภาษี (Tax Base):</span>
            <span>฿{taxBase.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="total-row">
            <span>ภาษีมูลค่าเพิ่ม {Math.round(RESORT.vatRate * 100)}% (VAT):</span>
            <span>฿{vatAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="total-row grand">
            <span>รวมทั้งสิ้น / Grand Total:</span>
            <span>฿{grossAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment history */}
        {booking.payments.length > 0 && (
          <div className="payment-history">
            <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 6, marginTop: 16 }}>
              ประวัติการชำระเงิน / Payment History:
            </div>
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>เลขอ้างอิง</th>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th>วิธีชำระ</th>
                  <th className="text-right">จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.paymentReference}>
                    <td style={{ fontFamily: "monospace" }}>{p.paymentReference}</td>
                    <td>{p.paidAt ? thaiDate(p.paidAt) : "—"}</td>
                    <td>{PURPOSE_LABEL[p.purpose] ?? p.purpose}</td>
                    <td>{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="text-right">฿{Number(p.amount).toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: "bold", background: "#f9f9f9" }}>
                  <td colSpan={4}>รวมที่ชำระแล้ว</td>
                  <td className="text-right">
                    ฿{booking.payments
                      .reduce((s, p) => s + Number(p.amount), 0)
                      .toLocaleString("th-TH")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <div style={{ fontSize: 11, color: "#777", maxWidth: 220 }}>
            <strong>หมายเหตุ:</strong> กรุณาเก็บใบกำกับภาษีนี้ไว้เป็นหลักฐาน
            เอกสารนี้ออกโดยคอมพิวเตอร์และมีผลทางกฎหมาย
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

      <PrintButton label="🖨 พิมพ์ใบกำกับภาษี" />
    </>
  );
}
