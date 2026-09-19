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

  await seedMoreClients(prisma, tenant.id, dog.id, cat.id);
  await seedStaffAndResources(prisma, tenant.id, branch.id, passwordHash);
  await seedCatalogAndStock(prisma, tenant.id, branch.id, nune.id);
  await seedTaxProfile(prisma, tenant.id, branch.id);

  return { tenant, branch };
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
  return membership;
}

const MORE_FIRST = [
  "ชุติมา", "วรากร", "ปิยะ", "ศิริพร", "ธนพล", "อรุณี", "กิตติ", "สุนิสา", "ภาณุ", "ชนิดา",
  "ณัฐวุฒิ", "พัชรี", "สมชาย", "วรรณา", "อนุชา", "มณีรัตน์", "จักรพงษ์", "สายฝน", "วีระ", "นภา",
];
const MORE_PETS = [
  "ข้าวตอก", "นมเย็น", "ชาไทย", "โกโก้", "มะพร้าว", "ขนมครก", "ลอดช่อง", "ทองหยิบ", "บัวลอย", "ข้าวเหนียว",
  "มิกะ", "ฮารุ", "โมโม่", "ป๊อกกี้", "คุ๊กกี้", "มาร์ช", "พีช", "เมล่อน", "กีวี", "องุ่น",
];

async function seedMoreClients(
  prisma: PrismaClient,
  tenantId: string,
  dogId: string,
  catId: string,
) {
  const existing = await prisma.owner.count({ where: { tenantId } });
  const target = 80;
  if (existing >= target) return;
  const start = existing;
  for (let i = start; i < target; i++) {
    const digits = `09${(30000000 + i).toString()}`;
    const dup = await prisma.ownerPhone.findFirst({ where: { tenantId, digits } });
    if (dup) continue;
    const firstName = MORE_FIRST[i % MORE_FIRST.length]!;
    const owner = await prisma.owner.create({
      data: {
        tenantId,
        code: `O-M${(i + 1).toString().padStart(3, "0")}`,
        firstName,
        lastName: i % 4 === 0 ? "รักสัตว์" : null,
        searchKey: "",
        phones: { create: { tenantId, raw: digits, digits, isPrimary: true } },
      },
    });
    await prisma.pet.create({
      data: {
        tenantId,
        ownerId: owner.id,
        code: `P-M${(i + 1).toString().padStart(3, "0")}`,
        name: MORE_PETS[i % MORE_PETS.length]!,
        searchKey: "",
        speciesId: i % 2 === 0 ? dogId : catId,
      },
    });
  }
}

async function seedStaffAndResources(
  prisma: PrismaClient,
  tenantId: string,
  branchId: string,
  passwordHash: string,
) {
  const byKey = async (key: string) => {
    const role = await prisma.role.findFirst({ where: { tenantId: null, key } });
    if (!role) throw new Error(`ไม่พบบทบาท ${key}`);
    return role;
  };
  const pharmacy = await byKey("PHARMACY");
  const manager = await byKey("BRANCH_MANAGER");
  const groomer = await byKey("GROOMER");
  const tech = await byKey("VET_TECH");

  async function staff(email: string, name: string, roleId: string, title: string) {
    const user =
      (await prisma.user.findUnique({ where: { email } })) ??
      (await prisma.user.create({
        data: { email, passwordHash, displayName: name, status: "ACTIVE" },
      }));
    await upsertMembership(prisma, {
      tenantId,
      userId: user.id,
      roleId,
      branchId,
      jobTitle: title,
    });
    return user;
  }

  await staff("jo@demo.local", "โจ คลังยา", pharmacy.id, "คลัง/เภสัช");
  await staff("ann@demo.local", "แอน ผู้จัดการ", manager.id, "ผู้จัดการสาขา");
  await staff("bee@demo.local", "บี ช่างกรูม", groomer.id, "ช่างกรูมมิ่ง");
  await staff("nan@demo.local", "แนน ผู้ช่วย", tech.id, "ผู้ช่วยสัตวแพทย์");

  const resources: { type: "KENNEL" | "GROOMER" | "EXAM_ROOM"; code: string; name: string; color: string; size?: "SMALL" | "MEDIUM" | "LARGE" | "CAT_CONDO"; zone?: string }[] = [
    { type: "EXAM_ROOM", code: "RM-1", name: "ห้องตรวจ 1", color: "#14b8a6" },
    { type: "EXAM_ROOM", code: "RM-2", name: "ห้องตรวจ 2", color: "#f97316" },
    { type: "GROOMER", code: "GRM-BEE", name: "ช่างบี", color: "#ec4899" },
    { type: "KENNEL", code: "K-A1", name: "กรง A1", color: "#f59e0b", size: "SMALL", zone: "โซนสุนัข" },
    { type: "KENNEL", code: "K-A2", name: "กรง A2", color: "#f59e0b", size: "MEDIUM", zone: "โซนสุนัข" },
    { type: "KENNEL", code: "K-A3", name: "กรง A3", color: "#f59e0b", size: "LARGE", zone: "โซนสุนัข" },
    { type: "KENNEL", code: "K-B1", name: "คอนโดแมว B1", color: "#8b5cf6", size: "CAT_CONDO", zone: "โซนแมว" },
    { type: "KENNEL", code: "K-B2", name: "คอนโดแมว B2", color: "#8b5cf6", size: "CAT_CONDO", zone: "โซนแมว" },
    { type: "KENNEL", code: "K-ICU", name: "ห้องไอซียู", color: "#ef4444", size: "MEDIUM", zone: "ไอซียู" },
  ];

  for (let i = 0; i < resources.length; i++) {
    const r = resources[i]!;
    const existing = await prisma.resource.findFirst({
      where: { tenantId, branchId, code: r.code },
    });
    if (existing) continue;
    const created = await prisma.resource.create({
      data: {
        tenantId,
        branchId,
        type: r.type,
        code: r.code,
        name: r.name,
        colorHex: r.color,
        sortOrder: i,
      },
    });
    if (r.type === "KENNEL" && r.size) {
      await prisma.kennelProfile.create({
        data: {
          resourceId: created.id,
          tenantId,
          size: r.size,
          zone: r.zone,
          allowedSpeciesCodes: r.zone === "โซนแมว" ? ["FELINE"] : r.zone === "โซนสุนัข" ? ["CANINE"] : [],
        },
      });
    }
  }
}

