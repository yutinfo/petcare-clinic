import { BusinessError, digitsOnly, generateCode } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export type CreateOwnerPetInput = {
  ownerFirstName: string;
  ownerLastName?: string;
  phone: string;
  petName: string;
  speciesId: string;
};

export async function createOwnerAndPet(ctx: AppContext, input: CreateOwnerPetInput) {
  ctx.can("patient:write");
  const firstName = input.ownerFirstName.trim();
  const petName = input.petName.trim();
  const phone = digitsOnly(input.phone);
  if (!firstName) throw new BusinessError("กรอกชื่อเจ้าของ");
  if (!petName) throw new BusinessError("กรอกชื่อสัตว์");
  if (phone.length < 9) throw new BusinessError("เบอร์โทรไม่ถูกต้อง");
  if (!ctx.tenantId) throw new BusinessError("ไม่พบคลินิก");

  return ctx.tx(async (tx) => {
    const species = await tx.species.findFirst({
      where: { id: input.speciesId, OR: [{ tenantId: ctx.tenantId }, { tenantId: null }] },
    });
    if (!species) throw new BusinessError("ไม่พบชนิดสัตว์");

    const duplicate = await tx.ownerPhone.findFirst({
      where: { tenantId: ctx.tenantId, digits: phone },
    });
    if (duplicate) {
      throw new BusinessError("เบอร์โทรนี้มีในระบบแล้ว — ค้นจากช่องค้นหาด้านบน");
    }

    const owner = await tx.owner.create({
      data: {
        tenantId: ctx.tenantId,
        code: generateCode("O"),
        firstName,
        lastName: input.ownerLastName?.trim() || null,
        searchKey: "",
      },
    });

    await tx.ownerPhone.create({
      data: {
        tenantId: ctx.tenantId,
        ownerId: owner.id,
        raw: input.phone.trim(),
        digits: phone,
        isPrimary: true,
      },
    });

    const pet = await tx.pet.create({
      data: {
        tenantId: ctx.tenantId,
        ownerId: owner.id,
        code: generateCode("P"),
        name: petName,
        searchKey: "",
        speciesId: species.id,
      },
    });

    ctx.emit("owner.created", { ownerId: owner.id, petId: pet.id });

    return {
      owner: {
        id: owner.id,
        code: owner.code,
        displayName: [owner.firstName, owner.lastName].filter(Boolean).join(" "),
        phone,
      },
      pet: {
        id: pet.id,
        code: pet.code,
        name: pet.name,
        speciesNameTh: species.nameTh,
        currentWeightKg: null as string | null,
        alerts: [] as { type: string; severity: string; label: string }[],
      },
    };
  });
}

export type SpeciesOption = { id: string; nameTh: string };

export async function listSpecies(ctx: AppContext): Promise<SpeciesOption[]> {
  ctx.can("patient:read");
  return ctx.tx(async (tx) => {
    const rows = await tx.species.findMany({
      where: {
        isActive: true,
        OR: [{ tenantId: ctx.tenantId }, { tenantId: null }],
      },
      orderBy: { nameTh: "asc" },
    });
    return rows.map((s) => ({ id: s.id, nameTh: s.nameTh }));
  });
}


