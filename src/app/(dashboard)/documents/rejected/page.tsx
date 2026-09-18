import { db } from "@/lib/db";
import { DocumentList } from "@/components/documents/DocumentList";

export default async function DocumentRejectedPage() {
  const documents = await db.document.findMany({
    where: { status: "REJECTED" },
    include: {
      booking: { select: { bookingReference: true } },
      guest: { select: { fullName: true } },
    },
    orderBy: { reviewedAt: "desc" },
  });

  return (
    <DocumentList
      documents={documents}
      emptyMessage="ไม่มีเอกสารที่ถูกปฏิเสธ"
    />
  );
}
