import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ENCOUNTER_STATUS, ENCOUNTER_TYPE, PET_SEX, labelOf } from "@/components/staff/labels";
import { AlertChip, PageHeader, StatusBadge } from "@/components/staff/ui";
import { getPetProfile } from "@/modules/crm";
import { BusinessError, UnauthenticatedError } from "@/modules/shared";
import { formatThaiDate, formatThaiDateTime } from "@/modules/shared/date";
import { getStaffContext } from "@/server/staff-context";

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ branch: string; petId: string }>;
}) {
  const { branch, petId } = await params;
  try {
    const ctx = await getStaffContext(branch);
    const pet = await getPetProfile(ctx, petId);
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow={pet.code}
          title={pet.name}
          description={`${pet.speciesNameTh}${pet.breedNameTh ? ` · ${pet.breedNameTh}` : ""} · ${labelOf(PET_SEX, pet.sex)}${pet.isNeutered ? " · ทำหมันแล้ว" : ""}`}
        >
          <Link
            href={`/${branch}/reception?q=${encodeURIComponent(pet.name)}`}
            className="inline-flex h-11 items-center rounded-full bg-coral px-5 text-sm font-medium text-white"
          >
            เปิดเคส
          </Link>
        </PageHeader>

        <AlertChip labels={pet.alerts.map((a) => a.label)} />

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="clinic-card p-5">
            <p className="text-xs text-stone-400">เจ้าของ</p>
            <Link href={`/${branch}/clients/${pet.owner.id}`} className="text-lg font-semibold hover:underline">
              {pet.owner.name}
            </Link>
            <p className="text-sm text-stone-500">{pet.owner.phone ?? "ไม่มีเบอร์"}</p>
            <p className="mt-4 text-xs text-stone-400">น้ำหนักล่าสุด</p>
            <p className="text-2xl font-semibold">{pet.currentWeightKg ?? "—"} กก.</p>
          </section>
          <section className="clinic-card p-5 lg:col-span-2">
            <h2 className="font-semibold">ประวัติน้ำหนัก</h2>
            {pet.weights.length === 0 ? (
              <p className="mt-2 text-sm text-stone-400">ยังไม่มีบันทึก</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                {pet.weights.map((w) => (
                  <li key={w.measuredAt} className="flex justify-between rounded-xl bg-cream px-3 py-2">
                    <span>{formatThaiDate(new Date(w.measuredAt))}</span>
                    <span className="font-medium">{w.weightKg} กก.</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="clinic-card p-5">
          <h2 className="font-semibold">วัคซีน</h2>
          {pet.vaccinations.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">ยังไม่มีบันทึกวัคซีน</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {pet.vaccinations.map((v) => (
                <li key={v.id} className="flex flex-wrap justify-between gap-2">
                  <span>{v.name}</span>
                  <span className="text-stone-500">
                    {formatThaiDate(new Date(v.administeredAt))}
                    {v.nextDueAt ? ` · นัดถัดไป ${formatThaiDate(new Date(v.nextDueAt))}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="clinic-card p-5">
          <h2 className="font-semibold">เคสย้อนหลัง</h2>
          {pet.encounters.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">ยังไม่เคยมาตรวจ</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pet.encounters.map((e) => (
                <li key={e.id}>
                  <Link href={`/${branch}/encounters/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-cream">
                    <span>
                      <span className="font-medium">{e.number}</span>
                      <span className="ml-2 text-sm text-stone-500">{e.chiefComplaint ?? "—"}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge value={e.type} map={ENCOUNTER_TYPE} />
                      <StatusBadge value={e.status} map={ENCOUNTER_STATUS} />
                      <span className="text-xs text-stone-400">{formatThaiDateTime(new Date(e.arrivedAt))}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (err) {
    if (err instanceof UnauthenticatedError) redirect("/login");
    if (err instanceof BusinessError) notFound();
    throw err;
  }
}