async function seedCatalogAndStock(
  prisma: PrismaClient,
  tenantId: string,
  branchId: string,
  receivedById: string,
) {
  const services: {
    code: string;
    name: string;
    category: "CONSULT" | "LAB" | "IMAGING" | "VACCINE" | "GROOMING" | "BOARDING" | "PROCEDURE";
    priceSatang: number;
    duration?: number;
  }[] = [
    { code: "CONSULT-OPD", name: "ค่าตรวจร่างกาย", category: "CONSULT", priceSatang: 35000, duration: 20 },
    { code: "CONSULT-ER", name: "ค่าตรวจฉุกเฉิน", category: "CONSULT", priceSatang: 80000, duration: 30 },
    { code: "LAB-CBC", name: "CBC", category: "LAB", priceSatang: 65000 },
    { code: "IMG-XRAY", name: "เอกซเรย์ 1 ฟิล์ม", category: "IMAGING", priceSatang: 80000 },
    { code: "VAX-RABIES", name: "วัคซีนพิษสุนัขบ้า", category: "VACCINE", priceSatang: 45000 },
    { code: "GROOM-BATH", name: "อาบน้ำตัดขน", category: "GROOMING", priceSatang: 45000, duration: 90 },
    { code: "GROOM-NAIL", name: "ตัดเล็บ", category: "GROOMING", priceSatang: 15000, duration: 15 },
    { code: "BOARD-NIGHT", name: "ค่าห้องฝากเลี้ยง / คืน", category: "BOARDING", priceSatang: 50000 },
    { code: "PROC-NAIL", name: "ตัดเล็บ (ห้องตรวจ)", category: "PROCEDURE", priceSatang: 15000 },
  ];

  for (const s of services) {
    const found = await prisma.serviceItem.findFirst({ where: { tenantId, code: s.code } });
    if (found) continue;
    await prisma.serviceItem.create({
      data: {
        tenantId,
        code: s.code,
        name: s.name,
        category: s.category,
        priceSatang: s.priceSatang,
        taxCode: "VAT7",
        durationMinutes: s.duration ?? null,
        isBookableOnline: s.category === "GROOMING" || s.category === "CONSULT",
        sortOrder: services.indexOf(s),
      },
    });
  }

  const board = await prisma.serviceItem.findFirst({ where: { tenantId, code: "BOARD-NIGHT" } });
  if (board) {
    const kennels = await prisma.resource.findMany({
      where: { tenantId, branchId, type: "KENNEL" },
      include: { kennelProfile: true },
    });
    for (const k of kennels) {
      if (k.kennelProfile && !k.kennelProfile.dailyRateServiceId) {
        await prisma.kennelProfile.update({
          where: { resourceId: k.id },
          data: { dailyRateServiceId: board.id },
        });
      }
    }
  }

  const products: {
    code: string;
    name: string;
    genericName?: string;
    type: "DRUG" | "FOOD" | "RETAIL" | "VACCINE";
    strength?: string;
    baseUnit: string;
    price: number;
    rx?: boolean;
  }[] = [
    { code: "AMX250", name: "Amoxicillin 250 mg", genericName: "amoxicillin", type: "DRUG", strength: "250 mg", baseUnit: "เม็ด", price: 1200, rx: true },
    { code: "PRED5", name: "Prednisolone 5 mg", genericName: "prednisolone", type: "DRUG", strength: "5 mg", baseUnit: "เม็ด", price: 800, rx: true },
    { code: "FOOD3KG", name: "อาหารเม็ด 3 กก.", type: "FOOD", baseUnit: "ถุง", price: 89000 },
    { code: "FLEA-SPOT", name: "ยาหยดเห็บหมัด", type: "RETAIL", baseUnit: "หลอด", price: 38000 },
    { code: "TOY-BALL", name: "ลูกบอลยาง", type: "RETAIL", baseUnit: "ชิ้น", price: 8900 },
    { code: "VAX-RAB", name: "วัคซีนพิษสุนัขบ้า (ขวด)", genericName: "rabies vaccine", type: "VACCINE", baseUnit: "โดส", price: 25000, rx: true },
  ];

  for (const p of products) {
    const found = await prisma.product.findFirst({ where: { tenantId, code: p.code } });
    if (found) continue;
    await prisma.product.create({
      data: {
        tenantId,
        code: p.code,
        name: p.name,
        genericName: p.genericName ?? null,
        searchKey: `${p.name}${p.genericName ?? ""}${p.code}`.toLowerCase().replace(/[\s\-.]/g, ""),
        type: p.type,
        strength: p.strength ?? null,
        baseUnit: p.baseUnit,
        defaultPriceSatang: p.price,
        taxCode: "VAT7",
        requiresPrescription: p.rx ?? false,
        isControlled: p.code === "PRED5",
        controlledClass: p.code === "PRED5" ? "วัตถุออกฤทธิ์ประเภท 2" : null,
      },
    });
  }

  const pred = await prisma.product.findFirst({ where: { tenantId, code: "PRED5" } });
  if (pred && !pred.isControlled) {
    await prisma.product.update({
      where: { id: pred.id },
      data: { isControlled: true, controlledClass: "วัตถุออกฤทธิ์ประเภท 2" },
    });
  }

  const amox = await prisma.product.findFirst({ where: { tenantId, code: "AMX250" } });
  const food = await prisma.product.findFirst({ where: { tenantId, code: "FOOD3KG" } });
  const flea = await prisma.product.findFirst({ where: { tenantId, code: "FLEA-SPOT" } });
  const toy = await prisma.product.findFirst({ where: { tenantId, code: "TOY-BALL" } });
  if (amox) {
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: amox.id,
      lotNo: "AMX-2301",
      expiryDate: new Date("2026-10-01"),
      qty: 20,
      cost: 400,
      receivedById,
    });
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: amox.id,
      lotNo: "AMX-2401",
      expiryDate: new Date("2027-03-01"),
      qty: 100,
      cost: 450,
      receivedById,
    });
  }
  if (food) {
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: food.id,
      lotNo: "FD-01",
      expiryDate: new Date("2027-01-15"),
      qty: 30,
      cost: 52000,
      receivedById,
    });
  }
  if (pred) {
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: pred.id,
      lotNo: "PRED-2401",
      expiryDate: new Date("2027-06-01"),
      qty: 50,
      cost: 300,
      receivedById,
    });
  }
  if (flea) {
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: flea.id,
      lotNo: "FLEA-2401",
      expiryDate: new Date("2027-12-01"),
      qty: 12,
      cost: 18000,
      receivedById,
    });
  }
  if (toy) {
    await ensureLotWithQty(prisma, {
      tenantId,
      branchId,
      productId: toy.id,
      lotNo: "TOY-2401",
      expiryDate: new Date("2028-01-01"),
      qty: 20,
      cost: 4000,
      receivedById,
    });
  }

  const supplier =
    (await prisma.supplier.findFirst({ where: { tenantId, code: "WALKIN" } })) ??
    (await prisma.supplier.create({ data: { tenantId, code: "WALKIN", name: "รับเข้าทั่วไป" } }));
  void supplier;
}

