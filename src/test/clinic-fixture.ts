import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createAppContext, SYSTEM_ACTOR, type AppContext } from "@/server/context";

export async function seedMiniClinic(db: PrismaClient) {
  const tenantId = randomUUID();
  const branchId = randomUUID();
  const actorId = randomUUID();
  await db.tenant.create({
    data: { id: tenantId, slug: `t-${tenantId.slice(0, 8)}`, legalName: "ท", displayName: "ท" },
  });
  await db.branch.create({ data: { id: branchId, tenantId, code: "BKK", name: "สาขาหลัก" } });
  await db.taxProfile.create({
    data: {
      tenantId,
      branchId,
      isVatRegistered: true,
      sellerName: "คลินิกทดสอบ",
      sellerAddress: "กรุงเทพฯ",
      taxId: "0105555000000",
      pricesIncludeVat: true,
    },
  });
  const species = await db.species.create({
    data: { tenantId: null, code: `DOG-${tenantId.slice(0, 4)}`, nameTh: "สุนัข", nameEn: "Dog" },
  });
  const owner = await db.owner.create({
    data: { tenantId, code: "O-1", firstName: "แพร", searchKey: "" },
  });
  const pet = await db.pet.create({
    data: {
      tenantId,
      ownerId: owner.id,
      code: "P-1",
      name: "โบ้",
      searchKey: "",
      speciesId: species.id,
    },
  });
  const consult = await db.serviceItem.create({
    data: {
      tenantId,
      code: "CONSULT-OPD",
      name: "ค่าตรวจร่างกาย",
      category: "CONSULT",
      priceSatang: 35000,
      taxCode: "VAT7",
    },
  });
  const board = await db.serviceItem.create({
    data: {
      tenantId,
      code: "BOARD-NIGHT",
      name: "ค่าห้อง",
      category: "BOARDING",
      priceSatang: 50000,
      taxCode: "VAT7",
    },
  });
  const product = await db.product.create({
    data: {
      tenantId,
      code: "AMX250",
      name: "Amoxicillin 250 mg",
      genericName: "amoxicillin",
      searchKey: "amoxicillin250mg",
      type: "DRUG",
      strength: "250 mg",
      baseUnit: "เม็ด",
      defaultPriceSatang: 1200,
      requiresPrescription: true,
      taxCode: "VAT7",
    },
  });

  const ctx: AppContext = createAppContext({
    db,
    tenantId,
    branchId,
    actor: { ...SYSTEM_ACTOR, membershipId: actorId, userId: actorId },
  });

  return { tenantId, branchId, actorId, owner, pet, consult, board, product, species, ctx };
}

export async function addLot(
  db: PrismaClient,
  input: { tenantId: string; branchId: string; productId: string; lotNo: string; expiry: string; qty: number; actorId: string },
) {
  const lot = await db.stockLot.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      lotNo: input.lotNo,
      expiryDate: new Date(input.expiry),
      unitCostSatang: 400,
    },
  });
  await db.stockMovement.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      productId: input.productId,
      lotId: lot.id,
      type: "RECEIPT",
      qtyBase: input.qty,
      performedById: input.actorId,
    },
  });
  return lot;
}
