import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEMO_SLUG = "demo";
const DEMO_PASSWORD = "demo1234";

const EXTRA_OWNERS = [
  "นุ่น",
  "เอก",
  "แนน",
  "โจ",
  "แอน",
  "บี",
  "กิ๊ฟ",
  "มาย",
  "ต้น",
  "ฝน",
  "ปอ",
  "เจี๊ยบ",
  "โอ๊ต",
  "แพท",
  "มิ้นท์",
  "บอส",
  "แก้ม",
  "นัท",
  "พลอย",
  "กอล์ฟ",
];

const PET_NAMES = ["มะลิ", "โบ้", "เหมียว", "ช็อกโก", "นุ่นน้อย", "ฟ้า", "ด่าง", "โอเลี้ยง", "ส้ม", "บาสเก็ต"];

export async function seedDemoClinic(prisma: PrismaClient) {
  const receptionist = await prisma.role.findFirst({ where: { tenantId: null, key: "RECEPTIONIST" } });
  const vet = await prisma.role.findFirst({ where: { tenantId: null, key: "VET" } });
  if (!receptionist || !vet) {
    throw new Error("seed บทบาทระบบก่อน seed คลินิกตัวอย่าง");
  }

  const dog = await prisma.species.findFirst({ where: { tenantId: null, code: "CANINE" } });
  const cat = await prisma.species.findFirst({ where: { tenantId: null, code: "FELINE" } });
  if (!dog || !cat) throw new Error("ไม่พบ species กลางของระบบ");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const tenant =
    (await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } })) ??
    (await prisma.tenant.create({
      data: {
        slug: DEMO_SLUG,
        legalName: "คลินิกตัวอย่าง รักสัตว์ จำกัด",
        displayName: "คลินิกรักสัตว์ (ตัวอย่าง)",
        status: "ACTIVE",
      },
    }));

  const branch =
    (await prisma.branch.findFirst({ where: { tenantId: tenant.id, code: "BKK" } })) ??
    (await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        code: "BKK",
        name: "สาขาสุขุมวิท",
        isHeadOffice: true,
      },
    }));

  const nune =
    (await prisma.user.findUnique({ where: { email: "nune@demo.local" } })) ??
    (await prisma.user.create({
      data: {
        email: "nune@demo.local",
        passwordHash,
        displayName: "นุ่น ต้อนรับ",
        status: "ACTIVE",
      },
    }));

  const ek =
    (await prisma.user.findUnique({ where: { email: "ek@demo.local" } })) ??
    (await prisma.user.create({
      data: {
        email: "ek@demo.local",
        passwordHash,
        displayName: "หมอเอก",
        status: "ACTIVE",
      },
    }));

  await upsertMembership(prisma, {
    tenantId: tenant.id,
    userId: nune.id,
    roleId: receptionist.id,
    branchId: branch.id,
    jobTitle: "เจ้าหน้าที่ต้อนรับ",
  });
  await upsertMembership(prisma, {
    tenantId: tenant.id,
    userId: ek.id,
    roleId: vet.id,
    branchId: branch.id,
    jobTitle: "สัตวแพทย์",
    licenseNo: "ท.ส.12345",
  });

  const praeUser =
    (await prisma.user.findUnique({ where: { phone: "0812345678" } })) ??
    (await prisma.user.create({
      data: {
        phone: "0812345678",
        displayName: "คุณแพร",
        status: "ACTIVE",
      },
    }));

  let prae = await prisma.owner.findFirst({
    where: { tenantId: tenant.id, phones: { some: { digits: "0812345678" } } },
  });
  if (!prae) {
    prae = await prisma.owner.create({
      data: {
        tenantId: tenant.id,
        code: "O-PRAE1",
        firstName: "แพร",
        lastName: "ใจดี",
        searchKey: "",
        userId: praeUser.id,
        phones: {
          create: {
            tenantId: tenant.id,
            raw: "081-234-5678",
            digits: "0812345678",
            isPrimary: true,
          },
        },
      },
    });
  }

  let khao = await prisma.pet.findFirst({ where: { tenantId: tenant.id, name: "ข้าวปุ้น" } });
  if (!khao) {
    khao = await prisma.pet.create({
      data: {
        tenantId: tenant.id,
        ownerId: prae.id,
        code: "P-KAO01",
        name: "ข้าวปุ้น",
        searchKey: "",
        speciesId: cat.id,
      },
    });
    await prisma.petAlert.create({
      data: {
        tenantId: tenant.id,
        petId: khao.id,
        type: "ALLERGY",
        severity: "HIGH",
        label: "แพ้ penicillin",
      },
    });
  }

  for (let i = 0; i < EXTRA_OWNERS.length; i++) {
    const firstName = EXTRA_OWNERS[i]!;
    const digits = `08${(20000000 + i).toString()}`;
    const exists = await prisma.ownerPhone.findFirst({
      where: { tenantId: tenant.id, digits },
    });
    if (exists) continue;
    const owner = await prisma.owner.create({
      data: {
        tenantId: tenant.id,
        code: `O-D${(i + 1).toString().padStart(3, "0")}`,
        firstName,
        searchKey: "",
        phones: {
          create: { tenantId: tenant.id, raw: digits, digits, isPrimary: true },
        },
      },
    });
    const petName = PET_NAMES[i % PET_NAMES.length]!;
    await prisma.pet.create({
      data: {
        tenantId: tenant.id,
        ownerId: owner.id,
        code: `P-D${(i + 1).toString().padStart(3, "0")}`,
        name: petName,
        searchKey: "",
        speciesId: i % 3 === 0 ? cat.id : dog.id,
      },
    });
  }
}

async function upsertMembership(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    userId: string;
    roleId: string;
    branchId: string;
    jobTitle: string;
    licenseNo?: string;
  },
) {
  const existing = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } },
  });
  const membership =
    existing ??
    (await prisma.membership.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        roleId: input.roleId,
        status: "ACTIVE",
        jobTitle: input.jobTitle,
        licenseNo: input.licenseNo,
        defaultBranchId: input.branchId,
      },
    }));

  await prisma.membershipBranch.upsert({
    where: {
      membershipId_branchId: { membershipId: membership.id, branchId: input.branchId },
    },
    update: {},
    create: { membershipId: membership.id, branchId: input.branchId },
  });
}