async function ensureLotWithQty(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    branchId: string;
    productId: string;
    lotNo: string;
    expiryDate: Date;
    qty: number;
    cost: number;
    receivedById: string;
  },
) {
  const existing = await prisma.stockLot.findFirst({
    where: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      lotNo: input.lotNo,
    },
  });
  if (existing) {
    const onHand = await prisma.stockOnHand.findUnique({
      where: {
        tenantId_branchId_productId_lotId: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          productId: input.productId,
          lotId: existing.id,
        },
      },
    });
    if (onHand) return;
  }
  const lot =
    existing ??
    (await prisma.stockLot.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: input.productId,
        lotNo: input.lotNo,
        expiryDate: input.expiryDate,
        unitCostSatang: input.cost,
      },
    }));
  await prisma.stockMovement.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      lotId: lot.id,
      type: "RECEIPT",
      qtyBase: input.qty,
      unitCostSatang: input.cost,
      refType: "SEED",
      performedById: input.receivedById,
    },
  });
}

async function seedTaxProfile(prisma: PrismaClient, tenantId: string, branchId: string) {
  const found = await prisma.taxProfile.findUnique({ where: { branchId } });
  if (found) return;
  await prisma.taxProfile.create({
    data: {
      tenantId,
      branchId,
      isVatRegistered: true,
      vatRatePercent: 7,
      taxId: "0105569000000",
      taxBranchCode: "00000",
      sellerName: "คลินิกตัวอย่าง รักสัตว์ จำกัด",
      sellerAddress: "123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
      pricesIncludeVat: true,
      invoicePrefix: "INV",
      receiptFooterTh: "ขอบคุณที่ไว้วางใจให้เราดูแลสมาชิกในครอบครัวของคุณ",
    },
  });
}
