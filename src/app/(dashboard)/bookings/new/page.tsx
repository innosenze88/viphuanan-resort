import { db } from "@/lib/db";
import { BookingForm } from "@/components/bookings/BookingForm";
import { createBooking } from "@/app/actions/bookings";

export default async function NewBookingPage(props: PageProps<"/bookings/new">) {
  const { guestId } = await props.searchParams as { guestId?: string };

  const [rooms, guests] = await Promise.all([
    db.room.findMany({
      where: { active: true, status: { in: ["VACANT", "INSPECTED"] } },
      orderBy: { roomNumber: "asc" },
    }),
    db.guest.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">สร้างการจองใหม่</h1>
      <BookingForm
        action={createBooking}
        rooms={rooms}
        guests={guests}
        defaultGuestId={guestId}
      />
    </div>
  );
}
