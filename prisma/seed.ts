import { PrismaClient } from "@prisma/client";
import {
  PERMISSIONS,
  SYSTEM_ROLE_NAMES,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from "../src/modules/identity/permissions";
import { seedDemoClinic } from "./seed-demo";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL },
  },
});

const SPECIES: { code: string; nameTh: string; nameEn: string; breeds: { nameTh: string; nameEn: string }[] }[] = [
  {
    code: "CANINE",
    nameTh: "สุนัข",
    nameEn: "Dog",
    breeds: [
      { nameTh: "ผสม", nameEn: "Mixed" },
      { nameTh: "ชิวาวา", nameEn: "Chihuahua" },
      { nameTh: "โกลเด้นรีทรีฟเวอร์", nameEn: "Golden Retriever" },
      { nameTh: "ชิสุ", nameEn: "Shih Tzu" },
      { nameTh: "ปอมเมอเรเนียน", nameEn: "Pomeranian" },
    ],
  },
  {
    code: "FELINE",
    nameTh: "แมว",
    nameEn: "Cat",
    breeds: [
      { nameTh: "ผสม", nameEn: "Mixed" },
      { nameTh: "เปอร์เซีย", nameEn: "Persian" },
      { nameTh: "สก็อตติชโฟลด์", nameEn: "Scottish Fold" },
      { nameTh: "อเมริกันช็อตแฮร์", nameEn: "American Shorthair" },
    ],
  },
  {
    code: "LAGOMORPH",
    nameTh: "กระต่าย",
    nameEn: "Rabbit",
    breeds: [{ nameTh: "ผสม", nameEn: "Mixed" }],
  },
];

async function main() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { group: p.group, description: p.description },
      create: { key: p.key, group: p.group, description: p.description },
    });
  }

  for (const key of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { tenantId: null, key },
    });
    const role =
      existing ??
      (await prisma.role.create({
        data: {
          tenantId: null,
          key,
          name: SYSTEM_ROLE_NAMES[key],
          isSystem: true,
        },
      }));

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const keys = SYSTEM_ROLE_PERMISSIONS[key];
    if (keys.length > 0) {
      await prisma.rolePermission.createMany({
        data: keys.map((permissionKey) => ({ roleId: role.id, permissionKey })),
      });
    }
  }

  for (const s of SPECIES) {
    const species =
      (await prisma.species.findFirst({ where: { tenantId: null, code: s.code } })) ??
      (await prisma.species.create({
        data: {
          tenantId: null,
          code: s.code,
          nameTh: s.nameTh,
          nameEn: s.nameEn,
        },
      }));

    for (const b of s.breeds) {
      const found = await prisma.breed.findFirst({
        where: { speciesId: species.id, nameTh: b.nameTh, tenantId: null },
      });
      if (!found) {
        await prisma.breed.create({
          data: {
            tenantId: null,
            speciesId: species.id,
            nameTh: b.nameTh,
            nameEn: b.nameEn,
          },
        });
      }
    }
  }

  await seedDemoClinic(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
