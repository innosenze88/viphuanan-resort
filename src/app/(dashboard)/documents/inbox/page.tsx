import { db } from "@/lib/db";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";

export default async function DocumentInboxPage() {
  const documents = await db.document.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      booking: { select: { bookingReference: true } },
      guest: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">อัปโหลดเอกสารใหม่</h2>
        <DocumentUpload />
      </div>

      <DocumentList
        documents={documents}
        emptyMessage="ไม่มีเอกสารรอตรวจสอบ"
      />
    </div>
  );
}
