import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { CheckInButton, CheckOutButton } from "@/components/bookings/BookingActions";
import { PaymentSummary } from "@/components/payments/PaymentSummary";
import { RecordPaymentForm } from "@/components/payments/RecordPaymentForm";
import { VerifyPaymentButton } from "@/components/payments/PaymentActions";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentList } from "@/components/documents/DocumentList";

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  CONFIRMED: { label: "จองแล้ว", class: "bg-amber-100 text-amber-800" },
  CHECKED_IN: { label: "เช็คอินแล้ว", class: "bg-green-100 text-green-800" },
  CHECKED_OUT: { label: "เช็คเอาท์แล้ว", class: "bg-gray-100 text-gray-700" },
  CANCELLED: { label: "ยกเลิก", class: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "ไม่มา", class: "bg-purple-100 text-purple-700" },
};

export default async function BookingDetailPage(props: PageProps<"/bookings/[id]">) {
  const { id } = await props.params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { include: { roomType: true } },
      stays: true,
      payments: { orderBy: { paidAt: "asc" } },
      deposit: true,
      documents: {
        include: {
          booking: { select: { bookingReference: true } },
          guest: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) notFound();

  const stay = booking.stays[0];
  const badge = STATUS_BADGE[booking.status];

  const verifiedPayments = booking.payments.filter(
    (p) => p.status !== "FAILED" && p.status !== "CANCELLED"
  );
  const totalPaid = verifiedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingPayments = booking.payments.filter((p) => p.status === "PENDING");

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{booking.bookingReference}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge?.class}`}>
              {badge?.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">สร้างเมื่อ {formatDateTime(booking.createdAt)}</p>
        </div>

        <div className="flex gap-2">
          {booking.status === "CONFIRMED" && (
            <CheckInButton bookingId={booking.id} />
          )}
          {booking.status === "CHECKED_IN" && (
            <CheckOutButton bookingId={booking.id} />
          )}
        </div>
      </div>

      {/* Guest */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">แขก</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{booking.guest.fullName}</div>
            <div className="text-sm text-gray-500">{booking.guest.phone ?? "ไม่มีเบอร์โทร"}</div>
          </div>
          <Link href={`/guests/${booking.guestId}`} className="text-blue-600 text-sm hover:underline">
            ดูโปรไฟล์
          </Link>
        </div>
      </div>

      {/* Room */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">ห้องพัก</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="ห้อง" value={`ห้อง ${booking.room.roomNumber}`} />
          <Row label="ประเภท" value={booking.room.roomType?.name ?? "Standard"} />
          <Row label="เช็คอิน" value={formatDate(booking.checkInDate)} />
          <Row label="เช็คเอาท์" value={formatDate(booking.checkOutDate)} />
          <Row label="จำนวนคืน" value={`${booking.numberOfNights} คืน`} />
          <Row label="แหล่งที่มา" value={booking.source} />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">ราคา</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>ราคาห้อง × {booking.numberOfNights} คืน</span>
            <span>{formatCurrency(Number(booking.roomRate) * booking.numberOfNights)}</span>
          </div>
          {Number(booking.discount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>ส่วนลด</span>
              <span>-{formatCurrency(Number(booking.discount))}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-100">
            <span>ยอดรวม</span>
            <span>{formatCurrency(Number(booking.grossAmount))}</span>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="mb-4">
        <PaymentSummary
          grossAmount={Number(booking.grossAmount)}
          payments={booking.payments}
          deposit={booking.deposit}
        />
      </div>

      {/* Pending payments awaiting verification */}
      {pendingPayments.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <div className="text-xs text-yellow-700 font-medium uppercase tracking-wide mb-2">
            รอยืนยัน ({pendingPayments.length})
          </div>
          <div className="space-y-2">
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>
                  {formatCurrency(Number(p.amount))} · {p.paymentReference}
                </span>
                <VerifyPaymentButton paymentId={p.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record payment form */}
      {booking.status !== "CHECKED_OUT" && booking.status !== "CANCELLED" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-4">บันทึกการชำระเงิน</h2>
          <RecordPaymentForm
            bookingId={booking.id}
            grossAmount={Number(booking.grossAmount)}
            totalPaid={totalPaid}
          />
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">เอกสาร ({booking.documents.length})</h2>
        {booking.documents.length > 0 && (
          <div className="mb-4">
            <DocumentList documents={booking.documents} emptyMessage="" />
          </div>
        )}
        <details className="group">
          <summary className="text-sm text-blue-600 cursor-pointer hover:underline list-none">
            + อัปโหลดเอกสารสำหรับการจองนี้
          </summary>
          <div className="mt-3">
            <DocumentUpload bookingId={booking.id} />
          </div>
        </details>
      </div>

      {/* Stay info */}
      {stay && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Stay</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="สถานะ" value={stay.status} />
            {stay.actualCheckIn && (
              <Row label="เช็คอินจริง" value={formatDateTime(stay.actualCheckIn)} />
            )}
            {stay.actualCheckOut && (
              <Row label="เช็คเอาท์จริง" value={formatDateTime(stay.actualCheckOut)} />
            )}
          </div>
        </div>
      )}

      {booking.notes && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4 text-sm text-gray-700">
          <span className="font-medium">หมายเหตุ:</span> {booking.notes}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
