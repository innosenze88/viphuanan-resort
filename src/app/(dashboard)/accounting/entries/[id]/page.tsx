import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";
import { JournalWorkflowButtons } from "@/components/accounting/JournalWorkflow";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  VERIFIED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-indigo-100 text-indigo-800",
  POSTED: "bg-green-100 text-green-800",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "รอตรวจสอบ",
  VERIFIED: "ตรวจสอบแล้ว",
  APPROVED: "อนุมัติแล้ว",
  POSTED: "Post แล้ว (ล็อค)",
};

const TYPE_LABEL: Record<string, string> = {
  REVENUE: "รายได้",
  EXPENSE: "ค่าใช้จ่าย",
  ADJUSTMENT: "ปรับปรุง",
  REVERSAL: "Reversal",
  CORRECTION: "แก้ไข",
  OTHER: "อื่นๆ",
};

export default async function JournalEntryDetailPage(props: PageProps<"/accounting/entries/[id]">) {
  const { id } = await props.params;

  const session = await getSession();
  if (!session) return null;

  const entry = await db.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          debitAccount: { select: { code: true, name: true } },
          creditAccount: { select: { code: true, name: true } },
        },
      },
      booking: { select: { id: true, bookingReference: true } },
    },
  });

  if (!entry) notFound();

  const totalDebits = entry.lines.reduce(
    (s, l) => s + (l.debitAccountId ? Number(l.amount) : 0),
    0
  );
  const totalCredits = entry.lines.reduce(
    (s, l) => s + (l.creditAccountId ? Number(l.amount) : 0),
    0
  );

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{entry.entryNumber}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[entry.status]}`}>
              {STATUS_LABEL[entry.status]}
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {TYPE_LABEL[entry.type]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
        </div>
        <Link href="/accounting/adjustments" className="text-sm text-blue-600 hover:underline shrink-0">
          ← รายการทั้งหมด
        </Link>
      </div>

      {/* POSTED warning */}
      {entry.status === "POSTED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          รายการนี้ <strong>Post แล้ว</strong> — ไม่สามารถแก้ไขได้ หากต้องการแก้ไขให้สร้าง <strong>Reversal</strong> แทน
        </div>
      )}

      {entry.reversalOf && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          รายการนี้คือ Reversal ของ:{" "}
          <Link href={`/accounting/entries/${entry.reversalOf}`} className="underline font-mono">
            {entry.reversalOf}
          </Link>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="วันที่" value={formatDate(entry.entryDate)} />
          <Row label="ประเภท" value={TYPE_LABEL[entry.type] ?? entry.type} />
          {entry.booking && (
            <div>
              <div className="text-xs text-gray-500">การจอง</div>
              <Link href={`/bookings/${entry.booking.id}`} className="text-blue-600 hover:underline font-mono text-sm">
                {entry.booking.bookingReference}
              </Link>
            </div>
          )}
          <Row label="สร้างเมื่อ" value={formatDateTime(entry.createdAt)} />
        </div>
      </div>

      {/* Journal Lines */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-medium">
          รายการ Debit/Credit
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Debit บัญชี</th>
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Credit บัญชี</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">จำนวน</th>
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">รายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entry.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3 text-gray-700">
                  {line.debitAccount
                    ? `${line.debitAccount.code} ${line.debitAccount.name}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {line.creditAccount
                    ? `${line.creditAccount.code} ${line.creditAccount.name}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(line.amount))}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{line.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200 text-xs font-semibold">
              <td className="px-4 py-2 text-gray-600">รวม Debit: {formatCurrency(totalDebits)}</td>
              <td className="px-4 py-2 text-gray-600">รวม Credit: {formatCurrency(totalCredits)}</td>
              <td className="px-4 py-2 text-right">
                {Math.abs(totalDebits - totalCredits) < 0.01 ? (
                  <span className="text-green-600">✓ สมดุล</span>
                ) : (
                  <span className="text-red-600">⚠️ ไม่สมดุล</span>
                )}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Workflow timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">ขั้นตอนการอนุมัติ</h2>
        <WorkflowTimeline entry={entry} />
      </div>

      {/* Action buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">การดำเนินการ</h2>
        <JournalWorkflowButtons
          entryId={entry.id}
          status={entry.status}
          createdBy={entry.createdBy}
          currentUserId={session.id}
          currentUserRole={session.role}
        />
      </div>
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

function WorkflowTimeline({ entry }: { entry: { submittedAt: Date | null; verifiedAt: Date | null; approvedAt: Date | null; postedAt: Date | null; status: string } }) {
  const steps = [
    { label: "Draft สร้างแล้ว", done: true, at: null },
    { label: "ส่งตรวจสอบ", done: !!entry.submittedAt, at: entry.submittedAt },
    { label: "Verified", done: !!entry.verifiedAt, at: entry.verifiedAt },
    { label: "Approved", done: !!entry.approvedAt, at: entry.approvedAt },
    { label: "Posted", done: !!entry.postedAt, at: entry.postedAt },
  ];

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step.done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              {step.done ? "✓" : i + 1}
            </div>
            <div className={`text-xs mt-1 text-center ${step.done ? "text-gray-700" : "text-gray-400"}`}>
              {step.label}
            </div>
            {step.at && (
              <div className="text-xs text-gray-400 text-center">
                {new Date(step.at).toLocaleDateString("th-TH")}
              </div>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-10 mb-4 mx-1 ${step.done && steps[i + 1].done ? "bg-green-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
