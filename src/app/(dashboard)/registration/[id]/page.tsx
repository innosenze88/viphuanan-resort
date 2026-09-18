import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateTime, formatDate } from "@/lib/utils";
import { SubmitRegistrationButton } from "@/components/registration/SubmitRegistrationButton";

const TYPE_LABEL: Record<string, string> = {
  RR3: "รร.3 — ทะเบียนรับรองผู้พัก (แขกชาวไทย)",
  RR4: "รร.4 — แจ้งที่พักชาวต่างชาติ",
  TM30: "ตม.30 — แจ้งที่พักคนต่างด้าว",
};

const TYPE_LAW: Record<string, string> = {
  RR3: "พ.ร.บ.โรงแรม พ.ศ. 2547 — ต้องลงทะเบียนในวันที่เช็คอิน",
  RR4: "พ.ร.บ.คนเข้าเมือง พ.ศ. 2522 — ต้องแจ้งสถานีตำรวจภายใน 24 ชั่วโมง",
  TM30: "พ.ร.บ.คนเข้าเมือง พ.ศ. 2522 มาตรา 38 — ต้องแจ้งออนไลน์ภายใน 24 ชั่วโมง",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  SUBMITTED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รอส่ง",
  SUBMITTED: "ส่งแล้ว",
  OVERDUE: "เกินกำหนด",
  CANCELLED: "ยกเลิก",
};

export default async function RegistrationDetailPage(
  props: PageProps<"/registration/[id]">
) {
  const { id } = await props.params;

  const record = await db.registrationRecord.findUnique({
    where: { id },
    include: {
      booking: { select: { id: true, bookingReference: true, checkInDate: true, checkOutDate: true } },
      guest: { select: { id: true, fullName: true, idType: true, idNumber: true, nationality: true } },
    },
  });

  if (!record) notFound();

  const isOverdue = record.status === "OVERDUE";
  const canSubmit = record.status === "PENDING" || record.status === "OVERDUE";
  const printType = record.registrationType === "RR3" ? "rr3" : "rr4";
  const printDate = record.checkInDate.toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-gray-900">
              {TYPE_LABEL[record.registrationType]}
            </h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[record.status]}`}>
              {STATUS_LABEL[record.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{TYPE_LAW[record.registrationType]}</p>
        </div>
        <Link href="/registration" className="text-sm text-blue-600 hover:underline shrink-0">
          ← รายการทั้งหมด
        </Link>
      </div>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          ⚠️ <strong>เกินกำหนดส่ง</strong> — ครบกำหนด {formatDateTime(record.dueAt)} กรุณาดำเนินการโดยด่วน
        </div>
      )}

      {/* Guest info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">ข้อมูลแขก</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="ชื่อ-นามสกุล" value={record.guestName} />
          <Field label="สัญชาติ" value={record.nationality ?? "—"} />
          <Field label="ประเภทบัตร" value={record.idType ?? "—"} />
          <Field label="เลขที่" value={record.idNumber ?? "—"} />
          <Field label="ห้องพัก" value={record.roomNumber} />
          <Field label="วันเช็คอิน" value={formatDate(record.checkInDate)} />
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Link
            href={`/guests/${record.guest.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ดูข้อมูลแขก →
          </Link>
          {record.booking && (
            <Link
              href={`/bookings/${record.booking.id}`}
              className="text-sm text-blue-600 hover:underline ml-4"
            >
              ดูการจอง {record.booking.bookingReference} →
            </Link>
          )}
        </div>
      </div>

      {/* Deadline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">กำหนดการส่ง</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="ครบกำหนด" value={formatDateTime(record.dueAt)} />
          <Field
            label="สถานะ"
            value={STATUS_LABEL[record.status]}
            highlight={isOverdue ? "red" : undefined}
          />
          {record.submittedAt && (
            <Field label="ส่งเมื่อ" value={formatDateTime(record.submittedAt)} />
          )}
          {record.submissionRef && (
            <Field label="เลขที่อ้างอิง" value={record.submissionRef} />
          )}
        </div>
      </div>

      {/* Submit action */}
      {canSubmit && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">บันทึกการส่ง</h2>
          <SubmitRegistrationButton id={record.id} />
        </div>
      )}

      {/* Print */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">พิมพ์แบบฟอร์ม</h2>
        <div className="flex gap-3">
          <a
            href={`/registration/print/${printType}?date=${printDate}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            🖨 พิมพ์{record.registrationType === "RR3" ? " รร.3" : " รร.4"}
          </a>
          {record.registrationType !== "RR3" && (
            <a
              href={`/registration/print/rr4?date=${printDate}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              🖨 พิมพ์ รร.4
            </a>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          เปิดในแท็บใหม่ — พิมพ์ด้วย Ctrl+P
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "red";
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-0.5 font-medium ${highlight === "red" ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}
