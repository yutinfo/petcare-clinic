import { digitsOnly, thNormalize } from "@/modules/shared";
import type { AppContext } from "@/server/context";

export type PetAlertView = {
  type: string;
  severity: string;
  label: string;
};

export type PetSearchHit = {
  id: string;
  code: string;
  name: string;
  speciesNameTh: string | null;
  currentWeightKg: string | null;
  alerts: PetAlertView[];
};

export type OwnerSearchHit = {
  id: string;
  code: string;
  displayName: string;
  phone: string | null;
  pets: PetSearchHit[];
};

type SearchRow = {
  owner_id: string;
  owner_code: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  pet_id: string | null;
  pet_code: string | null;
  pet_name: string | null;
  species_name: string | null;
  weight_kg: string | null;
  alert_type: string | null;
  alert_severity: string | null;
  alert_label: string | null;
};

export async function searchClients(ctx: AppContext, query: string): Promise<OwnerSearchHit[]> {
  ctx.can("patient:read");
  const raw = query.trim();
  if (raw.length < 2) return [];

  const norm = thNormalize(raw);
  const digits = digitsOnly(raw);

  return ctx.tx(async (tx) => {
    const rows = await tx.$queryRaw<SearchRow[]>`
      SELECT
        o.id AS owner_id,
        o.code AS owner_code,
        o.first_name,
        o.last_name,
        ph.digits AS phone,
        pet.id AS pet_id,
        pet.code AS pet_code,
        pet.name AS pet_name,
        sp.name_th AS species_name,
        pet.current_weight_kg::text AS weight_kg,
        al.type AS alert_type,
        al.severity AS alert_severity,
        al.label AS alert_label
      FROM "Owner" o
      LEFT JOIN "OwnerPhone" ph
        ON ph.owner_id = o.id AND ph.is_primary = true
      LEFT JOIN "Pet" pet
        ON pet.owner_id = o.id AND pet.deleted_at IS NULL
      LEFT JOIN "Species" sp ON sp.id = pet.species_id
      LEFT JOIN "PetAlert" al ON al.pet_id = pet.id
      WHERE o.deleted_at IS NULL
        AND (
          (${norm} <> '' AND (
            o.search_key LIKE '%' || ${norm} || '%'
            OR pet.search_key LIKE '%' || ${norm} || '%'
          ))
          OR (${digits} <> '' AND EXISTS (
            SELECT 1 FROM "OwnerPhone" x
            WHERE x.owner_id = o.id
              AND x.digits LIKE '%' || ${digits} || '%'
          ))
          OR o.code ILIKE '%' || ${raw} || '%'
          OR pet.code ILIKE '%' || ${raw} || '%'
          OR pet.microchip_no ILIKE '%' || ${raw} || '%'
        )
      ORDER BY o.first_name, pet.name
      LIMIT 80`;

    return groupOwnerHits(rows);
  });
}

function groupOwnerHits(rows: SearchRow[]): OwnerSearchHit[] {
  const owners = new Map<string, OwnerSearchHit>();
  for (const row of rows) {
    let owner = owners.get(row.owner_id);
    if (!owner) {
      owner = {
        id: row.owner_id,
        code: row.owner_code,
        displayName: [row.first_name, row.last_name].filter(Boolean).join(" "),
        phone: row.phone,
        pets: [],
      };
      owners.set(row.owner_id, owner);
    }
    if (!row.pet_id || !row.pet_code || !row.pet_name) continue;
    let pet = owner.pets.find((p) => p.id === row.pet_id);
    if (!pet) {
      pet = {
        id: row.pet_id,
        code: row.pet_code,
        name: row.pet_name,
        speciesNameTh: row.species_name,
        currentWeightKg: row.weight_kg,
        alerts: [],
      };
      owner.pets.push(pet);
    }
    if (row.alert_label && row.alert_type && row.alert_severity) {
      if (!pet.alerts.some((a) => a.label === row.alert_label && a.type === row.alert_type)) {
        pet.alerts.push({
          type: row.alert_type,
          severity: row.alert_severity,
          label: row.alert_label,
        });
      }
    }
  }
  return [...owners.values()];
}
