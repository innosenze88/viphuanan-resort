import { db } from "@/lib/db";
import { DocumentList } from "@/components/documents/DocumentList";

export default async function DocumentVerifiedPage() {
  const documents = await db.document.findMany({
    where: { status: "VERIFIED" },
    include: {
      booking: { select: { bookingReference: true } },
      guest: { select: { fullName: true } },
    },
    orderBy: { reviewedAt: "desc" },
  });

  return (
    <DocumentList
      documents={documents}
      emptyMessage="ยังไม่มีเอกสารที่ยืนยันแล้ว"
    />
  );
}
