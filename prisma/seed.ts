import { PrismaClient, RoomStatus, Gender, IdType, BookingSource, StayStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Viphuanan Resort database...");

  // Default room type
  const standardType = await prisma.roomType.upsert({
    where: { id: "standard" },
    update: {},
    create: {
      id: "standard",
      name: "Standard",
      description: "ห้องมาตรฐาน",
    },
  });

  // 15 rooms
  const roomNumbers = ["01","02","03","04","05","06","07","08","09","10","11","12","13","14","15"];
  for (const num of roomNumbers) {
    await prisma.room.upsert({
      where: { roomNumber: num },
      update: {},
      create: {
        roomNumber: num,
        roomTypeId: standardType.id,
        basePrice: 1200,
        status: RoomStatus.VACANT,
      },
    });
  }
  console.log(`✅ Created ${roomNumbers.length} rooms`);

  // Default admin user
  const adminPassword = await hash("admin1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@viphuanan.com" },
    update: {},
    create: {
      email: "admin@viphuanan.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: "OWNER",
    },
  });

  // Front desk demo user
  const fdPassword = await hash("frontdesk1234", 12);
  await prisma.user.upsert({
    where: { email: "frontdesk@viphuanan.com" },
    update: {},
    create: {
      email: "frontdesk@viphuanan.com",
      name: "พนักงาน Front Desk",
      passwordHash: fdPassword,
      role: "FRONT_DESK",
    },
  });
  console.log("✅ Created default users");

  // System settings
  const defaultSettings = [
    { key: "resort.name", value: "Viphuanan Resort", description: "ชื่อรีสอร์ต" },
    { key: "resort.address", value: "", description: "ที่อยู่" },
    { key: "resort.phone", value: "", description: "เบอร์โทรศัพท์" },
    { key: "resort.currency", value: "THB", description: "สกุลเงิน" },
    { key: "resort.timezone", value: "Asia/Bangkok", description: "Timezone" },
    { key: "resort.locale", value: "th-TH", description: "Locale" },
    { key: "ai.documentConfidenceThreshold", value: "0.80", description: "ค่า threshold สำหรับ AI document verification" },
    { key: "ai.autoMatchThreshold", value: "0.90", description: "ค่า threshold สำหรับ auto match payment" },
    { key: "tax.vatRate", value: "0.07", description: "อัตรา VAT (7%)" },
    { key: "tax.effectiveDate", value: "2026-01-01", description: "วันที่มีผลของ tax rule ปัจจุบัน" },
    { key: "receipt.prefix", value: "RC", description: "prefix ของเลข receipt" },
    { key: "booking.prefix", value: "BK", description: "prefix ของเลข booking" },
    { key: "payment.prefix", value: "PAY", description: "prefix ของเลข payment" },
    { key: "upload.maxFileSizeMB", value: "20", description: "ขนาดไฟล์สูงสุด (MB)" },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("✅ Created system settings");

  // ─── Demo Guests ──────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const yesterday = new Date(today.getTime() - 86400000);
  const twoDaysLater = new Date(today.getTime() + 86400000 * 2);

  const [roomOccupied, roomReserved] = await Promise.all([
    prisma.room.findUnique({ where: { roomNumber: "03" } }),
    prisma.room.findUnique({ where: { roomNumber: "07" } }),
  ]);

  const guest1 = await prisma.guest.upsert({
    where: { id: "demo-guest-1" },
    update: {},
    create: {
      id: "demo-guest-1",
      firstName: "สมชาย",
      lastName: "ใจดี",
      fullName: "นาย สมชาย ใจดี",
      title: "นาย",
      gender: Gender.MALE,
      nationality: "ไทย",
      idType: IdType.THAI_ID,
      idNumber: "1234567890123",
      phone: "081-234-5678",
    },
  });

  const guest2 = await prisma.guest.upsert({
    where: { id: "demo-guest-2" },
    update: {},
    create: {
      id: "demo-guest-2",
      firstName: "Kenji",
      lastName: "Tanaka",
      fullName: "Mr. Kenji Tanaka",
      title: "Mr.",
      gender: Gender.MALE,
      nationality: "Japanese",
      idType: IdType.PASSPORT,
      idNumber: "JP1234567",
      phone: "090-0000-1234",
    },
  });

  // Demo booking: CHECKED_IN (room 03)
  if (roomOccupied) {
    const existingB1 = await prisma.booking.findFirst({ where: { bookingReference: "BK-2026-00001" } });
    if (!existingB1) {
      const b1 = await prisma.booking.create({
        data: {
          bookingReference: "BK-2026-00001",
          guestId: guest1.id,
          roomId: roomOccupied.id,
          source: BookingSource.DIRECT,
          checkInDate: yesterday,
          checkOutDate: tomorrow,
          numberOfNights: 2,
          roomRate: 1200,
          grossAmount: 2400,
          status: "CHECKED_IN",
        },
      });
      await prisma.stay.create({
        data: {
          bookingId: b1.id,
          guestId: guest1.id,
          roomId: roomOccupied.id,
          status: StayStatus.CHECKED_IN,
          actualCheckIn: yesterday,
        },
      });
      await prisma.room.update({
        where: { id: roomOccupied.id },
        data: { status: RoomStatus.OCCUPIED },
      });
    }
  }

  // Demo booking: CONFIRMED (room 07)
  if (roomReserved) {
    const existingB2 = await prisma.booking.findFirst({ where: { bookingReference: "BK-2026-00002" } });
    if (!existingB2) {
      const b2 = await prisma.booking.create({
        data: {
          bookingReference: "BK-2026-00002",
          guestId: guest2.id,
          roomId: roomReserved.id,
          source: BookingSource.BOOKING_COM,
          checkInDate: today,
          checkOutDate: twoDaysLater,
          numberOfNights: 2,
          roomRate: 1200,
          grossAmount: 2400,
          status: "CONFIRMED",
        },
      });
      await prisma.stay.create({
        data: {
          bookingId: b2.id,
          guestId: guest2.id,
          roomId: roomReserved.id,
          status: StayStatus.EXPECTED,
        },
      });
      await prisma.room.update({
        where: { id: roomReserved.id },
        data: { status: RoomStatus.RESERVED },
      });
    }
  }

  // Mark room 15 as OUT_OF_ORDER for realism
  await prisma.room.update({
    where: { roomNumber: "15" },
    data: { status: RoomStatus.OUT_OF_ORDER },
  });

  console.log("✅ Created demo guests and bookings");

  console.log("\n🎉 Seed complete!");
  console.log("  Admin:      admin@viphuanan.com / admin1234");
  console.log("  Front Desk: frontdesk@viphuanan.com / frontdesk1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
