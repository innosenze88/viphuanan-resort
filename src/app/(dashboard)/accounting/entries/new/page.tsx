import { db } from "@/lib/db";
import { JournalEntryForm } from "@/components/accounting/JournalEntryForm";

export default async function NewJournalEntryPage(props: PageProps<"/accounting/entries/new">) {
  const { bookingId } = await props.searchParams;

  const accounts = await db.chartOfAccount.findMany({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">สร้างรายการบัญชีใหม่</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-5">
        รายการใหม่จะถูกสร้างในสถานะ <strong>Draft</strong> — ต้องผ่าน PENDING_REVIEW → VERIFIED → APPROVED → POSTED ก่อนจึงจะมีผลต่อบัญชี
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <JournalEntryForm
          accounts={accounts}
          defaultBookingId={typeof bookingId === "string" ? bookingId : undefined}
        />
      </div>
    </div>
  );
}
